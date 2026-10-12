-- 电商系统数据库表结构

CREATE DATABASE IF NOT EXISTS ecommerce DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecommerce;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT 'USER / ADMIN',
    avatar VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 商品分类表
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    sales INT NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    category_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'ON' COMMENT 'ON / OFF',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- 评论表
CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    rating INT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- 购物车表
CREATE TABLE IF NOT EXISTS cart_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- 收货地址表
CREATE TABLE IF NOT EXISTS addresses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    receiver_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    detail VARCHAR(255) NOT NULL,
    is_default TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    address_id BIGINT,
    receiver_name VARCHAR(50),
    phone VARCHAR(20),
    address_detail VARCHAR(500),
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / PAID / SHIPPED / COMPLETED / CANCELLED',
    remark VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (address_id) REFERENCES addresses(id)
) ENGINE=InnoDB;

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- 轮播图 Banner 表
CREATE TABLE IF NOT EXISTS banners (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    image VARCHAR(500),
    title VARCHAR(200),
    link VARCHAR(500),
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 插入默认管理员 (密码: admin123)
INSERT INTO users (username, password, nickname, role) VALUES
('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5Eh', '管理员', 'ADMIN');

-- 插入示例分类
INSERT INTO categories (name) VALUES ('电子产品'), ('服装'), ('食品'), ('家居用品');

-- 插入示例商品
INSERT INTO products (name, description, price, original_price, sales, stock, image_url, category_id, status) VALUES
('iPhone 15', 'Apple iPhone 15 128GB 5G手机', 5999.00, 6999.00, 156, 100, 'https://picsum.photos/seed/iphone/400/400', 1, 'ON'),
('MacBook Pro', 'Apple MacBook Pro 14寸 M3芯片 16GB+512GB', 12999.00, 14999.00, 89, 50, 'https://picsum.photos/seed/macbook/400/400', 1, 'ON'),
('纯棉T恤', '男士纯棉圆领短袖T恤 舒适透气', 99.00, 129.00, 520, 500, 'https://picsum.photos/seed/tshirt/400/400', 2, 'ON'),
('休闲牛仔裤', '男士直筒休闲牛仔裤 经典百搭', 199.00, 259.00, 312, 300, 'https://picsum.photos/seed/jeans/400/400', 2, 'ON'),
('坚果礼盒', '每日坚果混合装 750g 6种坚果', 89.00, 119.00, 203, 200, 'https://picsum.photos/seed/nuts/400/400', 3, 'ON'),
('有机牛奶', '进口有机纯牛奶 1L*6瓶 高钙低脂', 69.00, 89.00, 167, 150, 'https://picsum.photos/seed/milk/400/400', 3, 'ON'),
('简约台灯', 'LED护眼台灯 三档调光 无频闪', 149.00, 199.00, 245, 80, 'https://picsum.photos/seed/lamp/400/400', 4, 'ON'),
('记忆棉枕头', '慢回弹记忆棉护颈枕 人体工学设计', 129.00, 169.00, 178, 120, 'https://picsum.photos/seed/pillow/400/400', 4, 'ON');