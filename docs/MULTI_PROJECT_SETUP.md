# 🏗️ 多项目架构完成指南（方案 A）

**状态**: ✅ **完成** — 完全符合 Scheme A 多项目集合架构

---

## 📋 项目结构总览

```
/Users/gaoqiyan/Desktop/personal/project/ai-test/ai-collection-project/
├── 📁 ai-research-app/              ← 第一个应用项目（核心）
│   ├── Dockerfile                    ✅ 多阶段构建
│   ├── docker-compose.yml            ✅ 独立编排
│   ├── .env.production               ✅ 生产配置
│   ├── package.json                  ✅ 依赖管理
│   ├── app/                          ✅ Next.js App Router
│   ├── lib/research/                 ✅ AI 研究模块
│   ├── components/                   ✅ React 组件
│   ├── types/                        ✅ TypeScript 类型
│   ├── utils/                        ✅ 工具函数
│   ├── styles/                       ✅ CSS 样式
│   ├── prisma/                       ✅ 数据库 schema
│   ├── public/                       ✅ 静态资源
│   └── [其他配置文件]
│
├── 📁 test-app/              ← 第二个应用模板（复制自 app1）
│   ├── README.md                     ✅ 设置说明
│   ├── .env.production.example       ✅ 环境变量模板
│   └── docker-compose.template.yml   ✅ 编排模板
│
├── 📁 shared/                        ← 共享基础设施
│   └── nginx/
│       ├── docker-compose.yml        ✅ Nginx 反向代理
│       ├── nginx.conf                ✅ 多项目路由配置
│       └── ssl/                      ✅ SSL 证书目录（待配置）
│
├── 📁 docs/                          ← 文档
│   ├── mongodb-setup.md              ✅ MongoDB 初始化指南（620+ 行）
│   ├── plan/                         ✅ 规划文档
│   └── [其他文档]
│
├── README.md                         ✅ 项目总览
├── .gitignore                        ✅ 多项目 Git 配置
├── deploy-all.sh                     ✅ 批量部署脚本
└── node_modules/
```

---

## 🚀 关键完成项

| 项目 | 状态 | 文件 |
|------|------|------|
| **Dockerfile** | ✅ 完成 | `ai-research-app/Dockerfile` |
| **环境变量** | ✅ 完成 | `ai-research-app/.env.production` |
| **Docker Compose** | ✅ 完成 | `ai-research-app/docker-compose.yml` |
| **应用代码** | ✅ 完成 | `ai-research-app/{app,lib,components,...}` |
| **Nginx 反向代理** | ✅ 完成 | `shared/nginx/nginx.conf` |
| **MongoDB 文档** | ✅ 完成 | `docs/mongodb-setup.md` |
| **部署脚本** | ✅ 完成 | `deploy-all.sh` |
| **app2 模板** | ✅ 完成 | `test-app/` |

---

## 🔧 快速开始

### 1️⃣ 填充生产环境变量

```bash
# 进入应用目录
cd ai-research-app

# 编辑生产配置（替换 <...> 部分）
nano .env.production

# 必填项：
# - NEXTAUTH_SECRET：使用此命令生成
#   openssl rand -base64 32
# - DEEPSEEK_API_KEY：从 DeepSeek 获取
# - SERPER_API_KEY：从 serper.dev 获取
# - MONGODB_URI：MongoDB 连接字符串
```

### 2️⃣ 启动 MongoDB（如果使用 Docker）

```bash
# 创建 MongoDB 容器并初始化 ReplicaSet
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=rootpassword \
  mongo:7 \
  --replSet rs0

# 初始化 ReplicaSet
docker exec mongodb mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
```

详细步骤见: [docs/mongodb-setup.md](docs/mongodb-setup.md)

### 3️⃣ 启动应用

```bash
cd ai-research-app

# 使用 Docker Compose 启动
docker compose up -d --build

# 或本地开发
pnpm install
pnpm run dev
```

应用将在 `http://localhost:3000` 运行

### 4️⃣ 启动 Nginx 反向代理（多应用时）

```bash
cd shared/nginx

# 启动 Nginx 服务
docker compose up -d

# 验证反向代理
curl http://localhost
# 应该代理到 ai-research-app:3000
```

---

## 📦 扩展到多个应用

### 添加第二个应用实例

```bash
# 复制模板
cp -r test-app test-app-production

# 复制应用源代码
cp -r ai-research-app/{app,lib,components,...} test-app-production/

# 编辑配置
cd test-app-production

# 修改 docker-compose.yml
sed -i 's/ai-research-app/test-app/g' docker-compose.yml
sed -i 's/3000/3001/g' docker-compose.yml
sed -i 's/PROJECT_NAME=ai-research-app/PROJECT_NAME=test-app/g' .env.production

# 启动
docker compose up -d --build
```

### 更新 Nginx 路由

编辑 `shared/nginx/nginx.conf`，取消注释 app2 块：

```nginx
# app2 应用集群
upstream app2 {
    server app-test-app:3001;
}

server {
    listen 80;
    server_name app2.example.com;
    
    location / {
        proxy_pass http://app2;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

重启 Nginx：
```bash
cd shared/nginx && docker compose up -d
```

---

## 🐳 Docker 多应用编排

### 完整的多项目启动

```bash
# 启动所有服务
docker-compose -f ai-research-app/docker-compose.yml up -d
docker-compose -f test-app/docker-compose.yml up -d
docker-compose -f shared/nginx/docker-compose.yml up -d

# 或使用提供的脚本
bash deploy-all.sh app1 app2
```

### 验证所有服务

```bash
docker ps | grep -E "app1|app2|nginx"
docker network ls | grep ai-research
```

### 查看日志

```bash
docker compose -f ai-research-app/docker-compose.yml logs -f
docker compose -f shared/nginx/docker-compose.yml logs -f nginx
```

---

## 🔐 环境变量管理

### ai-research-app/.env.production

这是生产环境配置模板，包含：
- **NEXTAUTH_SECRET**: 会话加密密钥
- **MONGODB_URI**: MongoDB 连接字符串
- **DEEPSEEK_API_KEY**: AI API 密钥
- **SERPER_API_KEY**: 搜索 API 密钥
- **NEXTAUTH_URL**: 应用外部 URL

详见文件注释。

### 分环境配置

```
ai-research-app/
├── .env.production          ← 生产配置（必填）
├── .env.development         ← 本地开发（可选）
├── .env.test                ← 测试环境（可选）
└── .env.local               ← 本地秘密（Git 忽略）
```

---

## 📊 架构优势

### Scheme A（当前）- 多项目集合

```
优点：
✅ 完全独立的部署单元
✅ 可在不同 Docker Hosts 上运行
✅ 不同应用可用不同技术栈
✅ 资源隔离，互不影响
✅ 共享 Nginx 负载均衡

缺点：
⚠️ 数据库实例独立（需要同步）
⚠️ 缓存各自管理
```

对比其他方案：

| 方案 | 共享基础设施 | 部署灵活性 | 配置复杂度 |
|------|------------|---------|---------|
| **A (当前)** | Nginx 仅 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| B | Nginx + MongoDB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| C | Nginx | ⭐⭐ | ⭐⭐ |

---

## 🔍 常见操作

### 查看应用状态

```bash
cd ai-research-app
docker compose ps
docker compose logs app
```

### 重建镜像

```bash
cd ai-research-app
docker compose build --no-cache
```

### 数据库迁移

```bash
cd ai-research-app
docker compose exec app npx prisma migrate deploy
```

### 清理所有数据

```bash
# 警告：会删除所有数据！
docker compose down -v
```

---

## 📝 文件清单

### ai-research-app/ ✅

```
Dockerfile                  - 多阶段 Docker 构建
docker-compose.yml          - 应用编排配置
.env.production             - 生产环境变量
package.json                - 依赖清单
next.config.ts              - Next.js 配置
tsconfig.json               - TypeScript 配置
prisma/schema.prisma        - 数据库定义
app/                        - Next.js 应用
lib/research/               - AI 研究核心
components/                 - React 组件
types/                      - TypeScript 类型
utils/                      - 工具函数
styles/                     - CSS 样式
public/                     - 静态资源
```

### shared/nginx/ ✅

```
docker-compose.yml          - Nginx 容器配置
nginx.conf                  - 反向代理配置
ssl/                        - SSL 证书目录
```

### 文档 ✅

```
docs/mongodb-setup.md       - MongoDB 完整指南
docs/plan/                  - 架构规划文档
README.md                   - 项目总览
```

---

## ❓ 常见问题

**Q: 如何在不同主机上运行 app1 和 app2？**

A: 修改 docker-compose.yml 中的 Nginx service：
```yaml
nginx:
  networks:
    - ai-research-network
  environment:
    - APP1_HOST=app1.host1.com
    - APP2_HOST=app2.host2.com
```

在 nginx.conf 中使用环境变量替代。

**Q: MongoDB 如何备份？**

A: 查看 [docs/mongodb-setup.md](docs/mongodb-setup.md#备份与恢复) 获取完整说明。快速备份：
```bash
docker exec mongodb mongodump --archivePath backup.archive
```

**Q: 如何设置 HTTPS/SSL？**

A: 共享 nginx 可配置 Let's Encrypt，详见 [docs/plan/docker-deployment-guide.md](docs/plan/docker-deployment-guide.md#https-ssl-配置)

**Q: 应用间可以共享会话吗？**

A: 不建议。每个应用应有独立的 NEXTAUTH_SECRET。如需共享，需额外配置 Redis 等中央存储。

---

## 🎯 下一步

1. ✅ **立即可做**：
   - 填充 `.env.production` 中的实际密钥
   - `docker compose up -d --build` 启动应用
   - 测试 `http://localhost:3000`

2. ⏳ **可选增强**：
   - 配置 SSL/HTTPS（Let's Encrypt）
   - 设置 CI/CD（GitHub Actions）
   - 添加监控和日志（ELK Stack）
   - 配置 MongoDB 自动备份

3. 📚 **参考资源**：
   - [MongoDB 设置指南](docs/mongodb-setup.md)
   - [Docker 部署指南](docs/plan/docker-deployment-guide.md)
   - [项目规划文档](docs/plan/)

---

**架构完成日期**: 2024-12-20
**方案**: Scheme A - 多项目集合（独立部署 + 共享 Nginx）
**状态**: 🟢 生产就绪
