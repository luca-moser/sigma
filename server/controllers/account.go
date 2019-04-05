package controllers

import (
	"github.com/iotaledger/iota.go/account"
	"github.com/iotaledger/iota.go/account/builder"
	"github.com/iotaledger/iota.go/account/event"
	"github.com/iotaledger/iota.go/account/event/listener"
	"github.com/iotaledger/iota.go/account/oracle"
	time2 "github.com/iotaledger/iota.go/account/oracle/time"
	"github.com/iotaledger/iota.go/account/plugins/promoter"
	"github.com/iotaledger/iota.go/account/plugins/transfer/poller"
	mongostore "github.com/iotaledger/iota.go/account/store/mongo"
	"github.com/iotaledger/iota.go/account/timesrc"
	"github.com/iotaledger/iota.go/api"
	"github.com/iotaledger/iota.go/bundle"
	"github.com/iotaledger/iota.go/consts"
	"github.com/iotaledger/iota.go/guards"
	"github.com/iotaledger/iota.go/pow"
	"github.com/iotaledger/iota.go/trinary"
	"github.com/luca-moser/confbox/oraclesrc"
	"github.com/luca-moser/sigma/server/misc"
	"github.com/luca-moser/sigma/server/models"
	"github.com/luca-moser/sigma/server/server/config"
	"github.com/pkg/errors"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gopkg.in/inconshreveable/log15.v2"
	"net/http"
	"sync"
	"time"
)

type AccCtrl struct {
	Config               *config.Configuration `inject:""`
	UC                   *UserCtrl             `inject:""`
	Mongo                *mongo.Client         `inject:""`
	Coll                 *mongo.Collection
	IOTAAPI              *api.API
	Store                *mongostore.MongoStore
	TimeSource           timesrc.TimeSource
	logger               log15.Logger
	loadedMu             sync.Mutex
	loaded               map[string]AccountTuple
	histroyUpdateFuncsMu sync.Mutex
	historyUpdateFuncs   map[string][]HistoryUpdateCBFunc
	SendOracle           oracle.SendOracle
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
		Client: &http.Client{Timeout: time.Duration(10) * time.Second},
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
	ac.historyUpdateFuncs = make(map[string][]HistoryUpdateCBFunc)

	// init send oracle
	sendConf := ac.Config.Account.Send
	timedecider := time2.NewTimeDecider(ac.TimeSource, time.Duration(sendConf.TimeoutBeforeThreshold)*time.Minute)

	var avgMode oraclesrc.AvgMode
	switch sendConf.ConfRateAvgMode {
	case 5:
		avgMode = oraclesrc.AvgMode5Min
	case 10:
		avgMode = oraclesrc.AvgMode10Min
	case 15:
		avgMode = oraclesrc.AvgMode15Min
	case 30:
		avgMode = oraclesrc.AvgMode30Min
	default:
		avgMode = oraclesrc.AvgMode15Min
	}

	if sendConf.ConfRateAvgThreshold < 0.6 {
		sendConf.ConfRateAvgThreshold = 0.6
	}

	confRateDecider := oraclesrc.NewConfBoxDecider(sendConf.ConfBoxURL, ac.TimeSource, sendConf.ConfRateAvgThreshold, avgMode)
	ac.SendOracle = oracle.New(timedecider, confRateDecider)

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
		ac.storeHistory(userID, acc.ID(), bndl, models.HistoryReceiving)
	})
	lis.RegReceivedDeposits(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, acc.ID(), bndl, models.HistoryReceived)
	})
	lis.RegReceivedMessages(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, acc.ID(), bndl, models.HistoryMessage)
	})
	lis.RegSentTransfers(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, acc.ID(), bndl, models.HistorySending)
	})
	lis.RegConfirmedTransfers(func(bndl bundle.Bundle) {
		ac.storeHistory(userID, acc.ID(), bndl, models.HistorySent)
	})

	tuple = AccountTuple{acc, em, b.Settings()}
	ac.loaded[userID] = tuple
	return &tuple, nil
}

func (ac *AccCtrl) storeHistory(userID string, accID string, bndl bundle.Bundle, ty models.HistoryItemType) error {
	depAddrs, err := ac.Store.GetDepositRequests(accID)
	if err != nil {
		return err
	}

	var setts *account.Settings
	ac.loadedMu.Lock()
	setts = ac.loaded[userID].Settings
	ac.loadedMu.Unlock()

	ownAddrs := make(map[trinary.Hash]struct{})
	for keyIndex, depAddr := range depAddrs {
		addr, _ := setts.AddrGen(keyIndex, depAddr.SecurityLevel, false)
		ownAddrs[addr] = struct{}{}
	}

	bundleHash := bndl[0].Bundle
	var amount int64

	var msg string
	switch ty {
	case models.HistoryReceived:
		fallthrough
	case models.HistoryReceiving:
		for _, tx := range bndl {
			if tx.Value < 0 {
				continue
			}
			if _, ok := ownAddrs[tx.Address]; !ok {
				continue
			}
			if !guards.IsEmptyTrytes(tx.SignatureMessageFragment) {
				msg = tx.SignatureMessageFragment
			}
			amount += tx.Value
		}
	case models.HistorySent:
		fallthrough
	case models.HistorySending:
		for _, tx := range bndl {
			// inputs
			if tx.Value < 0 {
				amount += tx.Value
				continue
			}
			// remainder
			if _, isRemainder := ownAddrs[tx.Address]; isRemainder {
				amount += tx.Value
				continue
			}
			if !guards.IsEmptyTrytes(tx.SignatureMessageFragment) {
				msg = tx.SignatureMessageFragment
			}
		}
	case models.HistoryMessage:
		for _, tx := range bndl {
			if _, ok := ownAddrs[tx.Address]; !ok {
				continue
			}
			if !guards.IsEmptyTrytes(tx.SignatureMessageFragment) {
				msg = tx.SignatureMessageFragment
			}
		}
	}

	idObj, _ := primitive.ObjectIDFromHex(userID)
	date := time.Unix(int64(bndl[0].Timestamp), 0)
	var mut bson.D
	var filter bson.D
	historyItem := &models.HistoryItem{Amount: amount, Type: ty, Date: date, Message: msg}
	if ty == models.HistorySent {
		mut = bson.D{{"$set", bson.D{
			{"items." + bundleHash + ".type", ty},
		}}}
		filter = bson.D{{"_id", idObj}}
	} else {
		mut = bson.D{{"$set", bson.D{
			{"items." + bundleHash, historyItem},
		}}}
		filter = bson.D{{"_id", idObj}}
	}
	t := true
	updateOpts := &options.UpdateOptions{Upsert: &t,}
	_, err = ac.Coll.UpdateOne(getCtx(), filter, mut, updateOpts)
	if err != nil {
		return err
	}

	// TODO: make it per user instead of global
	ac.histroyUpdateFuncsMu.Lock()
	defer ac.histroyUpdateFuncsMu.Unlock()
	funcs, has := ac.historyUpdateFuncs[userID]
	if !has {
		return nil
	}
	toRemove := make([]int, 0)
	for i, f := range funcs {
		if remove := f(bundleHash, historyItem); remove {
			toRemove = append(toRemove, i)
		}
	}
	for i, index := range toRemove {
		funcs = append(funcs[:index-i], funcs[index-i+1:]...)
	}

	return nil
}

func (ac *AccCtrl) GetHistory(userID string) (*models.History, error) {
	idObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	res := ac.Coll.FindOne(getCtx(), bson.D{{"_id", idObj}})
	if res.Err() != nil {
		return nil, res.Err()
	}

	history := &models.History{}
	if err := res.Decode(history); err != nil {
		return nil, err
	}
	return history, nil
}

type HistoryUpdateCBFunc func(bundleHash trinary.Hash, item *models.HistoryItem) bool

func (ac *AccCtrl) RegisterHistoryUpdateCallback(userID string, f HistoryUpdateCBFunc) {
	ac.histroyUpdateFuncsMu.Lock()
	defer ac.histroyUpdateFuncsMu.Unlock()
	funcs, has := ac.historyUpdateFuncs[userID]
	if !has {
		funcs = make([]HistoryUpdateCBFunc, 0)
	}
	funcs = append(funcs, f)
	ac.historyUpdateFuncs[userID] = funcs
}
