package routers

import (
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo"
	"github.com/luca-moser/sigma/server/models"
)

// pass through authenticated sessions
func onlyAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := c.Get("user").(*jwt.Token)
		claims := user.Claims.(*models.UserJWTClaims)
		if claims.Auth == false {
			fmt.Println("didn't pass auth")
			return echo.ErrUnauthorized
		}
		c.Set("claims", claims)
		return next(c)
	}
}

// pass through confirmed accounts
func onlyConfirmed(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := c.Get("user").(*jwt.Token)
		claims := user.Claims.(*models.UserJWTClaims)
		if claims.Confirmed == false {
			fmt.Println("didn't pass confirm")
			return echo.ErrUnauthorized
		}
		return next(c)
	}
}

// pass through admin accounts
func onlyAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := c.Get("user").(*jwt.Token)
		claims := user.Claims.(*models.UserJWTClaims)
		if claims.Admin == false {
			return echo.ErrUnauthorized
		}
		return next(c)
	}
}