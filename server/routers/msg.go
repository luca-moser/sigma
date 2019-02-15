package routers

type msg struct {
	Type byte         `json:"type"`
	Data interface{} `json:"data"`
}
