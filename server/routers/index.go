package routers

import (
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo"
	"github.com/luca-moser/sigma/server/controllers"
	"github.com/pkg/errors"
	"go.mongodb.org/mongo-driver/mongo"
	"io/ioutil"
	"net/http"
)

var ErrBadRequest = errors.New("bad request")
var ErrUnauthorized = errors.New("unauthorized")
var ErrInternalServer = errors.New("internal server error")
var ErrForbidden = errors.New("access forbidden")
var ErrInvalidJWTToken = errors.New("invalid jwt token")

type SimpleMsg struct {
	Msg string `json:"msg"`
}

type SimpleCountMsg struct {
	Count int `json:"count"`
}

type wsjwt struct {
	Token string `json:"token"`
}

type wsauthmsg struct {
	Auth bool `json:"auth"`
}

func authWS(ws *websocket.Conn, signingKey interface{}) (string, error) {
	wsJWT := &wsjwt{}
	if err := ws.ReadJSON(wsJWT); err != nil {
		return "", err
	}

	jwtToken, err := jwt.Parse(wsJWT.Token, func(t *jwt.Token) (i interface{}, e error) {
		return signingKey, nil
	})

	if err != nil {
		return "", err
	}

	if !jwtToken.Valid {
		if err := ws.WriteJSON(wsauthmsg{true}); err != nil {
			return "", err
		}
		ws.Close()
		return "", nil
	}

	if err := ws.WriteJSON(wsauthmsg{true}); err != nil {
		ws.Close()
		return "", err
	}

	return jwtToken.Claims.(jwt.MapClaims)["user_id"].(string), nil
}

type Router interface {
	Init()
}

type IndexRouter struct {
	R                  *echo.Echo `inject:""`
	Dev                bool       `inject:"dev"`
	ReCaptchaPublicKey string     `inject:"recaptcha_public_key"`
}

func (indexRouter *IndexRouter) Init() {

	indexRouter.R.GET("/", indexRouter.indexRoute)
	indexRouter.R.GET("*", indexRouter.indexRoute)

	indexRouter.R.HTTPErrorHandler = func(err error, c echo.Context) {
		c.Logger().Error(err)

		var statusCode int
		var message string

		switch errors.Cause(err) {

		// executed when the route was not found
		// also used to auto. reroute to the SPA page
		case echo.ErrNotFound:
			c.Redirect(http.StatusSeeOther, "/")
			return

			// 401 unauthorized
		case echo.ErrUnauthorized:
			statusCode = http.StatusUnauthorized
			message = "unauthorized"

			// 403 forbidden
		case ErrForbidden:
			statusCode = http.StatusForbidden
			message = "access forbidden"

		// 500 internal server error
		case controllers.ErrInternalError:
			fallthrough
		case ErrInternalServer:
			statusCode = http.StatusInternalServerError
			message = "internal server error"

		// 404 not found
		case controllers.ErrUserNotFound:
			fallthrough
		case mongo.ErrNoDocuments:
			statusCode = http.StatusNotFound
			message = "not found"

		// 400 bad request
		case controllers.ErrInvalidID:
			fallthrough
		case controllers.ErrInvalidQuery:
			fallthrough
		case controllers.ErrInvalidModel:
			fallthrough
		case controllers.ErrInvalidModelUpdate:
			fallthrough
		case controllers.ErrInvalidModelDeletion:
			fallthrough
		case controllers.ErrAlreadyConfirmed:
			fallthrough
		case controllers.ErrInvalidConfirmationCode:
			fallthrough
		case controllers.ErrUsernameTaken:
			fallthrough
		case controllers.ErrWrongPassword:
			fallthrough
		case controllers.ErrEmailTaken:
			fallthrough
		case ErrBadRequest:
			statusCode = http.StatusBadRequest
			message = "bad request"

			// 500 internal server error
		default:
			statusCode = http.StatusInternalServerError
			message = "internal server error"
		}

		message = fmt.Sprintf("%s, error: %+v", message, err)
		c.String(statusCode, message)
	}
}

func (indexRouter *IndexRouter) indexRoute(c echo.Context) error {
	if indexRouter.Dev {
		htmlData, err := ioutil.ReadFile("../../client/html/index.html")
		if err != nil {
			return err
		}
		return c.HTML(http.StatusOK, string(htmlData))
	}
	return c.Render(http.StatusOK, "index.html", struct{ Key string }{indexRouter.ReCaptchaPublicKey})
}
