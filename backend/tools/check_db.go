package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "123456"
	}
	dsn := "root:" + password + "@tcp(127.0.0.1:3306)/mall?charset=utf8mb4&collation=utf8mb4_unicode_ci&parseTime=True&loc=Local"
	fmt.Println("DSN:", dsn)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println("Open error:", err)
		return
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		fmt.Println("Ping error:", err)
		return
	}
	fmt.Println("Ping OK")

	rows, err := db.Query("SHOW TABLES")
	if err != nil {
		fmt.Println("SHOW TABLES error:", err)
		return
	}
	defer rows.Close()

	fmt.Println("Tables:")
	for rows.Next() {
		var name string
		rows.Scan(&name)
		fmt.Println(" -", name)
	}

	rows2, err := db.Query("SELECT id, name, icon FROM categories ORDER BY id")
	if err != nil {
		fmt.Println("Categories query error:", err)
		return
	}
	defer rows2.Close()

	fmt.Println("Categories:")
	count := 0
	for rows2.Next() {
		var id int
		var name, icon string
		rows2.Scan(&id, &name, &icon)
		fmt.Printf("  %d: %s (%s)\n", id, name, icon)
		count++
	}
	fmt.Println("Total:", count)
}