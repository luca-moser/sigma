package routers

import (
	"github.com/gorilla/websocket"
	"github.com/labstack/echo"
	"github.com/luca-moser/donapoc/server/controllers"
	"time"
)

type AccRouter struct {
	WebEngine *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
}

type balance struct {
	Balance uint64 `json:"balance"`
}

type MsgType byte

const (
	MsgStop = iota // this is an actual keyword
	MsgPromotion
	MsgReattachment
	MsgSending
	MsgSent
	MsgReceivingDeposit
	MsgReceivedDeposit
	MsgReceivedMessage
	MsgError
	MsgBalance
)

type wsmsg struct {
	MsgType MsgType     `json:"msg_type"`
	Data    interface{} `json:"data"`
	TS      time.Time   `json:"ts"`
}

var (
	upgrader = websocket.Upgrader{}
)

type balancemsg struct {
	Usable uint64 `json:"usable"`
	Total  uint64 `json:"total"`
}

func (accRouter *AccRouter) Init() {

}
