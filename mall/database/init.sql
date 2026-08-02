-- 商城数据库初始化脚本

CREATE DATABASE IF NOT EXISTS mall DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mall;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    avatar VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(255) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2) DEFAULT NULL,
    stock INT DEFAULT 0,
    image VARCHAR(500) DEFAULT '',
    category_id INT DEFAULT NULL,
    sales INT DEFAULT 0,
    is_on_sale TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT '0000-00-00 00:00:00',
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 购物车表
CREATE TABLE IF NOT EXISTS cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1:待付款 2:已付款 3:已发货 4:已完成 5:已取消',
    address VARCHAR(500) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    receiver_name VARCHAR(50) DEFAULT '',
    remark VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT '0000-00-00 00:00:00',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_image VARCHAR(500) DEFAULT '',
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认分类
INSERT INTO categories (name, icon) VALUES
('手机数码', '📱'),
('电脑办公', '💻'),
('家用电器', '🏠'),
('服饰鞋包', '👗'),
('食品生鲜', '🍎'),
('图书音像', '📚');

-- 插入示例商品
INSERT INTO products (name, description, price, original_price, stock, image, category_id, sales) VALUES
('iPhone 15 Pro Max', 'Apple 最新旗舰手机，钛金属设计，A17 Pro 芯片', 8999.00, 9999.00, 100, 'https://picsum.photos/seed/iphone15/400/400', 1, 2580),
('华为 Mate 60 Pro', '麒麟芯片回归，卫星通话，超强影像', 6999.00, 7999.00, 80, 'https://picsum.photos/seed/mate60/400/400', 1, 3200),
('MacBook Pro 14英寸', 'M3 Pro 芯片，Liquid Retina XDR 显示屏', 14999.00, 16999.00, 50, 'https://picsum.photos/seed/macbook/400/400', 2, 1200),
('ThinkPad X1 Carbon', '商务旗舰，轻薄便携，第13代酷睿', 9999.00, 11999.00, 30, 'https://picsum.photos/seed/thinkpad/400/400', 2, 890),
('戴森 V15 无线吸尘器', '强劲吸力，激光探测微尘，智能显示', 3999.00, 4999.00, 60, 'https://picsum.photos/seed/dyson/400/400', 3, 1500),
('索尼 WH-1000XM5 降噪耳机', '行业标杆降噪，30小时续航', 2499.00, 2999.00, 120, 'https://picsum.photos/seed/sony/400/400', 1, 4200),
('Nike Air Jordan 1', '经典复刻，潮流必备', 1299.00, 1499.00, 200, 'https://picsum.photos/seed/aj1/400/400', 4, 5600),
('三只松鼠坚果大礼包', '每日坚果，健康零食', 99.00, 149.00, 500, 'https://picsum.photos/seed/nuts/400/400', 5, 8900),
('《三体》全集', '刘慈欣科幻巨著，雨果奖获奖作品', 89.00, 129.00, 300, 'https://picsum.photos/seed/3body/400/400', 6, 15000),
('小米空气净化器 4 Pro', '高效除甲醛，静音运行', 1499.00, 1999.00, 90, 'https://picsum.photos/seed/airpurifier/400/400', 3, 2300);