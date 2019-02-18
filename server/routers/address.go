package routers

import (
	"github.com/iotaledger/iota.go/account/deposit"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/luca-moser/sigma/server/controllers"
	"github.com/luca-moser/sigma/server/models"
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

func (router *AddressStreamRouter) Init() {

	g := router.R.Group("/stream/address")

	g.Use(middleware.JWTWithConfig(router.JWTConfig))
	g.Use(onlyAuth)
	g.Use(onlyConfirmed)

	g.GET("", func(c echo.Context) error {
		claims := c.Get("claims").(*models.UserJWTClaims)
		tuple, err := router.AccCtrl.Get(claims.UserID.Hex())
		if err != nil {
			return err
		}

		ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		depReqs, err := router.AccCtrl.Store.GetDepositRequests(tuple.Account.ID())
		if err != nil {
			return err
		}

		addrs := make([]deposit.Conditions, len(depReqs))
		var addrsIndex int
		for keyIndex, req := range depReqs {
			addr, err := tuple.Settings.AddrGen(keyIndex, req.SecurityLevel, true)
			if err != nil {
				return err
			}
			addrs[addrsIndex] = deposit.Conditions{Address: addr, Request: deposit.Request{
				ExpectedAmount: req.ExpectedAmount,
				MultiUse:       req.MultiUse,
				TimeoutAt:      req.TimeoutAt,
			}}
			addrsIndex++
		}

		if err := ws.WriteJSON(&msg{Type: byte(AddressInit), Data: addrs}); err != nil {
			return err
		}

		for {
			m := &msg{}
			if err := ws.ReadJSON(m); err != nil {
				break
			}

			switch AddressReq(m.Type) {
			case NewAddress:
				now, err := router.AccCtrl.TimeSource.Time()
				if err != nil {
					// TODO: send down error
					break
				}
				plusOneHour := now.Add(time.Duration(1) * time.Hour)
				conds, err := tuple.Account.AllocateDepositRequest(&deposit.Request{TimeoutAt: &plusOneHour, MultiUse: true})
				if err != nil {
					// TODO: send down error
					break
				}

				if err := ws.WriteJSON(&msg{Type: byte(AddressAdd), Data: conds}); err != nil {
					return err
				}
			}
		}

		return nil
	})

}
