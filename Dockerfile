# 第一阶段：编译 Go 二进制
FROM golang:1.23-alpine AS builder

WORKDIR /build

# 复制依赖文件
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# 复制源代码
COPY backend/ ./

# 交叉编译为 Linux amd64
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o mall .

# 第二阶段：运行镜像
FROM alpine:3.20

# 安装 ca-certificates 用于 HTTPS 请求
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai

# 创建目录结构：二进制在 /app/，前端在 /frontend/
RUN mkdir -p /app /frontend

# 复制二进制文件
COPY --from=builder /build/mall /app/mall

# 复制前端静态文件
COPY frontend/ /frontend/

# 复制部署用的数据库初始化脚本
COPY deploy/init.sql /init.sql

# 上传目录
RUN mkdir -p /app/uploads

WORKDIR /app

EXPOSE 8080

CMD ["./mall"]