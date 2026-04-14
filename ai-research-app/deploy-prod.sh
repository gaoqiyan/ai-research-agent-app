#!/usr/bin/env bash
set -euo pipefail

# 简单部署脚本：支持两种模式
# 1) 使用镜像仓库：设置 IMAGE 和 APP_TAG，脚本会 pull 并启动
# 2) 本地构建：设置 USE_LOCAL_BUILD=1，会在服务器上本地构建并启动

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE=docker-compose.prod.yml

echo "Deploying ai-research-app from $COMPOSE_FILE"

if [ "${USE_LOCAL_BUILD:-0}" != "0" ]; then
  echo "Building local image..."
  docker build -t "${IMAGE:-myorg/ai-research-app}:${APP_TAG:-latest}" -f Dockerfile .
fi

echo "Pulling images (if available)..."
docker compose -f "$COMPOSE_FILE" pull || true

echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Prisma: generating client and applying push (inside app container)..."
# 如果使用镜像化部署且镜像内包含 prisma client 生成步骤，可以跳过；否则在容器内运行
if docker compose -f "$COMPOSE_FILE" ps --services | grep -q "app"; then
  docker compose -f "$COMPOSE_FILE" exec -T app sh -c "npx prisma generate || true"
fi

echo "Deployment finished. Check logs with: docker compose -f $COMPOSE_FILE logs -f"
