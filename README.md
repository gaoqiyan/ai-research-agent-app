# 多项目 AI 研究助手集合

> 企业级多项目 Docker 部署架构（方案 C）  
> 支持本地单项目开发 + 线上多项目生产部署

---

## 📁 项目结构

```
/projects (当前目录)
│
├── shared/
│   └── nginx/                      # 共享基础设施
│       ├── docker-compose.yml      # Nginx 容器编排
│       ├── nginx.conf              # 反向代理配置（支持多上游）
│       ├── ssl/                    # SSL 证书存储
│       └── logs/                   # 日志目录
│
├── ai-research-app/               # 项目 1（完整应用）
│   ├── app/                        # Next.js App Router
│   ├── lib/research/               # AI 研究逻辑
│   ├── components/, types/, utils/ # 共享组件
│   ├── Dockerfile                  # 多阶段构建
│   ├── docker-compose.yml          # 应用 + MongoDB（可独立启动）
│   ├── .env.production             # 环境变量模板
│   ├── next.config.ts              # Next.js 配置（standalone 模式）
│   └── prisma/                     # 数据库 schema
│
├── test-app/               # 项目 2（示例/模板）
│   ├── docker-compose.template.yml # 复制作为 docker-compose.yml
│   ├── .env.production.example     # 环境变量示例
│   └── README.md                   # 快速开始
│
├── docs/                           # 文档
│   ├── mongodb-setup.md            # MongoDB 初始化与配置
│   ├── DEPLOYMENT_CHECKLIST.md     # 部署检查清单
│   ├── MULTI_PROJECT_SETUP.md      # 多项目部署指南
│   ├── ARCHITECTURE_REPORT.md      # 架构分析
│   └── plan/                       # 规划文档
│
└── README.md                       # 本文件
```

---

## 🚀 快速开始

### 本地开发（单项目）

每个项目都可以独立启动（包含自己的 MongoDB）：

```bash
# 进入项目目录
cd ai-research-app

# 配置环境变量
cp .env.production .env
nano .env  # 编辑必要的 API keys

# 启动应用（包含 MongoDB）
docker compose up -d --build

# 初始化数据库
docker compose exec app npx prisma db push

# 访问应用
open http://localhost:3000
```

**本地开发的灵活性：**
- 无需 Nginx，直接访问 `:3000`
- MongoDB 包含在项目内，数据文件在 `ai-research-app/` 目录
- 可独立开发/测试

---

### 线上部署（多项目）

多个项目在同一服务器，通过 Nginx 统一入口：

#### **第 1 步：启动项目 1**

```bash
cd ai-research-app

# 配置环境变量
cp .env.production .env
cat >> .env <<EOF
PROJECT_NAME=ai-research-app
APP_PORT=3001
MONGO_PASSWORD=your-secure-mongo-password
DEEPSEEK_API_KEY=sk_...
SERPER_API_KEY=...
AUTH_SECRET=$(openssl rand -base64 32)
EOF

# 启动
docker compose --env-file .env up -d --build
docker compose exec app npx prisma db push
```

#### **第 2 步：启动项目 2（如果需要）**

```bash
# 基于 app1 创建 app2（或使用 test-app 模板）
mkdir -p ai-research-app3
cp -r ai-research-app/* ai-research-app3/

cd ai-research-app3

# 修改为项目 3 的环境变量
cat > .env <<EOF
PROJECT_NAME=ai-research-app3
APP_PORT=3002
MONGO_PASSWORD=another-secure-password
DEEPSEEK_API_KEY=sk_...
SERPER_API_KEY=...
AUTH_SECRET=$(openssl rand -base64 32)
EOF

# 启动
docker compose --env-file .env up -d --build
docker compose exec app npx prisma db push
```

#### **第 3 步：启动共享 Nginx（统一入口）**

```bash
cd shared/nginx

# 编辑 nginx.conf，确保上游配置正确
# upstream app1 { server app-ai-research-app:3000; }
# upstream app3 { server app-ai-research-app3:3000; }

# 启动 Nginx
docker compose up -d

# 验证
curl http://localhost
```

---

## 🔧 配置说明

### 关键环境变量

| 参数 | 本地值 | 线上值 | 说明 |
|------|--------|--------|------|
| `PROJECT_NAME` | ai-research-app | app1,app2,app3... | 项目唯一标识 |
| `APP_PORT` | 3000 | 3001-3010 | 应用端口（避免冲突） |
| `MONGO_PASSWORD` | 任意 | **强密码** 🔐 | 数据库认证 |
| `AUTH_SECRET` | 任意 | 随机生成 🔐 | JWT 密钥（每项独立） |
| `DEEPSEEK_API_KEY` | sk_test_... | sk_live_... | AI API 密钥 |

### 生成安全密钥

```bash
# 生成 AUTH_SECRET
openssl rand -base64 32

# 生成 MONGO_PASSWORD
openssl rand -base64 24

# 或使用 Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📊 部署架构

### 本地单项目

```
Browser (localhost:3000)
        ↓
   ┌─────────┐
   │ App 1   │ ← 3000 端口
   │ Mongo   │ ← 27017 端口（仅本地）
   └─────────┘
```

### 线上多项目

```
外部请求 (example.com:80/443)
        ↓
   ┌────────────┐
   │ Nginx      │ ← 80/443
   ├────┬────┬─┘
   │    │    │
 App1  App2  App3 ← 3001/3002/3003
 │     │     │
Mon1  Mon2  Mon3 ← 内网 27017
```

---

## 🛠️ 常见操作

### 查看日志

```bash
# 实时跟踪应用日志
docker compose logs -f app

# MongoDB 日志
docker compose logs mongodb

# 所有容器
docker compose logs
```

### 进入容器

```bash
# 进入应用容器
docker compose exec app sh

# 进入 MongoDB
docker compose exec mongodb mongosh -u admin -p <password> --authenticationDatabase admin
```

### 数据库操作

```bash
# 备份
docker compose exec mongodb mongodump \
  --uri="mongodb://admin:password@mongodb:27017/?authSource=admin" \
  --out=/data/db/backups/$(date +%Y%m%d)

# 恢复
docker compose exec mongodb mongorestore \
  --uri="mongodb://admin:password@mongodb:27017/?authSource=admin" \
  /data/db/backups/20260413

# 查询
docker compose exec mongodb mongosh -u admin -p <password> --authenticationDatabase admin
# use ai_research
# db.conversations.find().limit(5)
```

### 重启服务

```bash
# 重启应用
docker compose restart app

# 全部重启
docker compose restart

# 完全重建
docker compose down && docker compose up -d --build
```

---

## 🔐 生产环境检查清单

- [ ] `AUTH_SECRET` 已生成并安全保管
- [ ] `MONGO_PASSWORD` 已设置强密码
- [ ] `.env` 已添加到 `.gitignore`
- [ ] MongoDB 认证已启用
- [ ] MongoDB 端口 27017 仅监听本地
- [ ] Nginx 启用了 HTTPS
- [ ] 备份计划已部署
- [ ] 日志监控已配置
- [ ] 定期更新依赖镜像

### 定期备份脚本

```bash
#!/bin/bash
# /projects/backup-all.sh

for PROJECT in ai-research-app test-app; do
  [ ! -d "$PROJECT" ] && continue
  cd "$PROJECT"
  BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  docker compose exec -T mongodb mongodump \
    --uri="mongodb://admin:$MONGO_PASSWORD@mongodb-$PROJECT:27017/?authSource=admin" \
    --out="$BACKUP_DIR"
  cd ..
done

# 删除 7 天前的备份
find . -name "backups" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
```

Cron 定时备份：
```bash
crontab -e
# 每天凌晨 2 点
0 2 * * * /projects/backup-all.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## 📚 详细文档

| 文档 | 说明 |
|------|------|
| [docs/mongodb-setup.md](docs/mongodb-setup.md) | MongoDB 初始化、配置、备份 |
| [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) | 部署检查清单 |
| [docs/MULTI_PROJECT_SETUP.md](docs/MULTI_PROJECT_SETUP.md) | 多项目部署指南 |
| [docs/ARCHITECTURE_REPORT.md](docs/ARCHITECTURE_REPORT.md) | 架构分析 |
| [ai-research-app/docs/plan/docker-deployment-guide.md](ai-research-app/docs/plan/docker-deployment-guide.md) | Docker 部署 |

---

## 🐛 故障排查

### 应用无法启动

```bash
# 查看日志
docker compose logs app

# 常见原因：
# 1. MongoDB 未就绪 → 等待 mongo-init 完成
# 2. 环境变量缺失 → 检查 .env 文件
# 3. 数据库 schema 初始化失败 → 运行 `docker compose exec app npx prisma db push`
```

### MongoDB 连接失败

```bash
# 检查状态
docker compose ps

# 手动连接测试
docker compose exec mongodb mongosh -u admin -p <password> --authenticationDatabase admin

# 查看 ReplicaSet 状态
# rs.status()
```

### 端口冲突

```bash
# 查看端口占用
lsof -i :3001

# 修改 .env 中的 APP_PORT，重启
docker compose down && docker compose up -d --build
```

---

## 💡 工作流

### 开发者

```bash
cd ai-research-app
docker compose up -d
# 修改代码...热加载自动生效
git add . && git commit -m "feat: ..." && git push
```

### DevOps

```bash
# 部署 app1
cd ai-research-app && docker compose --env-file .env up -d --build

# 部署 app2
cd ../test-app && docker compose --env-file .env up -d --build

# 重启 Nginx
cd ../shared/nginx && docker compose restart

# 验证
for port in 3001 3002; do
  echo "Port $port:"; curl -s http://localhost:$port/api/health
done
```

---

**有问题？** 查看 [docs/](docs/) 目录中的详细文档。
