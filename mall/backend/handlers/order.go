package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"mall/backend/database"
	"mall/backend/models"
)

func generateOrderNo() string {
	return fmt.Sprintf("%s%d", time.Now().Format("20060102150405"), rand.Intn(10000))
}

func CreateOrder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	var req models.CreateOrderRequest
	json.NewDecoder(r.Body).Decode(&req)

	// 获取购物车商品
	rows, err := database.DB.Query(`
		SELECT ci.product_id, p.name, p.image, p.price, ci.quantity
		FROM cart_items ci JOIN products p ON ci.product_id = p.id
		WHERE ci.user_id = ?`, userID)
	if err != nil || !rows.Next() {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "购物车为空"})
		return
	}
	rows.Close()

	// 重新查询计算总价
	rows, _ = database.DB.Query(`
		SELECT ci.product_id, p.name, p.image, p.price, ci.quantity
		FROM cart_items ci JOIN products p ON ci.product_id = p.id
		WHERE ci.user_id = ?`, userID)
	defer rows.Close()

	var totalAmount float64
	var orderItems []models.OrderItem
	type cartRow struct {
		productID int
		name      string
		image     string
		price     float64
		quantity  int
	}
	var cartRows []cartRow

	for rows.Next() {
		var cr cartRow
		rows.Scan(&cr.productID, &cr.name, &cr.image, &cr.price, &cr.quantity)
		cartRows = append(cartRows, cr)
		totalAmount += cr.price * float64(cr.quantity)
	}

	orderNo := generateOrderNo()
	result, err := database.DB.Exec(`
		INSERT INTO orders (order_no, user_id, total_amount, status, address, phone, receiver_name, remark)
		VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
		orderNo, userID, totalAmount, req.Address, req.Phone, req.ReceiverName, req.Remark)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "创建订单失败"})
		return
	}
	orderID, _ := result.LastInsertId()

	for _, cr := range cartRows {
		database.DB.Exec(`
			INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity)
			VALUES (?, ?, ?, ?, ?, ?)`,
			orderID, cr.productID, cr.name, cr.image, cr.price, cr.quantity)
		orderItems = append(orderItems, models.OrderItem{
			ProductID:    cr.productID,
			ProductName:  cr.name,
			ProductImage: cr.image,
			Price:        cr.price,
			Quantity:     cr.quantity,
		})
	}

	// 清空购物车
	database.DB.Exec("DELETE FROM cart_items WHERE user_id = ?", userID)

	order := models.Order{
		ID:           int(orderID),
		OrderNo:      orderNo,
		TotalAmount:  totalAmount,
		Status:       1,
		StatusText:   models.StatusText(1),
		ReceiverName: req.ReceiverName,
		Phone:        req.Phone,
		Address:      req.Address,
		Items:        orderItems,
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "下单成功", Data: order})
}

func GetOrders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, order_no, total_amount, status, receiver_name, phone, address, remark, created_at
		FROM orders WHERE user_id = ? ORDER BY id DESC`, userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
		return
	}
	defer rows.Close()

	orders := []models.Order{}
	for rows.Next() {
		var o models.Order
		rows.Scan(&o.ID, &o.OrderNo, &o.TotalAmount, &o.Status,
			&o.ReceiverName, &o.Phone, &o.Address, &o.Remark, &o.CreatedAt)
		o.StatusText = models.StatusText(o.Status)
		orders = append(orders, o)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: orders})
}

func GetOrderDetail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	// 从 URL 中提取 order ID: /api/orders/123
	orderID := 0
	fmt.Sscanf(r.URL.Path, "/api/orders/%d", &orderID)

	var o models.Order
	err := database.DB.QueryRow(`
		SELECT id, order_no, total_amount, status, receiver_name, phone, address, remark, created_at
		FROM orders WHERE id = ? AND user_id = ?`, orderID, userID).Scan(
		&o.ID, &o.OrderNo, &o.TotalAmount, &o.Status,
		&o.ReceiverName, &o.Phone, &o.Address, &o.Remark, &o.CreatedAt)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 404, Message: "订单不存在"})
		return
	}
	o.StatusText = models.StatusText(o.Status)

	// 获取订单明细
	itemRows, _ := database.DB.Query(`
		SELECT id, product_id, product_name, product_image, price, quantity
		FROM order_items WHERE order_id = ?`, orderID)
	defer itemRows.Close()

	for itemRows.Next() {
		var item models.OrderItem
		itemRows.Scan(&item.ID, &item.ProductID, &item.ProductName,
			&item.ProductImage, &item.Price, &item.Quantity)
		o.Items = append(o.Items, item)
	}

	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: o})
}

func CancelOrder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	orderID := 0
	fmt.Sscanf(r.URL.Path, "/api/orders/%d/cancel", &orderID)

	_, err := database.DB.Exec(
		"UPDATE orders SET status = 5 WHERE id = ? AND user_id = ? AND status = 1",
		orderID, userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "取消失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "订单已取消"})
}