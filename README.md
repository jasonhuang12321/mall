# Java / Spring Boot 电商商城

独立开发的电商系统。后端提供商品、购物车、订单、收藏、评论、地址、轮播图、图片上传和后台订单管理接口，页面放在 `src/main/resources/static`。

## 技术

Java 17、Spring Boot 3.2、Spring Security、JWT、Spring Data JPA、MySQL、Maven

## 运行

1. 安装 JDK 17、Maven、MySQL 8。
2. 打开 `src/main/resources/application.yml`，把数据库密码改成你本机 MySQL 的密码。文件里现在写的是本地默认账号 `root` / `123456`。
3. 在项目根目录执行：

```bash
mvn spring-boot:run
```

4. 浏览器打开 http://localhost:8081 。

注册时的短信验证码没有接真实短信，接口会在返回结果里带上 `debug_code`，只用于本地调试。

## 订单

创建订单使用一个事务：检查库存、写入订单和明细、扣减库存、清空购物车。取消未支付订单时，把对应商品的库存加回去。

登录使用 JWT，密码用 BCrypt 保存。用户接口和管理员接口分开控制。
