package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	hash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	hashStr := string(hash)

	dsn := "root:" + os.Getenv("DB_PASSWORD") + "@tcp(127.0.0.1:3306)/mall?charset=utf8mb4&parseTime=True"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println("connect error:", err)
		return
	}
	defer db.Close()

	_, err = db.Exec("UPDATE users SET password = ?", hashStr)
	if err != nil {
		fmt.Println("update error:", err)
		return
	}
	fmt.Println("密码已更新为: 123456")
}