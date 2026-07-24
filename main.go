package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"mall/backend/config"
	"mall/backend/database"
	"mall/backend/handlers"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := r.Header.Get("X-User-Id")
		if userIDStr != "" {
			userID, _ := strconv.Atoi(userIDStr)
			ctx := context.WithValue(r.Context(), "user_id", userID)
			r = r.WithContext(ctx)
		}
		next(w, r)
	}
}

func main() {
	cfg := config.Load()
	database.Init(cfg)
	defer database.Close()

	mux := http.NewServeMux()

	// 商品相关
	mux.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/products" {
			handlers.GetProducts(w, r)
		} else {
			handlers.GetProduct(w, r)
		}
	})
	mux.HandleFunc("/api/categories", handlers.GetCategories)

	// 用户相关
	mux.HandleFunc("/api/register", handlers.Register)
	mux.HandleFunc("/api/login", handlers.Login)
	mux.HandleFunc("/api/captcha", handlers.GetCaptcha)
	mux.HandleFunc("/api/sms/send", handlers.SendSMS)
	mux.HandleFunc("/api/user/info", handlers.GetUserInfo)
	mux.HandleFunc("/api/user/change-password", authMiddleware(handlers.ChangePassword))

	// 购物车
	mux.HandleFunc("/api/cart", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			authMiddleware(handlers.GetCart)(w, r)
		case "POST":
			authMiddleware(handlers.AddToCart)(w, r)
		case "PUT":
			authMiddleware(handlers.UpdateCartItem)(w, r)
		case "DELETE":
			authMiddleware(handlers.RemoveFromCart)(w, r)
		}
	})
	mux.HandleFunc("/api/cart/clear", authMiddleware(handlers.ClearCart))

	// 订单
	mux.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			authMiddleware(handlers.CreateOrder)(w, r)
		} else {
			authMiddleware(handlers.GetOrders)(w, r)
		}
	})
	mux.HandleFunc("/api/orders/", func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/cancel") {
			authMiddleware(handlers.CancelOrder)(w, r)
		} else {
			authMiddleware(handlers.GetOrderDetail)(w, r)
		}
	})

	// 评论
	mux.HandleFunc("/api/comments", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			authMiddleware(handlers.AddComment)(w, r)
		} else {
			handlers.GetComments(w, r)
		}
	})
	mux.HandleFunc("/api/comments/", authMiddleware(handlers.DeleteComment))

	// 地址
	mux.HandleFunc("/api/addresses", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			authMiddleware(handlers.GetAddresses)(w, r)
		case "POST":
			authMiddleware(handlers.AddAddress)(w, r)
		}
	})
	mux.HandleFunc("/api/addresses/", func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/default") {
			authMiddleware(handlers.SetDefaultAddress)(w, r)
		} else if r.Method == "PUT" {
			authMiddleware(handlers.UpdateAddress)(w, r)
		} else if r.Method == "DELETE" {
			authMiddleware(handlers.DeleteAddress)(w, r)
		}
	})

	// 管理员
	mux.HandleFunc("/api/admin/products", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.AdminAddProduct(w, r)
		} else {
			handlers.AdminGetProducts(w, r)
		}
	})
	mux.HandleFunc("/api/admin/products/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			handlers.AdminUpdateProduct(w, r)
		} else {
			handlers.AdminDeleteProduct(w, r)
		}
	})
	mux.HandleFunc("/api/admin/users", handlers.AdminGetUsers)
	mux.HandleFunc("/api/admin/users/", handlers.AdminDeleteUser)
	mux.HandleFunc("/api/admin/orders", handlers.AdminGetOrders)
	mux.HandleFunc("/api/admin/orders/", handlers.AdminUpdateOrderStatus)

	// 静态文件 - 优先使用环境变量 FRONTEND_PATH，否则自动定位
	frontendPath := os.Getenv("FRONTEND_PATH")
	if frontendPath == "" {
		execPath, _ := os.Executable()
		execDir := filepath.Dir(execPath)
		frontendPath = filepath.Join(execDir, "..", "frontend")
	}
	fs := http.FileServer(http.Dir(frontendPath))
	mux.Handle("/", fs)

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("商城服务启动: http://localhost%s", addr)
	if err := http.ListenAndServe(addr, corsMiddleware(mux)); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}