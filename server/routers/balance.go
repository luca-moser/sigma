package routers

import (
	"github.com/gorilla/websocket"
	"github.com/iotaledger/iota.go/account/event/listener"
	"github.com/iotaledger/iota.go/bundle"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"github.com/luca-moser/sigma/server/models"
	"time"
)

type BalanceStreamRouter struct {
	R         *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
	JWTConfig middleware.JWTConfig `inject:"jwt_config_user"`
}

type BalanceRec byte

const (
	Balance BalanceRec = iota
)

type balanceres struct {
	Available uint64 `json:"available"`
	Total     uint64 `json:"total"`
}

func (router *BalanceStreamRouter) Init() {

	g := router.R.Group("/stream/balance")

	g.Use(middleware.JWTWithConfig(router.JWTConfig))
	g.Use(onlyAuth)
	g.Use(onlyConfirmed)

	g.GET("", func(c echo.Context) error {
		claims := c.Get("claims").(*models.UserJWTClaims)
		tuple, err := router.AccCtrl.Get(claims.UserID.Hex())
		if err != nil {
			return err
		}

		ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		lis := listener.NewCallbackEventListener(tuple.EventMachine)

		ws.SetCloseHandler(func(code int, text string) error {
			message := websocket.FormatCloseMessage(code, "")
			ws.WriteControl(websocket.CloseMessage, message, time.Now().Add(time.Second))
			lis.Close()
			return nil
		})

		sendBalance := func() {
			avail, err := tuple.Account.AvailableBalance()
			if err != nil {
				return
			}
			total, err := tuple.Account.TotalBalance()
			if err != nil {
				return
			}
			if err := ws.WriteJSON(&balanceres{avail, total}); err != nil {
				_ = err
			}
		}

		lis.RegSentTransfers(func(bndl bundle.Bundle) {
			sendBalance()
		})

		lis.RegReceivedDeposits(func(bndl bundle.Bundle) {
			sendBalance()
		})

		sendBalance()
		return nil
	})

}
