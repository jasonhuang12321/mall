package models

import "time"

// 通用响应
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// 用户
type User struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"-"`
	Nickname  string    `json:"nickname"`
	Phone     string    `json:"phone"`
	Avatar    string    `json:"avatar"`
	IsAdmin   bool      `json:"is_admin"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Username      string `json:"username"`
	Password      string `json:"password"`
	CaptchaToken  string `json:"captcha_token"`
	CaptchaAnswer string `json:"captcha_answer"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
	Phone    string `json:"phone"`
	SMSCode  string `json:"sms_code"`
}

// 商品分类
type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

// 商品
type Product struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Price         float64   `json:"price"`
	OriginalPrice float64   `json:"original_price"`
	Stock         int       `json:"stock"`
	Image         string    `json:"image"`
	CategoryID    int       `json:"category_id"`
	CategoryName  string    `json:"category_name,omitempty"`
	Sales         int       `json:"sales"`
	IsOnSale      bool      `json:"is_on_sale"`
	CreatedAt     time.Time `json:"created_at"`
}

// 购物车
type CartItem struct {
	ID          int     `json:"id"`
	UserID      int     `json:"user_id"`
	ProductID   int     `json:"product_id"`
	ProductName string  `json:"product_name"`
	Image       string  `json:"image"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
}

// 订单
type Order struct {
	ID           int         `json:"id"`
	OrderNo      string      `json:"order_no"`
	UserID       int         `json:"user_id"`
	TotalAmount  float64     `json:"total_amount"`
	Status       int         `json:"status"`
	StatusText   string      `json:"status_text"`
	ReceiverName string      `json:"receiver_name"`
	Phone        string      `json:"phone"`
	Address      string      `json:"address"`
	Remark       string      `json:"remark"`
	Items        []OrderItem `json:"items,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
}

type OrderItem struct {
	ID           int     `json:"id"`
	ProductID    int     `json:"product_id"`
	ProductName  string  `json:"product_name"`
	ProductImage string  `json:"product_image"`
	Price        float64 `json:"price"`
	Quantity     int     `json:"quantity"`
}

type CreateOrderRequest struct {
	Address      string `json:"address"`
	Phone        string `json:"phone"`
	ReceiverName string `json:"receiver_name"`
	Remark       string `json:"remark"`
}

func StatusText(status int) string {
	switch status {
	case 1:
		return "待付款"
	case 2:
		return "已付款"
	case 3:
		return "已发货"
	case 4:
		return "已完成"
	case 5:
		return "已取消"
	default:
		return "未知"
	}
}

// 评论
type Comment struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	ProductID int       `json:"product_id"`
	Content   string    `json:"content"`
	Rating    int       `json:"rating"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}

type CommentRequest struct {
	ProductID int    `json:"product_id"`
	Content   string `json:"content"`
	Rating    int    `json:"rating"`
}

// 地址
type Address struct {
	ID           int    `json:"id"`
	UserID       int    `json:"user_id"`
	ReceiverName string `json:"receiver_name"`
	Phone        string `json:"phone"`
	Province     string `json:"province"`
	City         string `json:"city"`
	District     string `json:"district"`
	Detail       string `json:"detail"`
	IsDefault    bool   `json:"is_default"`
}

type AddressRequest struct {
	ReceiverName string `json:"receiver_name"`
	Phone        string `json:"phone"`
	Province     string `json:"province"`
	City         string `json:"city"`
	District     string `json:"district"`
	Detail       string `json:"detail"`
	IsDefault    bool   `json:"is_default"`
}

// 管理员用
type AdminUser struct {
	ID           int       `json:"id"`
	Username     string    `json:"username"`
	Nickname     string    `json:"nickname"`
	Phone        string    `json:"phone"`
	Avatar       string    `json:"avatar"`
	IsAdmin      bool      `json:"is_admin"`
	CreatedAt    time.Time `json:"created_at"`
	AddrReceiver string    `json:"addr_receiver"`
	AddrPhone    string    `json:"addr_phone"`
	AddrDetail   string    `json:"addr_detail"`
}

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

type ProductRequest struct {
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	Price         float64 `json:"price"`
	OriginalPrice float64 `json:"original_price"`
	Stock         int     `json:"stock"`
	Image         string  `json:"image"`
	CategoryID    int     `json:"category_id"`
	IsOnSale      bool    `json:"is_on_sale"`
}

// Banner 轮播横幅
type Banner struct {
	ID        int       `json:"id"`
	Image     string    `json:"image"`
	Title     string    `json:"title"`
	Link      string    `json:"link"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}