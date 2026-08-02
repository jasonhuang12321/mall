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

	keyword := r.URL.Query().Get("keyword")
	minPrice := r.URL.Query().Get("min_price")
	maxPrice := r.URL.Query().Get("max_price")
	categoryID := r.URL.Query().Get("category_id")
	sortBy := r.URL.Query().Get("sort")

	query := `SELECT p.id, p.name, p.description, p.price, p.original_price,
		p.stock, p.image, p.category_id, COALESCE(c.name, '') as cn,
		p.sales, p.is_on_sale
		FROM products p LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.is_on_sale = 1`
	args := []interface{}{}

	if keyword != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+keyword+"%")
	}
	if categoryID != "" {
		query += " AND p.category_id = ?"
		args = append(args, categoryID)
	}
	if minPrice != "" {
		query += " AND p.price >= ?"
		args = append(args, minPrice)
	}
	if maxPrice != "" {
		query += " AND p.price <= ?"
		args = append(args, maxPrice)
	}

	switch sortBy {
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
	rows, err := database.DB.Query("SELECT id, name FROM categories ORDER BY id")
	if err != nil {
		json.NewEncoder(w).Encode(models.Response{Code: 500, Message: err.Error()})
		return
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var c models.Category
		rows.Scan(&c.ID, &c.Name)
		categories = append(categories, c)
	}
	json.NewEncoder(w).Encode(models.Response{Code: 200, Message: "success", Data: categories})
}