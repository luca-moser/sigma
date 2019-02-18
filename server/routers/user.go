package routers

import (
	"github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"github.com/luca-moser/sigma/server/models"
	"github.com/luca-moser/sigma/server/server/config"
	"net/http"

	"time"

	"github.com/dpapathanasiou/go-recaptcha"
	"github.com/labstack/echo"
)

type UserRouter struct {
	R         *echo.Echo            `inject:""`
	UC        *controllers.UserCtrl `inject:""`
	Dev       bool                  `inject:"dev"`
	Config    *config.Configuration `inject:""`
	JWTConfig middleware.JWTConfig  `inject:"jwt_config_user"`
}

type logincredentials struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	ReCAPTCHA string `json:"recaptcha"`
}

type newuserdata struct {
	Username  string `json:"username"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	ReCAPTCHA string `json:"recaptcha"`
}

type passwordchangereq struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type resetpasswordreq struct {
	Email string `json:"email"`
}

func (ur *UserRouter) Init() {

	jwtConf := ur.Config.JWT

	// authenticate the user
	ur.R.POST("/user/login", func(c echo.Context) error {

		// check whether user already has a JWT
		maybeJWT := c.Get("user")
		if maybeJWT != nil {
			if user, ok := maybeJWT.(*jwt.Token); ok {
				claims := user.Claims.(*models.UserJWTClaims)
				if claims.Auth {
					return c.JSON(http.StatusOK, SimpleMsg{"already authenticated"})
				}
			}
		}

		// read login
		login := &logincredentials{}
		if err := c.Bind(login); err != nil {
			return err
		}

		if !ur.Dev {
			// confirm reCAPTCHA
			valid, err := recaptcha.Confirm(c.Request().RemoteAddr, login.ReCAPTCHA)
			if err != nil || !valid {
				return echo.NewHTTPError(http.StatusBadRequest)
			}
		}

		user, err := ur.UC.GetUserByEmail(login.Email)
		if err != nil {
			return err
		}

		// check whether deactivated
		if user.Deactivated {
			return controllers.ErrInvalidModel
		}

		// check passwords
		if err = ur.UC.ComparePassword(user.ID.Hex(), login.Password); err != nil {
			return err
		}

		// create new JWT for user
		claims := &models.UserJWTClaims{
			UserID: user.ID, Auth: true,
			Admin:     user.Admin,
			Username:  user.Username,
			Confirmed: user.Confirmed,
			StandardClaims: jwt.StandardClaims{
				ExpiresAt: time.Now().Add(time.Hour * time.Duration(jwtConf.ExpireHours)).Unix(),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		t, err := token.SignedString([]byte(jwtConf.PrivateKey))
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, echo.Map{"token": t, "user": user})
	})

	userRoutes := ur.R.Group("/user")

	// redeem confirmation code
	userRoutes.GET("/code/:userID/:code", func(c echo.Context) error {
		code := c.Param("code")
		userID := c.Param("userID")
		if err := ur.UC.ConfirmUser(code, userID); err != nil {
			return err
		}

		user, err := ur.UC.GetUserByID(userID)
		if err != nil {
			return err
		}

		updatedClaims := &models.UserJWTClaims{
			UserID: user.ID, Auth: true, Username: user.Username,
			Admin: user.Admin, Confirmed: true,
			StandardClaims: jwt.StandardClaims{
				ExpiresAt: time.Now().Add(time.Hour * time.Duration(jwtConf.ExpireHours)).Unix(),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, updatedClaims)
		t, err := token.SignedString([]byte(jwtConf.PrivateKey))
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, echo.Map{"token": t, "user": user})
	})

	// create a new user
	userRoutes.POST("/id", func(c echo.Context) error {
		data := &newuserdata{}
		if err := c.Bind(data); err != nil {
			return err
		}

		if !ur.Dev {
			// confirm reCAPTCHA
			valid, err := recaptcha.Confirm(c.Request().RemoteAddr, data.ReCAPTCHA)
			if err != nil || !valid {
				return echo.NewHTTPError(http.StatusBadRequest)
			}
		}
		user := &models.User{
			Username: data.Username, Password: data.Password,
			Email: data.Email,
		}
		userID, err := ur.UC.CreateUser(user)
		if err != nil {
			return err
		}
		newUser, err := ur.UC.GetUserByID(userID.Hex())
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, newUser)
	})

	// reset password request
	userRoutes.PUT("/pw/reset/request", func(c echo.Context) error {
		req := &resetpasswordreq{}
		if err := c.Bind(req); err != nil {
			return err
		}
		if err := ur.UC.RequestPasswordReset(req.Email); err != nil {
			return err
		}
		return c.JSON(http.StatusOK, SimpleMsg{"ok"})
	})

	// reset password
	userRoutes.GET("/pw/reset/apply/:email/:code", func(c echo.Context) error {
		if err := ur.UC.ResetPassword(c.Param("email"), c.Param("code")); err != nil {
			return err
		}
		return c.JSON(http.StatusOK, SimpleMsg{"ok"})
	})

	// next routes only for authenticated sessions
	userRoutes.Use(middleware.JWTWithConfig(ur.JWTConfig))
	userRoutes.Use(onlyAuth)

	// get own session/user object
	userRoutes.GET("/id", func(c echo.Context) error {
		claims := c.Get("claims").(*models.UserJWTClaims)
		user, err := ur.UC.GetUserByID(claims.UserID.Hex())
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, user)
	})

	// only confirmed users can update their own info
	userRoutes.Use(onlyConfirmed)

	// update own user information
	userRoutes.PUT("/id", func(c echo.Context) error {
		user := &models.User{}
		if err := c.Bind(user); err != nil {
			return err
		}
		claims := c.Get("claims").(*models.UserJWTClaims)
		user.ID = claims.UserID
		if err := ur.UC.UpdateUser(user); err != nil {
			return err
		}
		updatedUser, err := ur.UC.GetUserByID(user.ID.Hex())
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, updatedUser)
	})

	// change password
	userRoutes.PUT("/pw", func(c echo.Context) error {
		req := &passwordchangereq{}
		if err := c.Bind(req); err != nil {
			return err
		}
		claims := c.Get("claims").(*models.UserJWTClaims)
		if err := ur.UC.ChangeUserPassword(claims.UserID.Hex(), req.OldPassword, req.NewPassword); err != nil {
			return err
		}
		return c.JSON(http.StatusOK, SimpleMsg{"ok"})
	})

	// deactivate user
	userRoutes.DELETE("/id/:id", func(c echo.Context) error {
		claims := c.Get("claims").(*models.UserJWTClaims)
		if err := ur.UC.DeactivateUser(claims.UserID.Hex()); err != nil {
			return err
		}
		return c.JSON(http.StatusOK, SimpleMsg{"ok"})
	})

	// next routes only for admins
	userRoutes.Use(onlyAdmin)

	// query a user by ID
	userRoutes.GET("/id/:id", func(c echo.Context) error {
		user, err := ur.UC.GetUserByID(c.Param("id"))
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, user)
	})

	// get all users
	userRoutes.GET("/all", func(c echo.Context) error {
		users, err := ur.UC.GetAllUsers()
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, users)
	})

	// get a user by username
	userRoutes.GET("/username/:username", func(c echo.Context) error {
		user, err := ur.UC.GetUserByUsername(c.Param("username"))
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, user)
	})

	// get a user by username
	userRoutes.GET("/email/:email", func(c echo.Context) error {
		user, err := ur.UC.GetUserByEmail(c.Param("email"))
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, user)
	})

	// impersonate other user
	userRoutes.GET("/impersonate/:id", func(c echo.Context) error {
		impersonatedID := c.Param("id")
		user, err := ur.UC.GetUserByID(impersonatedID)
		if err != nil {
			return err
		}

		impersonatedUserClaims := &models.UserJWTClaims{
			Admin: user.Admin, Auth: true, UserID: user.ID,
			Confirmed: user.Confirmed, Username: user.Username,
			StandardClaims: jwt.StandardClaims{
				ExpiresAt: time.Now().Add(time.Hour * time.Duration(jwtConf.ExpireHours)).Unix(),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, impersonatedUserClaims)
		t, err := token.SignedString([]byte(jwtConf.PrivateKey))
		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, echo.Map{"token": t})
	})

}
