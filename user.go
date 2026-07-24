package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"golang.org/x/crypto/bcrypt"

	"mall/backend/database"
	"mall/backend/models"
)

func hashPassword(pwd string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	return string(hash)
}

func Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "参数错误"})
		return
	}
	if req.Username == "" || req.Password == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "用户名和密码不能为空"})
		return
	}
	if req.Phone == "" || req.SMSCode == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "手机号和短信验证码不能为空"})
		return
	}
	if !SMSStore.Verify(req.Phone, req.SMSCode) {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "短信验证码错误或已过期"})
		return
	}

	var existID int
	database.DB.QueryRow("SELECT id FROM users WHERE username = ?", req.Username).Scan(&existID)
	if existID > 0 {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "用户名已存在"})
		return
	}

	result, err := database.DB.Exec(
		"INSERT INTO users (username, password, nickname, phone) VALUES (?, ?, ?, ?)",
		req.Username, hashPassword(req.Password), req.Nickname, req.Phone)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "注册失败"})
		return
	}
	id, _ := result.LastInsertId()
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "注册成功", Data: map[string]interface{}{
		"id":       id,
		"username": req.Username,
		"nickname": req.Nickname,
		"phone":    req.Phone,
	}})
}

func Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "参数错误"})
		return
	}
	if !Captcha.Verify(req.CaptchaToken, req.CaptchaAnswer) {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "验证码错误或已过期"})
		return
	}

	var user models.User
	var hashedPwd string
	var err error

	// 判断输入是手机号还是用户名：11位且以1开头视为手机号
	if len(req.Username) == 11 && req.Username[0] == '1' {
		err = database.DB.QueryRow(
			"SELECT id, username, password, nickname, phone, avatar, is_admin FROM users WHERE phone = ?",
			req.Username).Scan(
			&user.ID, &user.Username, &hashedPwd, &user.Nickname, &user.Phone, &user.Avatar, &user.IsAdmin)
	} else {
		err = database.DB.QueryRow(
			"SELECT id, username, password, nickname, phone, avatar, is_admin FROM users WHERE username = ?",
			req.Username).Scan(
			&user.ID, &user.Username, &hashedPwd, &user.Nickname, &user.Phone, &user.Avatar, &user.IsAdmin)
	}

	if err == sql.ErrNoRows || bcrypt.CompareHashAndPassword([]byte(hashedPwd), []byte(req.Password)) != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "用户名或密码错误"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "登录成功", Data: user})
}

func GetUserInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}
	var user models.User
	err := database.DB.QueryRow(
		"SELECT id, username, nickname, phone, avatar, is_admin FROM users WHERE id = ?",
		userID).Scan(&user.ID, &user.Username, &user.Nickname, &user.Phone, &user.Avatar, &user.IsAdmin)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 404, Message: "用户不存在"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: user})
}

func ChangePassword(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}
	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.NewPassword == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "新密码不能为空"})
		return
	}
	var hashedPwd string
	database.DB.QueryRow("SELECT password FROM users WHERE id = ?", userID).Scan(&hashedPwd)
	if bcrypt.CompareHashAndPassword([]byte(hashedPwd), []byte(req.OldPassword)) != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "旧密码错误"})
		return
	}
	database.DB.Exec("UPDATE users SET password = ? WHERE id = ?", hashPassword(req.NewPassword), userID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "密码修改成功"})
}