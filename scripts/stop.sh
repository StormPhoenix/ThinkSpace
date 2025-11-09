#!/bin/bash

# ThinkSpace Docker 停止脚本
# 停止并移除所有容器

set -e

echo "=========================================="
echo "ThinkSpace Docker 容器停止"
echo "=========================================="

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未找到 Docker Compose"
    exit 1
fi

echo ""
echo "🛑 停止 Docker 容器..."

# 停止并移除容器
if command -v docker-compose &> /dev/null; then
    docker-compose down
else
    docker compose down
fi

echo ""
echo "✅ 容器已停止并移除"
echo ""
echo "💡 提示:"
echo "   - 数据卷已保留，数据不会丢失"
echo "   - 如需删除数据卷，请使用: docker-compose down -v"

