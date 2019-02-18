package server

import (
	"context"
	"fmt"
	"github.com/facebookgo/inject"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"github.com/luca-moser/sigma/server/models"
	"github.com/luca-moser/sigma/server/routers"
	"github.com/luca-moser/sigma/server/server/config"
	"github.com/luca-moser/sigma/server/misc"
	"github.com/mongodb/mongo-go-driver/mongo"
	"github.com/mongodb/mongo-go-driver/mongo/options"
	"github.com/mongodb/mongo-go-driver/mongo/readconcern"
	"github.com/mongodb/mongo-go-driver/mongo/writeconcern"
	"gopkg.in/mgo.v2"
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
	Mongo     *mgo.Session
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
	userRouter := &routers.UserRouter{}
	rters := []routers.Router{indexRouter, accRouter, userRouter}

	// init mongo db conn
	mongoClient, err := mongo.NewClientWithOptions(server.Config.Mongo.URI, []*options.ClientOptions{
		{
			// TODO: move to config
			WriteConcern: writeconcern.New(writeconcern.J(true), writeconcern.WMajority(), writeconcern.WTimeout(5*time.Second)),
			ReadConcern:  readconcern.Majority(),
		},
	}...)
	mongoConnCtx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	if err := mongoClient.Connect(mongoConnCtx); err != nil {
		panic(err)
	}
	if err := mongoClient.Ping(mongoConnCtx, nil); err != nil {
		panic(err)
	}

	// jwt
	authJWTConf := middleware.JWTConfig{
		Claims:     &models.UserJWTClaims{},
		SigningKey: []byte(conf.JWT.PrivateKey),
	}

	// create injection graph for automatic dependency injection
	g := inject.Graph{}

	// add various objects to the graph
	if err = g.Provide(
		&inject.Object{Value: e},
		&inject.Object{Value: mongoClient},
		&inject.Object{Value: conf},
		&inject.Object{Value: conf.Dev, Name: "dev"},
		&inject.Object{Value: authJWTConf, Name: "jwt_config_user"},
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
