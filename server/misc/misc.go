package misc

import (
	"crypto/rand"
	"fmt"
	"github.com/iotaledger/iota.go/consts"
	"github.com/mattn/go-colorable"
	"gopkg.in/inconshreveable/log15.v2"
	"os"
)

var Debug = false

func init() {
	os.Mkdir("./logs", 0777)
}

func GetLogger(name string) (log15.Logger, error) {

	// open a new logfile
	fileHandler, err := log15.FileHandler(fmt.Sprintf("./logs/%s.log", name), log15.LogfmtFormat())
	if err != nil {
		return nil, err
	}

	handler := log15.MultiHandler(
		fileHandler,
		log15.StreamHandler(colorable.NewColorableStdout(), log15.TerminalFormat()),
	)
	if !Debug {
		handler = log15.LvlFilterHandler(log15.LvlInfo, handler)
	}
	logger := log15.New("comp", name)
	logger.SetHandler(handler)
	return logger, nil
}

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHJIKLMNOPQRSTUVWXYZ123456789"

func GenerateRandomCode(length int) string {
	by := make([]byte, length)
	if _, err := rand.Read(by); err != nil {
		panic(err)
	}
	var pw string
	for _, b := range by {
		pw += string(letters[int(b)%len(letters)])
	}
	return pw
}

const seedLength = 81

var tryteAlphabetLength = byte(len(consts.TryteAlphabet))

func GenerateSeed() (string, error) {
	var by [seedLength]byte
	if _, err := rand.Read(by[:]); err != nil {
		return "", err
	}
	var seed string
	for _, b := range by {
		seed += string(consts.TryteAlphabet[b%tryteAlphabetLength])
	}
	return seed, nil
}
