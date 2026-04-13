#!/bin/bash
# ============================================================================
# 多项目部署初始化脚本
# 使用方式：./deploy-all.sh <project-name> [project-name2] ...
# ============================================================================

set -e

PROJECTS=${@:-"ai-research-app"}

echo "🚀 开始多项目部署初始化..."
echo ""

for PROJECT in $PROJECTS; do
  echo "=========================================="
  echo "初始化项目: $PROJECT"
  echo "=========================================="
  
  PROJECT_DIR="/projects/$PROJECT"
  
  if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    continue
  fi
  
  cd "$PROJECT_DIR"
  
  # 1. 复制环境变量模板
  if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.production .env 2>/dev/null || {
      echo "❌ 找不到 .env.production 模板"
      exit 1
    }
    echo "⚠️  请编辑 .env 文件，填写以下内容:"
    echo "   - DEEPSEEK_API_KEY"
    echo "   - SERPER_API_KEY"
    echo "   - AUTH_SECRET (或运行: openssl rand -base64 32)"
    echo "   - MONGO_PASSWORD (强密码)"
    exit 1
  fi
  
  # 2. 启动容器
  echo "🐳 启动 Docker 容器..."
  docker compose up -d --build
  
  # 3. 等待 MongoDB 就绪
  echo "⏳ 等待 MongoDB 就绪..."
  sleep 10
  
  # 4. 初始化数据库
  echo "📊 初始化 Prisma 数据库..."
  docker compose exec app npx prisma db push || {
    echo "⚠️  数据库初始化失败，请手动运行:"
    echo "   docker compose exec app npx prisma db push"
  }
  
  echo "✅ $PROJECT 部署完成"
  echo ""
done

echo "=========================================="
echo "✨ 所有项目部署完成！"
echo "=========================================="
echo ""
echo "🌐 启动共享 Nginx（可选）:"
echo "   cd shared/nginx"
echo "   docker compose up -d"
echo ""
echo "📊 查看容器状态:"
echo "   docker compose ps"
echo ""
echo "📖 查看日志:"
echo "   docker compose logs -f app"
