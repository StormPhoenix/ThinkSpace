#!/bin/bash

# ThinkSpace Docker 清理脚本
# 清理未使用的镜像、容器和卷

set -e

echo "=========================================="
echo "ThinkSpace Docker 清理"
echo "=========================================="

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未找到 Docker"
    exit 1
fi

echo ""
echo "🧹 开始清理..."

# 停止并移除容器
if command -v docker-compose &> /dev/null; then
    docker-compose down 2>/dev/null || true
else
    docker compose down 2>/dev/null || true
fi

echo ""
read -p "是否删除数据卷？这将删除所有数据库数据！(y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  删除数据卷..."
    if command -v docker-compose &> /dev/null; then
        docker-compose down -v
    else
        docker compose down -v
    fi
else
    echo "ℹ️  保留数据卷"
fi

echo ""
read -p "是否删除 ThinkSpace 镜像？(y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  删除镜像..."
    docker rmi thinkspace:latest 2>/dev/null || true
fi

echo ""
echo "✅ 清理完成！"

