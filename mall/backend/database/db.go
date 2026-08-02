package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
	"mall/backend/config"
)

var DB *sql.DB

func Init(cfg *config.Config) {
	var err error
	DB, err = sql.Open("mysql", cfg.DSN())
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(10)

	if err = DB.Ping(); err != nil {
		fmt.Printf("警告: 数据库 Ping 失败: %v（将使用内存数据运行）\n", err)
	} else {
		log.Println("数据库连接成功")
	}
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}