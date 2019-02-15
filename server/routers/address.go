package routers

import (
	"github.com/iotaledger/iota.go/account"
	"github.com/labstack/echo"
	"github.com/luca-moser/donapoc/server/controllers"
)

type AddressStreamRouter struct {
	WebEngine *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
}

type AddressRec byte

const (
	AddressInit AddressRec = iota
	AddressAdd
)

func (router *AddressStreamRouter) Init() {

	router.WebEngine.GET("/stream/address", func(c echo.Context) error {
		ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		// TODO: get account instance
		var acc account.Account
		// TODO: get time source
		_ = acc

		// TODO: send down currently allocated addresses

		for {
			msg := &msg{}
			if err := ws.ReadJSON(msg); err != nil {
				break
			}

			switch SendReq(msg.Type) {
			case Send:
				// TODO: allocate deposit address
				// TODO: send down newly allocated address
			}
		}

		return nil
	})

}
