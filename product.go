package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"mall/backend/database"
	"mall/backend/models"
)

func GetProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := `
		SELECT p.id, p.name, p.description, p.price, p.original_price,
			p.stock, p.image, p.category_id, COALESCE(c.name, '') as cn,
			p.sales, p.is_on_sale
		FROM products p LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.is_on_sale = 1`
	
	var args []interface{}
	q := r.URL.Query()

	if keyword := q.Get("keyword"); keyword != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+keyword+"%")
	}
	if catID := q.Get("category_id"); catID != "" {
		query += " AND p.category_id = ?"
		args = append(args, catID)
	}
	if minPrice := q.Get("min_price"); minPrice != "" {
		query += " AND p.price >= ?"
		args = append(args, minPrice)
	}
	if maxPrice := q.Get("max_price"); maxPrice != "" {
		query += " AND p.price <= ?"
		args = append(args, maxPrice)
	}

	sort := q.Get("sort")
	switch sort {
	case "price_asc":
		query += " ORDER BY p.price ASC"
	case "price_desc":
		query += " ORDER BY p.price DESC"
	case "sales":
		query += " ORDER BY p.sales DESC"
	default:
		query += " ORDER BY p.id DESC"
	}

	rows, err := database.DB.Query(query, args...)
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

func GetProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := strings.TrimPrefix(r.URL.Path, "/api/products/")
	pid, _ := strconv.Atoi(id)

	var p models.Product
	err := database.DB.QueryRow(`
		SELECT p.id, p.name, p.description, p.price, p.original_price,
			p.stock, p.image, p.category_id, COALESCE(c.name, '') as cn,
			p.sales, p.is_on_sale
		FROM products p LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.id = ?`, pid).Scan(
		&p.ID, &p.Name, &p.Description, &p.Price, &p.OriginalPrice,
		&p.Stock, &p.Image, &p.CategoryID, &p.CategoryName, &p.Sales, &p.IsOnSale)
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 404, Message: "商品不存在"})
		return
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: p})
}

func GetCategories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	rows, err := database.DB.Query("SELECT id, name, icon FROM categories ORDER BY id")
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: "查询失败"})
		return
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var c models.Category
		rows.Scan(&c.ID, &c.Name, &c.Icon)
		categories = append(categories, c)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: categories})
}