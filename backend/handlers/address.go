package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"mall/backend/database"
	"mall/backend/models"
)

func GetAddresses(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	rows, err := database.DB.Query(
		"SELECT id, user_id, receiver_name, phone, province, city, district, detail, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
		userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "查询失败"})
		return
	}
	defer rows.Close()

	addresses := []models.Address{}
	for rows.Next() {
		var a models.Address
		rows.Scan(&a.ID, &a.UserID, &a.ReceiverName, &a.Phone, &a.Province, &a.City, &a.District, &a.Detail, &a.IsDefault)
		addresses = append(addresses, a)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: addresses})
}

func AddAddress(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	var req models.AddressRequest
	json.NewDecoder(r.Body).Decode(&req)
	if req.ReceiverName == "" || req.Phone == "" || req.Detail == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "收货人、手机号和详细地址不能为空"})
		return
	}

	// 如果设为默认，先取消其他默认
	if req.IsDefault {
		database.DB.Exec("UPDATE addresses SET is_default = 0 WHERE user_id = ?", userID)
	}

	_, err := database.DB.Exec(
		"INSERT INTO addresses (user_id, receiver_name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID, req.ReceiverName, req.Phone, req.Province, req.City, req.District, req.Detail, req.IsDefault)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "添加失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "添加成功"})
}

func UpdateAddress(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/addresses/")
	addrID, _ := strconv.Atoi(idStr)

	var req models.AddressRequest
	json.NewDecoder(r.Body).Decode(&req)

	if req.IsDefault {
		database.DB.Exec("UPDATE addresses SET is_default = 0 WHERE user_id = ?", userID)
	}

	_, err := database.DB.Exec(
		"UPDATE addresses SET receiver_name=?, phone=?, province=?, city=?, district=?, detail=?, is_default=? WHERE id=? AND user_id=?",
		req.ReceiverName, req.Phone, req.Province, req.City, req.District, req.Detail, req.IsDefault, addrID, userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "更新失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "更新成功"})
}

func DeleteAddress(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	idStr := strings.TrimPrefix(r.URL.Path, "/api/addresses/")
	addrID, _ := strconv.Atoi(idStr)

	database.DB.Exec("DELETE FROM addresses WHERE id = ? AND user_id = ?", addrID, userID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}

func SetDefaultAddress(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	// /api/addresses/123/default
	path := strings.TrimPrefix(r.URL.Path, "/api/addresses/")
	addrID, _ := strconv.Atoi(strings.TrimSuffix(path, "/default"))

	database.DB.Exec("UPDATE addresses SET is_default = 0 WHERE user_id = ?", userID)
	database.DB.Exec("UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?", addrID, userID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "设置成功"})
}