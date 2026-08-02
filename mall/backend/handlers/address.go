package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
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

	rows, err := database.DB.Query(`
		SELECT id, user_id, receiver_name, phone, province, city, district, detail, is_default
		FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`, userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
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

	var addr models.Address
	if err := json.NewDecoder(r.Body).Decode(&addr); err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "参数错误"})
		return
	}

	if addr.IsDefault {
		database.DB.Exec("UPDATE addresses SET is_default = 0 WHERE user_id = ?", userID)
	}

	result, err := database.DB.Exec(`
		INSERT INTO addresses (user_id, receiver_name, phone, province, city, district, detail, is_default)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, addr.ReceiverName, addr.Phone, addr.Province, addr.City, addr.District, addr.Detail, addr.IsDefault)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "添加失败"})
		return
	}
	id, _ := result.LastInsertId()
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "添加成功", Data: map[string]int64{"id": id}})
}

func UpdateAddress(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	var addrID int
	path := strings.TrimPrefix(r.URL.Path, "/api/addresses/")
	fmt.Sscanf(path, "%d", &addrID)

	var addr models.Address
	if err := json.NewDecoder(r.Body).Decode(&addr); err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "参数错误"})
		return
	}

	if addr.IsDefault {
		database.DB.Exec("UPDATE addresses SET is_default = 0 WHERE user_id = ?", userID)
	}

	_, err := database.DB.Exec(`
		UPDATE addresses SET receiver_name=?, phone=?, province=?, city=?, district=?, detail=?, is_default=?
		WHERE id=? AND user_id=?`,
		addr.ReceiverName, addr.Phone, addr.Province, addr.City, addr.District, addr.Detail, addr.IsDefault, addrID, userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "修改失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "修改成功"})
}

func DeleteAddress(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	var addrID int
	path := strings.TrimPrefix(r.URL.Path, "/api/addresses/")
	fmt.Sscanf(path, "%d", &addrID)

	database.DB.Exec("DELETE FROM addresses WHERE id = ? AND user_id = ?", addrID, userID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}

func SetDefaultAddress(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	var addrID int
	path := strings.TrimPrefix(r.URL.Path, "/api/addresses/")
	path = strings.TrimSuffix(path, "/default")
	fmt.Sscanf(path, "%d", &addrID)

	database.DB.Exec("UPDATE addresses SET is_default = 0 WHERE user_id = ?", userID)
	database.DB.Exec("UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?", addrID, userID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "已设为默认"})
}