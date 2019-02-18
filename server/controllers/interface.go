package controllers

import (
	"context"
	"github.com/pkg/errors"
	"time"
)

type Controller interface {
	Init() error
}

var ErrInvalidID = errors.New("invalid object id")
var ErrInvalidModel = errors.New("invalid model")
var ErrInvalidQuery = errors.New("invalid query")
var ErrAlreadyConfirmed = errors.New("user is already confirmed")
var ErrInvalidConfirmationCode = errors.New("invalid confirmation code")
var ErrInsufficientPerms = errors.New("insufficient permissions")
var ErrValidationInternal = errors.New("validation failed because of internal cause")
var ErrInvalidModelUpdate = errors.New("invalid model update")
var ErrInvalidModelDeletion = errors.New("invalid model deletion")
var ErrWrongPassword = errors.New("wrong user password")
var ErrInternalError = errors.New("internal error occured")

func getCtx() context.Context {
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	return ctx
}
