package handlers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
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

// 腾讯云短信
type TencentProvider struct {
	SecretID   string
	SecretKey  string
	AppID      string
	SignName   string
	TemplateID string
}

func (t *TencentProvider) Send(phone, code string) error {
	endpoint := "sms.tencentcloudapi.com"
	payload := fmt.Sprintf(`{"PhoneNumberSet":["+86%s"],"SmsSdkAppId":"%s","SignName":"%s","TemplateId":"%s","TemplateParamSet":["%s"]}`,
		phone, t.AppID, t.SignName, t.TemplateID, code)

	algorithm := "TC3-HMAC-SHA256"
	service := "sms"
	host := endpoint
	action := "SendSms"
	version := "2021-01-11"
	region := "ap-guangzhou"
	timestamp := time.Now().Unix()

	// 拼接规范请求串
	httpRequestMethod := "POST"
	canonicalURI := "/"
	canonicalQueryString := ""
	canonicalHeaders := fmt.Sprintf("content-type:application/json\nhost:%s\n", host)
	signedHeaders := "content-type;host"
	hashedRequestPayload := sha256Hex([]byte(payload))
	canonicalRequest := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		httpRequestMethod, canonicalURI, canonicalQueryString, canonicalHeaders, signedHeaders, hashedRequestPayload)

	// 拼接待签名字符串
	date := time.Unix(timestamp, 0).UTC().Format("2006-01-02")
	credentialScope := fmt.Sprintf("%s/%s/tc3_request", date, service)
	hashedCanonicalRequest := sha256Hex([]byte(canonicalRequest))
	stringToSign := fmt.Sprintf("%s\n%d\n%s\n%s",
		algorithm, timestamp, credentialScope, hashedCanonicalRequest)

	// 计算签名
	secretDate := hmacSha256Hex([]byte("TC3"+t.SecretKey), []byte(date))
	secretService := hmacSha256Hex(secretDate, []byte(service))
	secretSigning := hmacSha256Hex(secretService, []byte("tc3_request"))
	signature := hex.EncodeToString(hmacSha256(secretSigning, []byte(stringToSign)))

	// 拼接 Authorization
	authorization := fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		algorithm, t.SecretID, credentialScope, signedHeaders, signature)

	// 发送请求
	req, err := http.NewRequest("POST", "https://"+host, strings.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Host", host)
	req.Header.Set("X-TC-Action", action)
	req.Header.Set("X-TC-Version", version)
	req.Header.Set("X-TC-Timestamp", fmt.Sprintf("%d", timestamp))
	req.Header.Set("X-TC-Region", region)
	req.Header.Set("Authorization", authorization)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if respBody, ok := result["Response"]; ok {
		if respMap, ok := respBody.(map[string]interface{}); ok {
			if errInfo, ok := respMap["Error"]; ok {
				errMap := errInfo.(map[string]interface{})
				return fmt.Errorf("短信发送失败: %v", errMap["Message"])
			}
		}
	}
	fmt.Printf("[SMS] 短信发送成功: %s\n", phone)
	return nil
}

func getSMSProvider() SMSProvider {
	// 优先使用环境变量，否则使用默认配置
	secretID := os.Getenv("SMS_SECRET_ID")
	secretKey := os.Getenv("SMS_SECRET_KEY")
	appID := os.Getenv("SMS_SDK_APP_ID")
	signName := os.Getenv("SMS_SIGN_NAME")
	templateID := os.Getenv("SMS_TEMPLATE_ID")

	if secretID == "" {
		secretID = "AKIDlz775rPtFRYa7uToulHbhYAYhbGhtpWO"
	}
	if secretKey == "" {
		secretKey = "e5Us67tSr32qQmunBKFvMZYLxLUP6uUu"
	}
	if appID == "" {
		appID = "1600153558"
	}
	if signName == "" {
		signName = "优选商城"
	}
	if templateID == "" {
		templateID = "1"
	}

	// 如果模板ID还是占位值，说明未配置真实模板，降级为控制台输出
	if templateID == "1" {
		fmt.Println("[SMS] 模板ID未配置，使用控制台输出模式（验证码将打印到终端）")
		return &ConsoleProvider{}
	}

	return &TencentProvider{
		SecretID:   secretID,
		SecretKey:  secretKey,
		AppID:      appID,
		SignName:   signName,
		TemplateID: templateID,
	}
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

	resp := map[string]interface{}{
		"code":    200,
		"message": "验证码已发送",
	}
	// 控制台模式下，验证码直接返回给前端显示
	if _, ok := provider.(*ConsoleProvider); ok {
		resp["debug_code"] = code
	}
	json.NewEncoder(w).Encode(resp)
}

// ========== 辅助函数 ==========

func sha256Hex(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

func hmacSha256Hex(key, data []byte) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write(data)
	return mac.Sum(nil)
}

func hmacSha256(key, data []byte) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write(data)
	return mac.Sum(nil)
}