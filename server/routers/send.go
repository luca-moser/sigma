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
	"github.com/luca-moser/sigma/server/models"
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

	g := router.R.Group("/stream/send")

	g.Use(middleware.JWTWithConfig(router.JWTConfig))
	g.Use(onlyAuth)
	g.Use(onlyConfirmed)

	router.R.GET("", func(c echo.Context) error {
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
					// TODO: send down error
					break
				}
				recipient := conds.AsTransfer()
				recipient.Value = req.Amount
				if _, err := tuple.Account.Send(recipient); err != nil {
					// TODO: send down error
					break
				}
			}
		}

		return nil
	})

}
