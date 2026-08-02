package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"mall/backend/database"
	"mall/backend/models"
)

func AdminProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	rows, err := database.DB.Query(`
		SELECT p.id, p.name, p.description, p.price, p.original_price,
			p.stock, p.image, p.category_id, COALESCE(c.name, '') as cn,
			p.sales, p.is_on_sale
		FROM products p LEFT JOIN categories c ON p.category_id = c.id
		ORDER BY p.id DESC`)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
		return
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.OriginalPrice,
			&p.Stock, &p.Image, &p.CategoryID, &p.CategoryName, &p.Sales, &p.IsOnSale)
		products = append(products, p)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: products})
}

func AdminAddProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "参数错误"})
		return
	}

	result, err := database.DB.Exec(`
		INSERT INTO products (name, description, price, original_price, stock, image, category_id, is_on_sale)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		p.Name, p.Description, p.Price, p.OriginalPrice, p.Stock, p.Image, p.CategoryID, p.IsOnSale)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "添加失败: " + err.Error()})
		return
	}
	id, _ := result.LastInsertId()
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "添加成功", Data: map[string]int64{"id": id}})
}

func AdminUpdateProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var pid int
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/products/")
	fmt.Sscanf(path, "%d", &pid)

	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "参数错误"})
		return
	}

	_, err := database.DB.Exec(`
		UPDATE products SET name=?, description=?, price=?, original_price=?, stock=?, image=?, category_id=?, is_on_sale=?
		WHERE id=?`,
		p.Name, p.Description, p.Price, p.OriginalPrice, p.Stock, p.Image, p.CategoryID, p.IsOnSale, pid)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "修改失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "修改成功"})
}

func AdminDeleteProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var pid int
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/products/")
	fmt.Sscanf(path, "%d", &pid)

	database.DB.Exec("DELETE FROM products WHERE id = ?", pid)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}

// ==================== 管理员 - 用户管理 ====================
func AdminUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	rows, err := database.DB.Query(`
		SELECT id, username, nickname, phone, is_admin, created_at
		FROM users ORDER BY id DESC`)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.Username, &u.Nickname, &u.Phone, &u.IsAdmin, &u.CreatedAt)
		users = append(users, u)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: users})
}

func AdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var uid int
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	fmt.Sscanf(path, "%d", &uid)

	database.DB.Exec("DELETE FROM users WHERE id = ? AND is_admin = 0", uid)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}

// ==================== 管理员 - 订单管理 ====================
func AdminOrders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	rows, err := database.DB.Query(`
		SELECT o.id, o.order_no, o.user_id, u.username, o.total_amount, o.status,
			o.receiver_name, o.phone, o.address, o.created_at
		FROM orders o LEFT JOIN users u ON o.user_id = u.id
		ORDER BY o.id DESC`)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
		return
	}
	defer rows.Close()

	type AdminOrder struct {
		ID           int       `json:"id"`
		OrderNo      string    `json:"order_no"`
		UserID       int       `json:"user_id"`
		Username     string    `json:"username"`
		TotalAmount  float64   `json:"total_amount"`
		Status       int       `json:"status"`
		StatusText   string    `json:"status_text"`
		ReceiverName string    `json:"receiver_name"`
		Phone        string    `json:"phone"`
		Address      string    `json:"address"`
		CreatedAt    time.Time `json:"created_at"`
	}

	orders := []AdminOrder{}
	for rows.Next() {
		var o AdminOrder
		rows.Scan(&o.ID, &o.OrderNo, &o.UserID, &o.Username, &o.TotalAmount, &o.Status,
			&o.ReceiverName, &o.Phone, &o.Address, &o.CreatedAt)
		o.StatusText = models.StatusText(o.Status)
		orders = append(orders, o)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: orders})
}

func AdminUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var oid int
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/orders/")
	path = strings.TrimSuffix(path, "/status")
	fmt.Sscanf(path, "%d", &oid)

	var body struct {
		Status int `json:"status"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	database.DB.Exec("UPDATE orders SET status = ? WHERE id = ?", body.Status, oid)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "状态已更新"})
}