package routers

import (
	"github.com/gorilla/websocket"
	"github.com/iotaledger/iota.go/account"
	"github.com/iotaledger/iota.go/account/event"
	"github.com/iotaledger/iota.go/account/event/listener"
	"github.com/iotaledger/iota.go/bundle"
	"github.com/labstack/echo"
	"github.com/luca-moser/donapoc/server/controllers"
	"time"
)

type BalanceStreamRouter struct {
	WebEngine *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
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

	router.WebEngine.GET("/stream/balance", func(c echo.Context) error {
		ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		// TODO: get account instance
		var acc account.Account
		_ = acc
		var em event.EventMachine
		lis := listener.NewCallbackEventListener(em)

		ws.SetCloseHandler(func(code int, text string) error {
			message := websocket.FormatCloseMessage(code, "")
			ws.WriteControl(websocket.CloseMessage, message, time.Now().Add(time.Second))
			lis.Close()
			return nil
		})

		sendBalance := func() {
			avail, err := acc.AvailableBalance()
			if err != nil {
				return
			}
			total, err := acc.TotalBalance()
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
