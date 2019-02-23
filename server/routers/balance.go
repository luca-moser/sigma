package routers

import (
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/iotaledger/iota.go/account/event/listener"
	"github.com/iotaledger/iota.go/bundle"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"sync"
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

	router.R.GET("/stream/balance", func(c echo.Context) error {
		ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		userID, err := authWS(ws, router.JWTConfig.SigningKey)
		if err != nil {
			return err
		}

		tuple, err := router.AccCtrl.Get(userID)
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

		mu := sync.Mutex{}
		sendBalance := func() {
			avail, err := tuple.Account.AvailableBalance()
			if err != nil {
				return
			}
			total, err := tuple.Account.TotalBalance()
			if err != nil {
				return
			}
			data := &msg{Type: byte(Balance), Data: &balanceres{avail, total}}
			mu.Lock()
			defer mu.Unlock()
			if err := ws.WriteJSON(data); err != nil {
				// TODO: send down error
			}
		}

		lis.RegInternalErrors(func(err error) {
			fmt.Println(err)
		})

		lis.RegSentTransfers(func(bndl bundle.Bundle) {
			// TODO: find a better way to unblock
			go sendBalance()
		})

		lis.RegConfirmedTransfers(func(bndl bundle.Bundle) {
			// TODO: find a better way to unblock
			go sendBalance()
		})

		lis.RegReceivedDeposits(func(bndl bundle.Bundle) {
			// TODO: find a better way to unblock
			go sendBalance()
		})

		sendBalance()
		ws.SetReadDeadline(time.Time{})
		for {
			if err := ws.ReadJSON(&msg{}); err != nil {
				break
			}
		}
		return nil
	})

}
