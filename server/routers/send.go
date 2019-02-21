package routers

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"github.com/iotaledger/iota.go/account/deposit"
	"github.com/iotaledger/iota.go/account/event/listener"
	"github.com/iotaledger/iota.go/bundle"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"sync"
	"time"
)

type SendStreamRouter struct {
	R         *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
	JWTConfig middleware.JWTConfig `inject:"jwt_config_user"`
}

type SendRec byte

const (
	SelectingInputs SendRec = iota
	PreparingTransfers
	GettingTransactionsToApprove
	AttachingToTangle
	SentOff
	SendError
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

	router.R.GET("/stream/send", func(c echo.Context) error {
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
		sendMessage := func(data *msg) {
			mu.Lock()
			defer mu.Unlock()
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

		ws.SetReadDeadline(time.Time{})
		for {
			m := &msg{}
			if err := ws.ReadJSON(m); err != nil {
				break
			}

			switch SendReq(m.Type) {
			case Send:
				req := &sendreq{}
				if err := json.Unmarshal([]byte(m.Data.(string)), req); err != nil {
					break
				}

				conds, err := deposit.ParseMagnetLink(req.Link)
				if err != nil {
					mu.Lock()
					ws.WriteJSON(&msg{Type: byte(SendError), Data: err.Error()})
					mu.Unlock()
					break
				}

				recipient := conds.AsTransfer()
				recipient.Value = req.Amount
				if _, err := tuple.Account.Send(recipient); err != nil {
					mu.Lock()
					ws.WriteJSON(&msg{Type: byte(SendError), Data: err.Error()})
					mu.Unlock()
					break
				}
			}
		}

		return nil
	})

}
