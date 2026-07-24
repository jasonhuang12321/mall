package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"mall/backend/database"
	"mall/backend/models"
)

func GetComments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	productID := r.URL.Query().Get("product_id")
	if productID == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "缺少商品ID"})
		return
	}

	rows, err := database.DB.Query("SELECT c.id, c.user_id, c.product_id, c.content, c.rating, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.product_id = ? ORDER BY c.id DESC", productID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "查询失败"})
		return
	}
	defer rows.Close()

	comments := []models.Comment{}
	for rows.Next() {
		var cm models.Comment
		rows.Scan(&cm.ID, &cm.UserID, &cm.ProductID, &cm.Content, &cm.Rating, &cm.CreatedAt, &cm.Username)
		comments = append(comments, cm)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: comments})
}

func AddComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")
	if userID == nil {
		json.NewEncoder(w).Encode(models.Response{Code: 401, Message: "未登录"})
		return
	}

	var req models.CommentRequest
	json.NewDecoder(r.Body).Decode(&req)
	if req.Content == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "评论内容不能为空"})
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		req.Rating = 5
	}

	_, err := database.DB.Exec(
		"INSERT INTO comments (user_id, product_id, content, rating) VALUES (?, ?, ?, ?)",
		userID, req.ProductID, req.Content, req.Rating)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "评论失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "评论成功"})
}

func DeleteComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	idStr := strings.TrimPrefix(r.URL.Path, "/api/comments/")
	commentID, _ := strconv.Atoi(idStr)

	_, err := database.DB.Exec("DELETE FROM comments WHERE id = ? AND user_id = ?", commentID, userID)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "删除失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}