package controllers

import (
	"github.com/iotaledger/iota.go/account"
	"github.com/iotaledger/iota.go/account/builder"
	"github.com/iotaledger/iota.go/account/event"
	"github.com/iotaledger/iota.go/account/event/listener"
	"github.com/iotaledger/iota.go/account/plugins/promoter"
	"github.com/iotaledger/iota.go/account/plugins/transfer/poller"
	mongostore "github.com/iotaledger/iota.go/account/store/mongo"
	"github.com/iotaledger/iota.go/account/timesrc"
	"github.com/iotaledger/iota.go/api"
	"github.com/iotaledger/iota.go/bundle"
	"github.com/iotaledger/iota.go/consts"
	"github.com/iotaledger/iota.go/pow"
	"github.com/luca-moser/sigma/server/misc"
	"github.com/luca-moser/sigma/server/models"
	"github.com/luca-moser/sigma/server/server/config"
	"github.com/mongodb/mongo-go-driver/mongo"
	"github.com/pkg/errors"
	"gopkg.in/inconshreveable/log15.v2"
	"net/http"
	"sync"
	"time"
)

type AccCtrl struct {
	Config     *config.Configuration `inject:""`
	UC         *UserCtrl             `inject:""`
	Mongo      *mongo.Client         `inject:""`
	Coll       *mongo.Collection
	IOTAAPI    *api.API
	Store      *mongostore.MongoStore
	TimeSource timesrc.TimeSource
	logger     log15.Logger
	loadedMu   sync.Mutex
	loaded     map[string]AccountTuple
}

type AccountTuple struct {
	Account      account.Account
	EventMachine event.EventMachine
	Settings     *account.Settings
}

func (ac *AccCtrl) Init() error {
	var err error
	conf := ac.Config

	dbName := ac.Config.Mongo.DBName
	ac.Coll = ac.Mongo.Database(dbName).Collection("history")

	// init logger
	ac.logger, _ = misc.GetLogger("acc")

	// init api
	_, powFunc := pow.GetFastestProofOfWorkImpl()
	iotaAPI, err := api.ComposeAPI(api.HTTPClientSettings{
		URI: conf.Account.Node, LocalProofOfWorkFunc: powFunc,
		Client: &http.Client{Timeout: time.Duration(5) * time.Second},
	})
	if err != nil {
		return errors.Wrap(err, "unable to init IOTA API")
	}
	ac.IOTAAPI = iotaAPI

	ac.Store, err = mongostore.NewMongoStore(conf.Mongo.URI, &mongostore.Config{
		DBName: conf.Mongo.DBName, CollName: conf.Mongo.CollName,
	})
	if err != nil {
		return errors.Wrap(err, "unable to init to MongoDB store")
	}

	// init NTP time source
	ac.TimeSource = timesrc.NewNTPTimeSource(conf.Account.NTPServer)

	ac.loaded = make(map[string]AccountTuple)
	return nil
}

// returns the account of the given user
func (ac *AccCtrl) Get(userID string) (*AccountTuple, error) {
	ac.loadedMu.Lock()
	defer ac.loadedMu.Unlock()
	tuple, has := ac.loaded[userID]
	if has {
		return &tuple, nil
	}

	user, err := ac.UC.GetUserByID(userID)
	if err != nil {
		// TODO: wrap
		return nil, err
	}
	conf := ac.Config.Account
	em := event.NewEventMachine()
	b := builder.NewBuilder().
		WithSeed(user.Seed).
		WithAPI(ac.IOTAAPI).
		WithStore(ac.Store).
		WithDepth(conf.GTTADepth).
		WithMWM(conf.MWM).
		WithSecurityLevel(consts.SecurityLevel(conf.SecurityLevel)).
		WithEvents(em).
		WithTimeSource(ac.TimeSource)

	transferPoller := poller.NewTransferPoller(
		b.Settings(), poller.NewPerTailReceiveEventFilter(false),
		time.Duration(conf.TransferPollInterval)*time.Second)

	promoterReattacher := promoter.NewPromoter(b.Settings(), time.Duration(conf.PromoteReattachInterval)*time.Second)

	acc, err := b.Build(transferPoller, promoterReattacher)
	if err != nil {
		// TODO: wrap
		return nil, err
	}
	if err := acc.Start(); err != nil {
		// TODO: wrap
		return nil, err
	}

	// register event handler for history saving
	lis := listener.NewCallbackEventListener(em)
	lis.RegReceivingDeposits(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, bndl, models.HistoryReceiving)
	})
	lis.RegReceivedDeposits(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, bndl, models.HistoryReceived)
	})
	lis.RegSentTransfers(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, bndl, models.HistorySending)
	})
	lis.RegConfirmedTransfers(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, bndl, models.HistorySent)
	})

	tuple = AccountTuple{acc, em, b.Settings()}
	ac.loaded[userID] = tuple
	return &tuple, nil
}

func (ac *AccCtrl) storeHistory(userID string, bundle bundle.Bundle, ty models.HistoryItemType) error {
	return nil
}
