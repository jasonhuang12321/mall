package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"mall/backend/database"
	"mall/backend/models"
)

// 管理员权限检查
func checkAdmin(w http.ResponseWriter, r *http.Request) bool {
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return false
	}
	var isAdmin bool
	database.DB.QueryRow("SELECT is_admin FROM users WHERE id = ?", userID).Scan(&isAdmin)
	if !isAdmin {
		json.NewEncoder(w).Encode(models.Response{Code: 403, Message: "无权限"})
		return false
	}
	return true
}

// ==================== 商品管理 ====================
func AdminGetProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !checkAdmin(w, r) {
		return
	}

	rows, err := database.DB.Query(`
		SELECT p.id, p.name, p.description, p.price, p.original_price,
			p.stock, p.image, p.category_id, COALESCE(c.name, '') as cn,
			p.sales, p.is_on_sale
		FROM products p LEFT JOIN categories c ON p.category_id = c.id
		ORDER BY p.id DESC`)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "查询失败"})
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
	if !checkAdmin(w, r) {
		return
	}

	var req models.ProductRequest
	json.NewDecoder(r.Body).Decode(&req)
	if req.Name == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "商品名称不能为空"})
		return
	}

	_, err := database.DB.Exec(
		"INSERT INTO products (name, description, price, original_price, stock, image, category_id, is_on_sale) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		req.Name, req.Description, req.Price, req.OriginalPrice, req.Stock, req.Image, req.CategoryID, req.IsOnSale)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "添加失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "添加成功"})
}

func AdminUpdateProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !checkAdmin(w, r) {
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/products/")
	pid, _ := strconv.Atoi(idStr)

	var req models.ProductRequest
	json.NewDecoder(r.Body).Decode(&req)

	_, err := database.DB.Exec(
		"UPDATE products SET name=?, description=?, price=?, original_price=?, stock=?, image=?, category_id=?, is_on_sale=? WHERE id=?",
		req.Name, req.Description, req.Price, req.OriginalPrice, req.Stock, req.Image, req.CategoryID, req.IsOnSale, pid)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "更新失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "更新成功"})
}

func AdminDeleteProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !checkAdmin(w, r) {
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/products/")
	pid, _ := strconv.Atoi(idStr)

	database.DB.Exec("DELETE FROM products WHERE id = ?", pid)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}

// ==================== 用户管理 ====================
func AdminGetUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !checkAdmin(w, r) {
		return
	}

	rows, err := database.DB.Query(
		"SELECT id, username, nickname, phone, avatar, is_admin, created_at FROM users ORDER BY id DESC")
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "查询失败"})
		return
	}
	defer rows.Close()

	users := []models.AdminUser{}
	for rows.Next() {
		var u models.AdminUser
		rows.Scan(&u.ID, &u.Username, &u.Nickname, &u.Phone, &u.Avatar, &u.IsAdmin, &u.CreatedAt)
		users = append(users, u)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: users})
}

func AdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !checkAdmin(w, r) {
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	uid, _ := strconv.Atoi(idStr)

	database.DB.Exec("DELETE FROM users WHERE id = ? AND is_admin = 0", uid)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}

// ==================== 订单管理 ====================
func AdminGetOrders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !checkAdmin(w, r) {
		return
	}

	rows, err := database.DB.Query(`
		SELECT o.id, o.order_no, o.user_id, u.username, o.total_amount, o.status,
			o.receiver_name, o.phone, o.address, o.created_at
		FROM orders o JOIN users u ON o.user_id = u.id
		ORDER BY o.id DESC`)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "查询失败"})
		return
	}
	defer rows.Close()

	orders := []models.AdminOrder{}
	for rows.Next() {
		var o models.AdminOrder
		rows.Scan(&o.ID, &o.OrderNo, &o.UserID, &o.Username, &o.TotalAmount, &o.Status,
			&o.ReceiverName, &o.Phone, &o.Address, &o.CreatedAt)
		o.StatusText = models.StatusText(o.Status)
		orders = append(orders, o)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: orders})
}

func AdminUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !checkAdmin(w, r) {
		return
	}

	// /api/admin/orders/123/status
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/orders/")
	oid, _ := strconv.Atoi(strings.TrimSuffix(path, "/status"))

	var req struct {
		Status int `json:"status"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	database.DB.Exec("UPDATE orders SET status = ? WHERE id = ?", req.Status, oid)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "状态已更新"})
}