package routers

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"github.com/iotaledger/iota.go/account"
	"github.com/iotaledger/iota.go/account/deposit"
	"github.com/iotaledger/iota.go/account/event"
	"github.com/iotaledger/iota.go/account/event/listener"
	"github.com/iotaledger/iota.go/bundle"
	"github.com/labstack/echo"
	"github.com/luca-moser/donapoc/server/controllers"
	"time"
)

type SendStreamRouter struct {
	WebEngine *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
}

type SendRec byte

const (
	SelectingInputs SendRec = iota
	PreparingTransfers
	GettingTransactionsToApprove
	AttachingToTangle
	SentOff
	Error
)

type SendReq byte

const (
	Send SendReq = iota
)

type sendreq struct {
	Amount uint64 `json:"amount"`
	Link   string `json:"link"`
}

var (
	upgrader = websocket.Upgrader{}
)

func (router *SendStreamRouter) Init() {

	router.WebEngine.GET("/stream/send", func(c echo.Context) error {
		ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		// TODO: get account instance
		var acc account.Account
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

		lis.RegInputSelection(func(balanceCheck bool) {
			if balanceCheck {
				return
			}
			sendMessage(&msg{Type: byte(SelectingInputs)})
		})

		lis.RegPreparingTransfer(func() {
			sendMessage(&msg{Type: byte(PreparingTransfers)})
		})

		lis.RegGettingTransactionsToApprove(func() {
			sendMessage(&msg{Type: byte(GettingTransactionsToApprove)})
		})

		lis.RegAttachingToTangle(func() {
			sendMessage(&msg{Type: byte(AttachingToTangle)})
		})

		lis.RegSentTransfers(func(bndl bundle.Bundle) {
			sendMessage(&msg{Type: byte(SentOff), Data: bndl})
		})

		for {
			msg := &msg{}
			if err := ws.ReadJSON(msg); err != nil {
				break
			}

			switch SendReq(msg.Type) {
			case Send:
				req := &sendreq{}
				if err := json.Unmarshal([]byte(msg.Data.(string)), req); err != nil {
					break
				}
				conds, err := deposit.ParseMagnetLink(req.Link)
				if err != nil {
					// TODO: handle
					break
				}
				recipient := conds.AsTransfer()
				recipient.Value = req.Amount
				if _, err := acc.Send(recipient); err != nil {
					// TODO: handle
					break
				}
			}
		}

		return nil
	})

}
