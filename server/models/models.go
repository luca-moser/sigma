package models

import (
	"github.com/dgrijalva/jwt-go"
	"github.com/iotaledger/iota.go/trinary"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type User struct {
	ID                primitive.ObjectID `json:"id" bson:"_id"`
	Username          string             `json:"username" bson:"username"`
	Email             string             `json:"email" bson:"email"`
	Admin             bool               `json:"admin" bson:"admin"`
	Password          string             `json:"-" bson:"password"`
	PasswordSalt      string             `json:"-" bson:"password_salt"`
	Confirmed         bool               `json:"confirmed" bson:"confirmed"`
	ConfirmationCode  string             `json:"-" bson:"confirmation_code"`
	LastAccess        time.Time          `json:"last_access" bson:"last_access"`
	LastLogin         time.Time          `json:"last_login" bson:"last_login"`
	CreatedOn         time.Time          `json:"-" bson:"created_on"`
	UpdatedOn         time.Time          `json:"-" bson:"updated_on"`
	Deactivated       bool               `json:"-" bson:"deactivated"`
	PasswordResetCode string             `json:"-" bson:"password_reset_code"`
	Seed              string             `json:"-" bson:"seed"`
}

type UserJWTClaims struct {
	jwt.StandardClaims
	UserID    primitive.ObjectID `json:"user_id"`
	Username  string             `json:"username"`
	Auth      bool               `json:"auth"`
	Confirmed bool               `json:"confirmed"`
	Admin     bool               `json:"admin"`
}

type History struct {
	ID    primitive.ObjectID           `json:"_id"`
	Items map[trinary.Hash]HistoryItem `json:"items"`
}

type HistoryItemType byte

const (
	HistoryReceiving HistoryItemType = iota
	HistoryReceived
	HistorySending
	HistorySent
	HistoryMessage
)

type HistoryItem struct {
	Amount  int64           `json:"amount"`
	Type    HistoryItemType `json:"type"`
	Date    time.Time       `json:"date"`
	Message trinary.Trytes  `json:"message"`
}
