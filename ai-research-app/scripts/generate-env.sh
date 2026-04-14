#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "生成 .env.production 模板（在当前目录：$ROOT_DIR）"

read -p "请输入 MongoDB 管理用户名 (默认: ai_admin): " MONGO_USER
MONGO_USER=${MONGO_USER:-ai_admin}

read -p "是否自动生成强随机密码？(Y/n): " genpw
genpw=${genpw:-Y}
if [[ "$genpw" =~ ^[Yy] ]]; then
  if command -v openssl >/dev/null 2>&1; then
    MONGO_PWD=$(openssl rand -base64 32)
  elif command -v pwgen >/dev/null 2>&1; then
    MONGO_PWD=$(pwgen -s 32 1)
  else
    echo "未找到 openssl 或 pwgen，请输入自定义密码："
    read -s -p "密码: " MONGO_PWD
    echo
  fi
else
  read -s -p "请输入密码: " MONGO_PWD
  echo
fi

read -p "请输入应用端口 (默认: 3000): " APP_PORT
APP_PORT=${APP_PORT:-3000}

read -p "请输入镜像名 (默认: myorg/ai-research-app): " IMAGE
IMAGE=${IMAGE:-myorg/ai-research-app}

read -p "请输入镜像 tag (默认: latest): " APP_TAG
APP_TAG=${APP_TAG:-latest}

read -p "请输入 NEXTAUTH_URL (默认: https://your.domain): " NEXTAUTH_URL
NEXTAUTH_URL=${NEXTAUTH_URL:-https://your.domain}

# URL-encode password for DATABASE_URL
if command -v python3 >/dev/null 2>&1; then
  ENC_PWD=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$MONGO_PWD")
else
  # fallback: simple replacement for common chars
  ENC_PWD=$(echo -n "$MONGO_PWD" | sed -e 's/@/%40/g' -e 's/:/%3A/g' -e 's/\//%2F/g')
fi

AUTH_SECRET=$(openssl rand -hex 32 || true)

cat > .env.production <<EOF
# Production environment for ai-research-app (generated)
APP_PORT=$APP_PORT
APP_TAG=$APP_TAG
IMAGE=$IMAGE
NODE_ENV=production

MONGO_INITDB_ROOT_USERNAME=$MONGO_USER
MONGO_INITDB_ROOT_PASSWORD=$MONGO_PWD
DATABASE_URL="mongodb://${MONGO_USER}:${ENC_PWD}@mongodb:27017/ai_research?authSource=admin&replicaSet=rs0"

AUTH_SECRET=$AUTH_SECRET
NEXTAUTH_URL=$NEXTAUTH_URL

NEXT_PUBLIC_EXAMPLE_KEY=
EOF

chmod 600 .env.production

echo "已生成 .env.production（路径：$ROOT_DIR/.env.production）"
echo "请妥善保存密码："
echo "  用户名: $MONGO_USER"
echo "  密码: $MONGO_PWD"

echo
echo "下一步：运行部署脚本或 docker compose："
echo "  ./deploy-prod.sh  # 或： docker compose -f docker-compose.prod.yml up -d --build"
