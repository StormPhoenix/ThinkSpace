#!/bin/bash

# ThinkSpace Docker 运行脚本
# 使用 docker-compose 启动所有服务

set -e

echo "=========================================="
echo "ThinkSpace Docker 容器启动"
echo "=========================================="

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未找到 Docker，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未找到 Docker Compose，请先安装 Docker Compose"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ 错误: Docker 服务未运行，请先启动 Docker"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  警告: 未找到 .env 文件"
    echo "   正在从 .env.example 创建 .env 文件..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ 已创建 .env 文件，请根据需要修改配置"
    else
        echo "❌ 错误: 未找到 .env.example 文件"
        exit 1
    fi
fi

echo ""
echo "🐳 启动 Docker 容器..."
echo ""

# 使用 docker-compose 启动服务
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

echo ""
echo "⏳ 等待服务启动..."
sleep 5

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📋 服务信息:"
echo "   - 应用地址: http://localhost:3000"
echo "   - MongoDB: localhost:27017"
echo "   - Mongo Express (数据库管理): http://localhost:8081"
echo "     用户名: ${MONGO_EXPRESS_USERNAME:-admin}"
echo "     密码: ${MONGO_EXPRESS_PASSWORD:-pass}"
echo ""
echo "📊 查看日志:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 停止服务:"
echo "   ./scripts/stop.sh"
echo "或"
echo "   docker-compose down"
echo ""
echo "📦 查看运行中的容器:"
if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

