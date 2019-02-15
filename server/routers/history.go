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

type HistoryStreamRouter struct {
	WebEngine *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
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

	router.WebEngine.GET("/stream/history", func(c echo.Context) error {
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
