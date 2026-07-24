package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

type CaptchaStore struct {
	mu    sync.Mutex
	items map[string]captchaItem
}

type captchaItem struct {
	Answer    string
	ExpiresAt time.Time
}

var Captcha = &CaptchaStore{
	items: make(map[string]captchaItem),
}

const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

func (c *CaptchaStore) Set(answer string) string {
	c.mu.Lock()
	defer c.mu.Unlock()

	// 清理过期
	for k, v := range c.items {
		if time.Now().After(v.ExpiresAt) {
			delete(c.items, k)
		}
	}

	token := make([]byte, 16)
	rand.Read(token)
	id := hex.EncodeToString(token)

	c.items[id] = captchaItem{
		Answer:    answer,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	return id
}

func (c *CaptchaStore) Verify(token string, answer string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	item, ok := c.items[token]
	if !ok {
		return false
	}
	delete(c.items, token)

	if time.Now().After(item.ExpiresAt) {
		return false
	}
	return strings.EqualFold(item.Answer, answer)
}

func GetCaptcha(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 生成4位随机字母数字验证码
	code := make([]byte, 4)
	for i := range code {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		code[i] = chars[n.Int64()]
	}
	codeStr := string(code)

	token := Captcha.Set(codeStr)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":     200,
		"message":  "success",
		"token":    token,
		"question": codeStr,
	})
}