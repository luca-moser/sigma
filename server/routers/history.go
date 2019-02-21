package routers

import (
	"github.com/gorilla/websocket"
	"github.com/iotaledger/iota.go/trinary"
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
	HistoryInit HistoryRec = iota
	HistoryNewItem
)

type historynewitemmsg struct {
	Bundle string              `json:"bundle"`
	Item   *models.HistoryItem `json:"item"`
}

func (router *HistoryStreamRouter) Init() {

	router.R.GET("/stream/history", func(c echo.Context) error {
		ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		userID, err := authWS(ws, router.JWTConfig.SigningKey)
		if err != nil {
			return err
		}

		ws.SetCloseHandler(func(code int, text string) error {
			message := websocket.FormatCloseMessage(code, "")
			ws.WriteControl(websocket.CloseMessage, message, time.Now().Add(time.Second))
			return nil
		})

		currentHistory, err := router.AccCtrl.GetHistory(userID)
		if err == nil {
			if err := ws.WriteJSON(&msg{Type: byte(HistoryInit), Data: currentHistory}); err != nil {
				return err
			}
		}

		router.AccCtrl.RegisterHistoryUpdateCallback(userID, func(bundleHash trinary.Trytes, item *models.HistoryItem) bool {
			m := &msg{Type: byte(HistoryNewItem), Data: historynewitemmsg{bundleHash, item}}
			if err := ws.WriteJSON(m); err != nil {
				return true
			}
			return false
		})

		ws.SetReadDeadline(time.Time{})
		for {
			if err := ws.ReadJSON(&msg{}); err != nil {
				break
			}
		}

		return nil
	})

}
