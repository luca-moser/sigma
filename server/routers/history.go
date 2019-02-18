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

type HistoryStreamRouter struct {
	R         *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
	JWTConfig middleware.JWTConfig `inject:"jwt_config_user"`
}

type HistoryRec byte

const (
	Init HistoryRec = iota
	NewHistoryItem
)

type HistoryItemType byte

const (
	HistoryReceiving HistoryItemType = iota
	HistoryReceived
	HistorySending
	HistorySent
)

type historyitem struct {
	Tail   string          `json:"tail"`
	Bundle string          `json:"bundle"`
	Amount uint64          `json:"amount"`
	Type   HistoryItemType `json:"type"`
}

func (router *HistoryStreamRouter) Init() {

	g := router.R.Group("/stream/history")

	g.Use(middleware.JWTWithConfig(router.JWTConfig))
	g.Use(onlyAuth)
	g.Use(onlyConfirmed)

	g.GET("/", func(c echo.Context) error {
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

		sendMessage := func(data *msg) {
			if err := ws.WriteJSON(data); err != nil {
				_ = err
			}
		}

		// TODO: send down the correct amount
		build := func(ty HistoryItemType, bndl bundle.Bundle) *historyitem {
			return &historyitem{Type: ty, Bundle: bndl[0].Bundle, Tail: bndl[0].Hash}
		}

		lis.RegReceivingDeposits(func(bndl bundle.Bundle) {
			sendMessage(&msg{Type: byte(NewHistoryItem), Data: build(HistoryReceiving, bndl)})
		})

		lis.RegReceivedDeposits(func(bndl bundle.Bundle) {
			sendMessage(&msg{Type: byte(NewHistoryItem), Data: build(HistoryReceived, bndl)})
		})

		lis.RegSentTransfers(func(bndl bundle.Bundle) {
			sendMessage(&msg{Type: byte(NewHistoryItem), Data: build(HistorySending, bndl)})
		})

		lis.RegConfirmedTransfers(func(bndl bundle.Bundle) {
			sendMessage(&msg{Type: byte(NewHistoryItem), Data: build(HistorySent, bndl)})
		})

		return nil
	})

}
