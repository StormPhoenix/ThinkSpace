#!/bin/bash

# ThinkSpace Docker 构建脚本
# 用于构建 Docker 镜像

set -e

echo "=========================================="
echo "ThinkSpace Docker 镜像构建"
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

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ 错误: Docker 服务未运行，请先启动 Docker"
    exit 1
fi

# 镜像名称和标签
IMAGE_NAME="thinkspace"
IMAGE_TAG="${1:-latest}"

echo ""
echo "📦 开始构建 Docker 镜像..."
echo "   镜像名称: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

# 构建镜像
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo ""
echo "✅ Docker 镜像构建完成！"
echo ""
echo "镜像信息:"
docker images "${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "使用以下命令运行容器:"
echo "  ./scripts/run.sh"
echo "或使用 docker-compose:"
echo "  docker-compose up -d"

