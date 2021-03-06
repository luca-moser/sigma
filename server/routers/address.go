package routers

import (
	"github.com/iotaledger/iota.go/account/deposit"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"time"
)

type AddressStreamRouter struct {
	R         *echo.Echo           `inject:""`
	Dev       bool                 `inject:"dev"`
	AccCtrl   *controllers.AccCtrl `inject:""`
	JWTConfig middleware.JWTConfig `inject:"jwt_config_user"`
}

type AddressRec byte

const (
	AddressInit AddressRec = iota
	AddressAdd
)

type AddressReq byte

const (
	NewAddress AddressReq = iota
)

type newaddress struct {
	Address interface{} `json:"address"`
	Link    string      `json:"link"`
}

type newaddressreq struct {
	ExpectedAmount uint64 `json:"expected_amount"`
}

func (router *AddressStreamRouter) Init() {

	router.R.GET("/stream/address", func(c echo.Context) error {
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

		depReqs, err := router.AccCtrl.Store.GetDepositAddresses(tuple.Account.ID())
		if err != nil {
			return err
		}

		addrs := make([]deposit.CDA, len(depReqs))
		var addrsIndex int
		for keyIndex, req := range depReqs {
			addr, err := tuple.Settings.AddrGen(keyIndex, req.SecurityLevel, true)
			if err != nil {
				return err
			}
			addrs[addrsIndex] = deposit.CDA{Address: addr, Conditions: deposit.Conditions{
				ExpectedAmount: req.ExpectedAmount,
				MultiUse:       req.MultiUse,
				TimeoutAt:      req.TimeoutAt,
			}}
			addrsIndex++
		}

		if err := ws.WriteJSON(&msg{Type: byte(AddressInit), Data: addrs}); err != nil {
			return err
		}

		ws.SetReadDeadline(time.Time{})
		for {
			m := &msg{}
			if err := ws.ReadJSON(m); err != nil {
				break
			}

			switch AddressReq(m.Type) {
			case NewAddress:

				expectedAmount := uint64(m.Data.(float64))
				now, err := router.AccCtrl.TimeSource.Time()
				if err != nil {
					// TODO: send down error
					break
				}
				thirdyMinutes := now.Add(time.Duration(30) * time.Minute)
				conds := &deposit.Conditions{TimeoutAt: &thirdyMinutes, MultiUse: true}
				if expectedAmount != 0 {
					conds.ExpectedAmount = &expectedAmount
					conds.MultiUse = false
				}
				cda, err := tuple.Account.AllocateDepositAddress(conds)
				if err != nil {
					// TODO: send down error
					break
				}
				link, err := cda.AsMagnetLink()
				if err != nil {
					// TODO: send down error
					break
				}
				data := &newaddress{cda, link}
				if err := ws.WriteJSON(&msg{Type: byte(AddressAdd), Data: data}); err != nil {
					return err
				}
			}
		}

		return nil
	})

}
