package handlers

import (
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// ========== 短信验证码存储 ==========

type smsCodeItem struct {
	Code      string
	ExpiresAt time.Time
	SentAt    time.Time
	Count     int // 当天发送次数
}

type SMSCodeStore struct {
	mu    sync.Mutex
	items map[string]*smsCodeItem // key: phone number
}

var SMSStore = &SMSCodeStore{
	items: make(map[string]*smsCodeItem),
}

func (s *SMSCodeStore) Generate(phone string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()

	// 清理过期
	for k, v := range s.items {
		if now.After(v.ExpiresAt) {
			delete(s.items, k)
		}
	}

	item, exists := s.items[phone]
	if exists {
		// 60秒内不能重复发送
		if now.Sub(item.SentAt) < 60*time.Second {
			return "", fmt.Errorf("发送过于频繁，请60秒后再试")
		}
		// 每天最多5次
		if item.Count >= 5 {
			return "", fmt.Errorf("今日发送次数已达上限")
		}
		item.Count++
	} else {
		item = &smsCodeItem{Count: 1}
		s.items[phone] = item
	}

	// 生成6位数字验证码
	code := ""
	for i := 0; i < 6; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		code += fmt.Sprintf("%d", n.Int64())
	}

	item.Code = code
	item.SentAt = now
	item.ExpiresAt = now.Add(5 * time.Minute)

	return code, nil
}

func (s *SMSCodeStore) Verify(phone, code string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.items[phone]
	if !ok {
		return false
	}
	if time.Now().After(item.ExpiresAt) {
		delete(s.items, phone)
		return false
	}
	if item.Code != code {
		return false
	}
	delete(s.items, phone) // 一次性使用
	return true
}

// ========== 短信发送接口 ==========

type SMSProvider interface {
	Send(phone, code string) error
}

// 控制台输出（测试用）
type ConsoleProvider struct{}

func (c *ConsoleProvider) Send(phone, code string) error {
	fmt.Printf("[SMS] 发送短信到 %s: 验证码 = %s\n", phone, code)
	return nil
}

// 创蓝云智短信
type ChuanglanProvider struct {
	Account  string
	Password string
}

func (c *ChuanglanProvider) Send(phone, code string) error {
	// 创蓝云智 JSON API
	url := "https://smssh1.253.com/msg/send/json"

	payload := map[string]interface{}{
		"account":  c.Account,
		"password": c.Password,
		"msg":      fmt.Sprintf("【优选商城】您的验证码是：%s。请不要把验证码泄露给其他人。", code),
		"phone":    phone,
	}

	body, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("短信接口请求失败: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)

	codeVal, _ := result["code"].(string)
	if codeVal != "0" {
		errMsg, _ := result["errorMsg"].(string)
		if errMsg == "" {
			errMsg = fmt.Sprintf("错误码: %s", codeVal)
		}
		return fmt.Errorf("短信发送失败: %s", errMsg)
	}

	fmt.Printf("[SMS] 短信发送成功: %s\n", phone)
	return nil
}

func getSMSProvider() SMSProvider {
	account := os.Getenv("SMS_ACCOUNT")
	password := os.Getenv("SMS_PASSWORD")

	if account == "" {
		// 默认使用创蓝云智配置
		account = "PROD_JQX3LOMBP4"
		password = "xz00g1qfn7110psky635n7u9s3ynb8va"
	}

	if account != "" && password != "" {
		return &ChuanglanProvider{
			Account:  account,
			Password: password,
		}
	}
	return &ConsoleProvider{}
}

// ========== HTTP 处理器 ==========

func SendSMS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{"code": 400, "message": "方法不允许"})
		return
	}

	var req struct {
		Phone string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"code": 400, "message": "参数错误"})
		return
	}

	// 验证手机号格式
	phone := strings.TrimSpace(req.Phone)
	if len(phone) != 11 || phone[0] != '1' {
		json.NewEncoder(w).Encode(map[string]interface{}{"code": 400, "message": "手机号格式不正确"})
		return
	}

	// 生成验证码
	code, err := SMSStore.Generate(phone)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"code": 400, "message": err.Error()})
		return
	}

	// 发送短信
	provider := getSMSProvider()
	if err := provider.Send(phone, code); err != nil {
		fmt.Printf("短信发送失败: %v\n", err)
		json.NewEncoder(w).Encode(map[string]interface{}{"code": 500, "message": "短信发送失败，请稍后重试"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":    200,
		"message": "验证码已发送",
	})
}

// ========== 辅助函数 ==========

func md5Hex(s string) string {
	hash := md5.Sum([]byte(s))
	return hex.EncodeToString(hash[:])
}