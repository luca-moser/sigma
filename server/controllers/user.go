package controllers

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"fmt"
	"github.com/luca-moser/sigma/server/misc"
	"github.com/luca-moser/sigma/server/models"
	"github.com/luca-moser/sigma/server/server/config"
	"github.com/mongodb/mongo-go-driver/bson/primitive"
	"github.com/mongodb/mongo-go-driver/mongo"
	"gopkg.in/gomail.v2"
	"html/template"
	mathRand "math/rand"
	"net/mail"
	"strconv"
	"time"

	"strings"

	"regexp"

	"github.com/pkg/errors"
	"gopkg.in/mgo.v2/bson"
)

const userCollection = "users"

type UserCtrl struct {
	Config     *config.Configuration `inject:""`
	Mongo      *mongo.Client         `inject:""`
	Template   *template.Template    `inject:"mail_templates"`
	Coll       *mongo.Collection
	MailDialer *gomail.Dialer
}

func (uc *UserCtrl) Init() error {
	dbName := uc.Config.Mongo.DBName
	uc.Coll = uc.Mongo.Database(dbName).Collection(userCollection)

	emailIndexBuilder := mongo.NewIndexOptionsBuilder()
	emailIndex := emailIndexBuilder.
		Name("email").
		Unique(true).
		Background(true).
		Sparse(true).Build()

	usernameIndexBuilder := mongo.NewIndexOptionsBuilder()
	usernameIndex := usernameIndexBuilder.
		Name("username").
		Unique(true).
		Background(true).
		Sparse(true).Build()

	indexes := []mongo.IndexModel{{Keys: emailIndex}, {Keys: usernameIndex}}
	_, err := uc.Coll.Indexes().CreateMany(getCtx(), indexes)
	if err != nil {
		return err
	}

	smtpConfig := uc.Config.Mail
	uc.MailDialer = gomail.NewDialer(smtpConfig.Host, smtpConfig.Port, smtpConfig.Username, smtpConfig.Password)
	return nil
}

// checks whether the given password matches with the user's password
func (uc *UserCtrl) ComparePassword(id string, password string) error {
	// load the user to get the password salt
	user, err := uc.GetUserByID(id)
	if err != nil {
		return err
	}

	// hash the provided password with the user's salt
	hashedPassword := hashSHA256(password, user.PasswordSalt)

	// compare the stored hash with the newly computed hash
	if hashedPassword != user.Password {
		return ErrWrongPassword
	}
	return nil
}

// sends a password reset request email to the user
func (uc *UserCtrl) RequestPasswordReset(email string) error {
	user, err := uc.GetUserByEmail(email)
	if err != nil {
		return err
	}

	resetCode := misc.GenerateRandomCode(15)
	mut := bson.D{{"$set", bson.D{{"password_reset_code", resetCode}}}}
	_, err = uc.Coll.UpdateOne(getCtx(), bson.D{{"_id", user.ID}}, mut)
	if err != nil {
		return err
	}
	return uc.SendPasswordResetRequestEmail(user, resetCode)
}

func (uc *UserCtrl) SendPasswordResetRequestEmail(user *models.User, code string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", uc.Config.Mail.Sender)
	m.SetHeader("To", user.Email)
	m.SetHeader("Subject", "Sigma Account - Password Reset Request")
	var parsedEmail bytes.Buffer
	uc.Template.ExecuteTemplate(&parsedEmail, "password_reset_request", struct {
		URL string
	}{fmt.Sprintf(uc.Config.Links.PasswordReset, user.Email, code)})
	m.SetBody("text/html", parsedEmail.String())

	if err := uc.MailDialer.DialAndSend(m); err != nil {
		return errors.Wrap(ErrInternalError, "unable to send password reset email")
	}
	return nil
}

// resets the password of the user and sends an email with it
func (uc *UserCtrl) ResetPassword(email string, code string) error {
	user, err := uc.GetUserByEmail(email)
	if err != nil {
		return err
	}

	// compare codes
	if user.PasswordResetCode != code {
		return errors.Wrapf(ErrInvalidModelUpdate, "(user) reset password code is invalid")
	}

	newPassword := misc.GenerateRandomCode(20)
	hashedPassword, salt := generateHashedPassword(newPassword)
	mut := bson.D{{"$set", bson.D{
		{"password", hashedPassword},
		{"password_salt", salt},
		{"password_reset_request", ""},
	}}}
	_, err = uc.Coll.UpdateOne(getCtx(), bson.D{{"_id", user.ID}}, mut)
	if err != nil {
		return errors.Wrapf(err, "(user) couldn't reset password of '%s'", user.ID.Hex())
	}

	// send password reset email
	return uc.SendPasswordResetEmail(user, newPassword)
}

func (uc *UserCtrl) SendPasswordResetEmail(user *models.User, newPassword string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", uc.Config.Mail.Sender)
	m.SetHeader("To", user.Email)
	m.SetHeader("Subject", "Sigma Account - Password Reset")
	var parsedEmail bytes.Buffer
	if err := uc.Template.ExecuteTemplate(&parsedEmail, "password_reset", struct {
		Password string
	}{newPassword}); err != nil {
		// TODO: wrap
		return err
	}
	m.SetBody("text/html", parsedEmail.String())

	if err := uc.MailDialer.DialAndSend(m); err != nil {
		fmt.Println(err)
		return errors.Wrap(err, "unable to send password reset email")
	}
	return nil
}

// gets the user by the given id
func (uc *UserCtrl) GetAllUsers() ([]models.User, error) {
	users := []models.User{}
	res, err := uc.Coll.Find(getCtx(), bson.D{})
	if err != nil {
		// TODO: wrap
		return nil, err
	}
	for res.Next(getCtx()) {
		var user models.User
		if err := res.Decode(&user); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, errors.Wrap(err, "(user) couldn't load all users")
}

// gets the user by the given id
func (uc *UserCtrl) GetUserByID(id string) (*models.User, error) {
	objId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, ErrInvalidID
	}
	res := uc.Coll.FindOne(getCtx(), bson.D{{"_id", objId}})
	if res.Err() != nil {
		return nil, res.Err()
	}
	user := &models.User{}
	err = res.Decode(user)
	return user, errors.Wrapf(err, "(user) couldn't load user '%s'", id)
}

// gets the user by the given username
func (uc *UserCtrl) GetUserByUsername(username string) (*models.User, error) {
	res := uc.Coll.FindOne(getCtx(), bson.D{{"username", username}})
	if res.Err() != nil {
		return nil, res.Err()
	}
	user := &models.User{}
	err := res.Decode(user)
	return user, errors.Wrapf(err, "(user) couldn't load user '%s'", username)
}

// gets the user by the given email
func (uc *UserCtrl) GetUserByEmail(email string) (*models.User, error) {
	res := uc.Coll.FindOne(getCtx(), bson.D{{"email", email}})
	if res.Err() != nil {
		return nil, res.Err()
	}
	user := &models.User{}
	err := res.Decode(user)
	return user, errors.Wrapf(err, "(user) couldn't load user by email '%s", email)
}

// creates a new user in the system
func (uc *UserCtrl) CreateUser(user *models.User) (*primitive.ObjectID, error) {
	if err := uc.ValidateUser(user, true); err != nil {
		return nil, err
	}

	// salt = md5(random num)
	// password = sha256(password+salt)
	hashedPassword, salt := generateHashedPassword(user.Password)
	user.PasswordSalt = salt
	user.Password = hashedPassword
	user.ConfirmationCode = misc.GenerateRandomCode(20)
	user.CreatedOn = time.Now()
	user.LastLogin = emptyDate()
	user.LastAccess = emptyDate()
	user.ID = primitive.NewObjectID()

	seed, err := misc.GenerateSeed()
	if err != nil {
		return nil, errors.Wrap(err, "unable to generate new seed for new user")
	}
	user.Seed = seed

	// send off confirmation code
	go uc.SendConfirmationCodeEmail(user)

	if _, err := uc.Coll.InsertOne(getCtx(), user); err != nil {
		return nil, errors.Wrap(err, "(user) couldn't insert user")
	}
	return &user.ID, nil
}

func emptyDate() time.Time {
	return time.Date(1970, time.Month(1), 1, 0, 0, 0, 0, time.UTC)
}

func (uc *UserCtrl) SendConfirmationCodeEmail(user *models.User) error {
	// send off confirmation code email
	m := gomail.NewMessage()
	m.SetHeader("From", uc.Config.Mail.Sender)
	m.SetHeader("To", user.Email)
	m.SetHeader("Subject", "Activate Your Sigma Account")
	var parsedEmail bytes.Buffer
	if err := uc.Template.ExecuteTemplate(&parsedEmail, "confirmation_code", struct {
		Name string
		URL  string
	}{
		user.Username, fmt.Sprintf(uc.Config.Links.Activation, user.ID.Hex(), user.ConfirmationCode),
	}); err != nil {
		return err
	}
	m.SetBody("text/html", parsedEmail.String())

	if err := uc.MailDialer.DialAndSend(m); err != nil {
		fmt.Println(err)
		return errors.Wrap(ErrInternalError, "unable to send confirmation code email")
	}
	return nil
}

// updates the user's last access
func (uc *UserCtrl) UpdateLastAccess(userID string) error {
	idObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return ErrInvalidID
	}

	mut := bson.D{{"$set", bson.D{{"last_access", time.Now()}}}}
	_, err = uc.Coll.UpdateOne(getCtx(), bson.D{{"_id", idObj}}, mut)
	return errors.Wrapf(err, "(user) couldn't update user last access '%s'", userID)
}

func (uc *UserCtrl) ConfirmUser(code string, userID string) error {
	idObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return ErrInvalidID
	}

	user, err := uc.GetUserByID(userID)
	if err != nil {
		return err
	}

	if user.Confirmed {
		return ErrAlreadyConfirmed
	}

	if user.ConfirmationCode != code {
		return ErrInvalidConfirmationCode
	}

	mut := bson.D{{"$set", bson.D{{"confirmed", true}}}}
	_, err = uc.Coll.UpdateOne(getCtx(), bson.D{{"_id", idObj}}, mut)
	return errors.Wrapf(err, "(user) couldn't update user confirmed state '%s'", userID)
}

// updates the user's field (password must be updated separately)
func (uc *UserCtrl) UpdateUser(user *models.User) error {
	idObj, err := primitive.ObjectIDFromHex(user.ID.Hex())
	if err != nil {
		return errors.Wrap(ErrInvalidID, "(user) can't update as id is invalid")
	}

	if err := uc.ValidateUser(user, false); err != nil {
		return err
	}

	mut := bson.D{{"$set", bson.D{
		{"username", user.Username},
		{"email", user.Email},
		{"last_login", user.LastLogin},
		{"update_on", time.Now()},
	}}}
	_, err = uc.Coll.UpdateOne(getCtx(), bson.D{{"_id", idObj}}, mut)
	return errors.Wrapf(err, "(user) couldn't update user '%s'", user.ID.Hex())
}

// changes the given user's password
func (uc *UserCtrl) ChangeUserPassword(id string, oldPassword string, newPassword string) error {
	idObj, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrInvalidID
	}

	// check whether old password is correct
	if err := uc.ComparePassword(id, oldPassword); err != nil {
		return err
	}

	// change password
	hashedPassword, salt := generateHashedPassword(newPassword)
	mut := bson.D{{"$set", bson.D{
		{"password", hashedPassword},
		{"password_salt", salt},
	}}}
	_, err = uc.Coll.UpdateOne(getCtx(), bson.D{{"_id", idObj}}, mut)
	return errors.Wrapf(err, "(user) couldn't update password of '%s'", id)
}

func (uc *UserCtrl) DeactivateUser(id string) error {
	idObj, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrInvalidID
	}
	mut := bson.D{{"$set", bson.D{{"deactivated", true}}}}
	_, err = uc.Coll.UpdateOne(getCtx(), bson.D{{"_id", idObj}}, mut)
	return errors.Wrapf(err, "(user) couldn't delete user '%s'", id)
}

// removes the given user from the system
func (uc *UserCtrl) RemoveUser(id string) error {
	idObj, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrInvalidID
	}
	_, err = uc.Coll.DeleteOne(getCtx(), bson.D{{"_id", idObj}})
	return errors.Wrapf(err, "(user) couldn't delete user '%s'", id)
}

// validates the given user instance
func (uc *UserCtrl) ValidateUser(user *models.User, checkPW bool) error {
	if len(user.Username) == 0 {
		return errors.Wrap(ErrInvalidModel, "(user) username length is 0")
	}

	if len(user.Username) > 50 {
		return errors.Wrap(ErrInvalidModel, "(user) username length is too long")
	}

	if _, err := mail.ParseAddress(user.Email); err != nil {
		return errors.Wrapf(ErrInvalidModel, "(user) email '%s' is not a valid", user.Email)
	}

	if checkPW {
		if len(strings.TrimSpace(user.Password)) < 4 {
			return errors.Wrapf(ErrInvalidModel, "(user) password '%s' is too short", user.Password)
		}
		if len(strings.TrimSpace(user.Password)) > 30 {
			return errors.Wrapf(ErrInvalidModel, "(user) password '%s' is too long", user.Password)
		}
		if match, err := regexp.Match("\\s", []byte(user.Password)); match || err != nil {
			return errors.Wrapf(ErrInvalidModel, "(user) password '%s' contains whitespace", user.Password)
		}
	}

	// through the unique index it's not possible to add a user with the same username or email
	// therefore we don't need to check duplicates
	return nil
}

// hashes the given password together with a md5(rand int) salt in to a sha256 hex
// returns the password (first return value) and the salt (second return value)
func generateHashedPassword(password string) (string, string) {
	mathRand.Seed(time.Now().UnixNano())
	salt := fmt.Sprintf("%x", md5.Sum([]byte(strconv.Itoa(mathRand.Int()))))
	hashedPassword := hashSHA256(password, salt)
	return hashedPassword, salt
}

// hashes the given password and salt with sha256
func hashSHA256(password string, salt string) string {
	return fmt.Sprintf("%x", sha256.Sum256([]byte(password+salt)))
}
