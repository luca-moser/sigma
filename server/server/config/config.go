package config

import (
	"encoding/json"
	"io/ioutil"
)

type Config interface{}

const configLoc = "./configs/app.json"

func LoadConfig() (*Configuration, error) {
	conf := &Configuration{}
	configBytes, err := ioutil.ReadFile(configLoc)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(configBytes, conf); err != nil {
		return nil, err
	}
	return conf, err
}

type Configuration struct {
	Name      string
	Dev       bool
	Verbose   bool
	Account   AccountConfig
	HTTP      WebConfig
	Mongo     MongoConfig
	Mail      MailConfig
	JWT       JWTConfig
	ReCaptcha ReCaptchaConfig
	Links     LinksConfig
}

type AccountConfig struct {
	Node                       string `json:"node"`
	MWM                        uint64 `json:"mwm"`
	GTTADepth                  uint64 `json:"gtta_depth"`
	SecurityLevel              uint64 `json:"security_level"`
	TransferPollInterval       uint64 `json:"transfer_poll_interval"`
	PromoteReattachInterval    uint64 `json:"promote_reattach_interval"`
	AddressValidityTimeoutDays uint64 `json:"address_validity_timeout_days"`
	NTPServer                  string `json:"ntp_server"`
}

type MongoConfig struct {
	URI      string `json:"uri"`
	DBName   string `json:"dbname"`
	CollName string `json:"collname"`
}

type JWTConfig struct {
	PrivateKey  string `json:"private_key"`
	ExpireHours uint64 `json:"expire_hours"`
}

type ReCaptchaConfig struct {
	PrivateKey string `json:"private_key"`
	PublicKey  string `json:"public_key"`
}

type WebConfig struct {
	Domain  string
	Address string
	Assets  struct {
		Static  string
		HTML    string
		Favicon string
	}
	LogRequests bool
}

type MailConfig struct {
	Host     string
	Username string
	Password string
	Port     int
	Sender   string
}

type LinksConfig struct {
	Activation    string `json:"activation"`
	PasswordReset string `json:"password_reset"`
}
