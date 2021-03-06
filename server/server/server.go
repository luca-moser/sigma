package server

import (
	"context"
	"fmt"
	"github.com/dpapathanasiou/go-recaptcha"
	"github.com/facebookgo/inject"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"github.com/luca-moser/sigma/server/misc"
	"github.com/luca-moser/sigma/server/models"
	"github.com/luca-moser/sigma/server/routers"
	"github.com/luca-moser/sigma/server/server/config"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readconcern"
	"go.mongodb.org/mongo-driver/mongo/writeconcern"
	"html/template"
	"io"
	"os"
	"time"
)

type TemplateRendered struct {
	templates *template.Template
}

func (t *TemplateRendered) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.templates.ExecuteTemplate(w, name, data)
}

type Server struct {
	Config    *config.Configuration
	WebEngine *echo.Echo
}

func (server *Server) Start() {
	start := time.Now().UnixNano()

	// load config
	conf, err := config.LoadConfig()
	if err != nil {
		panic(err)
	}
	server.Config = conf
	httpConfig := server.Config.HTTP

	// init logger
	misc.Debug = conf.Verbose
	logger, err := misc.GetLogger("app")
	if err != nil {
		panic(err)
	}
	logger.Info("booting up app...")

	// init web server
	e := echo.New()
	e.HideBanner = true
	server.WebEngine = e
	if httpConfig.LogRequests {
		requestLogFile, err := os.Create(fmt.Sprintf("./logs/requests.log"))
		if err != nil {
			panic(err)
		}
		e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{Output: requestLogFile}))
		e.Logger.SetLevel(3)
	}

	// load html files
	e.Renderer = &TemplateRendered{
		templates: template.Must(template.ParseGlob(fmt.Sprintf("%s/*.html", httpConfig.Assets.HTML))),
	}

	// asset paths
	e.Static("/assets", httpConfig.Assets.Static)
	e.File("/favicon.ico", httpConfig.Assets.Favicon)

	// create ctrls
	appCtrl := &controllers.AppCtrl{}
	accCtrl := &controllers.AccCtrl{}
	userCtrl := &controllers.UserCtrl{}
	ctrls := []controllers.Controller{appCtrl, accCtrl, userCtrl}

	// create routers
	indexRouter := &routers.IndexRouter{}
	accRouter := &routers.SendStreamRouter{}
	addrsRouter := &routers.AddressStreamRouter{}
	balanceRouter := &routers.BalanceStreamRouter{}
	historyRouter := &routers.HistoryStreamRouter{}
	userRouter := &routers.UserRouter{}
	rters := []routers.Router{indexRouter, accRouter, userRouter, addrsRouter, balanceRouter, historyRouter}

	// init mongo db conn
	mongoClient, err := mongo.NewClient([]*options.ClientOptions{
		{
			// TODO: move to config
			WriteConcern: writeconcern.New(writeconcern.J(true), writeconcern.WMajority(), writeconcern.WTimeout(5*time.Second)),
			ReadConcern:  readconcern.Majority(),
		},
		options.Client().ApplyURI(server.Config.Mongo.URI),
	}...)
	mongoConnCtx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	if err := mongoClient.Connect(mongoConnCtx); err != nil {
		panic(err)
	}
	if err := mongoClient.Ping(mongoConnCtx, nil); err != nil {
		panic(err)
	}

	// load mail templates
	mailTemplates := template.Must(template.New("mails.html").ParseGlob("./mails.html"))

	// jwt
	authJWTConf := middleware.JWTConfig{
		Claims:     &models.UserJWTClaims{},
		SigningKey: []byte(conf.JWT.PrivateKey),
	}

	// recaptcha
	recaptcha.Init(conf.ReCaptcha.PrivateKey)

	// create injection graph for automatic dependency injection
	g := inject.Graph{}

	// add various objects to the graph
	if err = g.Provide(
		&inject.Object{Value: e},
		&inject.Object{Value: mongoClient},
		&inject.Object{Value: conf},
		&inject.Object{Value: conf.Dev, Name: "dev"},
		&inject.Object{Value: conf.ReCaptcha.PublicKey, Name: "recaptcha_public_key"},
		&inject.Object{Value: conf.ReCaptcha.PrivateKey, Name: "recaptcha_private_key"},
		&inject.Object{Value: authJWTConf, Name: "jwt_config_user"},
		&inject.Object{Value: mailTemplates, Name: "mail_templates"},
	); err != nil {
		panic(err)
	}

	// add controllers to graph
	for _, controller := range ctrls {
		if err = g.Provide(&inject.Object{Value: controller}); err != nil {
			panic(err)
		}
	}

	// add routers to graph
	for _, router := range rters {
		if err = g.Provide(&inject.Object{Value: router}); err != nil {
			panic(err)
		}
	}

	// run dependency injection
	if err = g.Populate(); err != nil {
		panic(err)
	}

	// init ctrls
	for _, controller := range ctrls {
		if err = controller.Init(); err != nil {
			panic(err)
		}
	}
	logger.Info("initialised controllers")

	// init routers
	for _, router := range rters {
		router.Init()
	}
	logger.Info("initialised routers")

	// boot up server
	go e.Start(httpConfig.Address)

	// finish
	delta := (time.Now().UnixNano() - start) / 1000000
	logger.Info("app ready", "startup", delta)
}

func (server *Server) Shutdown(timeout time.Duration) {
	select {
	case <-time.After(timeout):
	}
}
