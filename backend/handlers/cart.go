package handlers

import (
	"encoding/json"
	"net/http"

	"mall/backend/database"
	"mall/backend/models"
)

type cartAddReq struct {
	ProductID int `json:"product_id"`
	Quantity  int `json:"quantity"`
}

func GetCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT ci.id, ci.user_id, ci.product_id, p.name, p.image, p.price, ci.quantity
		FROM cart_items ci JOIN products p ON ci.product_id = p.id
		WHERE ci.user_id = ?`, userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
		return
	}
	defer rows.Close()

	items := []models.CartItem{}
	for rows.Next() {
		var item models.CartItem
		rows.Scan(&item.ID, &item.UserID, &item.ProductID, &item.ProductName,
			&item.Image, &item.Price, &item.Quantity)
		items = append(items, item)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: items})
}

func AddToCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	var req cartAddReq
	json.NewDecoder(r.Body).Decode(&req)
	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	_, err := database.DB.Exec(`
		INSERT INTO cart_items (user_id, product_id, quantity)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
		userID, req.ProductID, req.Quantity, req.Quantity)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "添加失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "已加入购物车"})
}

func UpdateCartItem(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	var req cartAddReq
	json.NewDecoder(r.Body).Decode(&req)

	if req.Quantity <= 0 {
		database.DB.Exec("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
			userID, req.ProductID)
		json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "已移除"})
		return
	}

	database.DB.Exec("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
		req.Quantity, userID, req.ProductID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "已更新"})
}

func RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	var req cartAddReq
	json.NewDecoder(r.Body).Decode(&req)

	database.DB.Exec("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
		userID, req.ProductID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "已移除"})
}

func ClearCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}
	database.DB.Exec("DELETE FROM cart_items WHERE user_id = ?", userID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "购物车已清空"})
}