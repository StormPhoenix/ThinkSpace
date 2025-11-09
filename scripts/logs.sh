#!/bin/bash

# ThinkSpace Docker 日志查看脚本

set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未找到 Docker Compose"
    exit 1
fi

# 服务名称（可选参数）
SERVICE_NAME="${1:-}"

echo "=========================================="
echo "ThinkSpace Docker 日志"
echo "=========================================="
echo ""

if [ -z "$SERVICE_NAME" ]; then
    echo "查看所有服务日志 (按 Ctrl+C 退出)..."
    echo ""
    if command -v docker-compose &> /dev/null; then
        docker-compose logs -f
    else
        docker compose logs -f
    fi
else
    echo "查看服务 '$SERVICE_NAME' 的日志 (按 Ctrl+C 退出)..."
    echo ""
    if command -v docker-compose &> /dev/null; then
        docker-compose logs -f "$SERVICE_NAME"
    else
        docker compose logs -f "$SERVICE_NAME"
    fi
fi

