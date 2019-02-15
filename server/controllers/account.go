package controllers

import (
	mongostore "github.com/iotaledger/iota.go/account/store/mongo"
	"github.com/iotaledger/iota.go/account/timesrc"
	"github.com/iotaledger/iota.go/api"
	"github.com/luca-moser/donapoc/server/server/config"
	"github.com/luca-moser/donapoc/server/utilities"
	"github.com/pkg/errors"
	"gopkg.in/inconshreveable/log15.v2"
	"net/http"
	"time"
)

type AccCtrl struct {
	Config     *config.Configuration `inject:""`
	iota       *api.API
	store      *mongostore.MongoStore
	timesource timesrc.TimeSource
	logger     log15.Logger
}

func (ac *AccCtrl) Init() error {
	var err error
	conf := ac.Config.App

	// init logger
	ac.logger, _ = utilities.GetLogger("acc")

	// init api
	iotaAPI, err := api.ComposeAPI(api.HTTPClientSettings{
		URI: conf.Account.Node, Client: &http.Client{Timeout: time.Duration(5) * time.Second},
	})
	if err != nil {
		return errors.Wrap(err, "unable to init IOTA API")
	}
	ac.iota = iotaAPI

	ac.store, err = mongostore.NewMongoStore(conf.Mongo.URI, &mongostore.Config{
		DBName: conf.Mongo.DBName, CollName: conf.Mongo.CollName,
	})
	if err != nil {
		return errors.Wrap(err, "unable to init to MongoDB store")
	}

	// init NTP time source
	ac.timesource = timesrc.NewNTPTimeSource(conf.Account.NTPServer)

	return nil
}
