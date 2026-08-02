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
	pidStr := r.URL.Query().Get("product_id")
	pid, _ := strconv.Atoi(pidStr)

	rows, err := database.DB.Query(`
		SELECT id, product_id, user_id, username, content, rating, created_at
		FROM comments WHERE product_id = ? ORDER BY id DESC`, pid)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
		return
	}
	defer rows.Close()

	comments := []models.Comment{}
	for rows.Next() {
		var c models.Comment
		rows.Scan(&c.ID, &c.ProductID, &c.UserID, &c.Username, &c.Content, &c.Rating, &c.CreatedAt)
		comments = append(comments, c)
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

	var req struct {
		ProductID int    `json:"product_id"`
		Content   string `json:"content"`
		Rating    int    `json:"rating"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "参数错误"})
		return
	}
	if req.Content == "" {
		json.NewEncoder(w).Encode(models.Response{Code: 400, Message: "评论内容不能为空"})
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		req.Rating = 5
	}

	// 获取用户名
	var username string
	database.DB.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)

	_, err := database.DB.Exec(`
		INSERT INTO comments (product_id, user_id, username, content, rating)
		VALUES (?, ?, ?, ?, ?)`,
		req.ProductID, userID, username, req.Content, req.Rating)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "评论失败"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "评论成功"})
}

func DeleteComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("user_id")

	var cid int
	path := strings.TrimPrefix(r.URL.Path, "/api/comments/")
	_ = path
	_ = cid
	_ = userID

	database.DB.Exec("DELETE FROM comments WHERE id = ? AND user_id = ?", cid, userID)
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "删除成功"})
}