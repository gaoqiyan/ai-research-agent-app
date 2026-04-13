# ✅ 部署预检清单 - Scheme A 多项目架构

使用此清单验证所有必需的文件和配置已就位。

## 📋 文件完整性检查

### ✅ ai-research-app/ 项目文件

- [x] `Dockerfile` — 多阶段构建
- [x] `docker-compose.yml` — 应用编排
- [x] `.env.production` — 生产配置模板
- [x] `package.json` — 依赖管理
- [x] `next.config.ts` — Next.js 配置（output: standalone）
- [x] `tsconfig.json` — TypeScript 配置
- [x] `postcss.config.js` — PostCSS 配置
- [x] `tailwind.config.ts` — Tailwind 配置
- [x] `auth.config.ts` — NextAuth 配置
- [x] `auth.ts` — NextAuth 工具
- [x] `middleware.ts` — Next.js 中间件
- [x] `app/` — Next.js App Router
- [x] `lib/research/` — AI 研究模块
- [x] `components/` — React 组件
- [x] `types/` — TypeScript 类型定义
- [x] `utils/` — 工具函数
- [x] `styles/` — CSS 样式
- [x] `prisma/` — Database schema
- [x] `public/` — 静态资源

### ✅ shared/nginx/ 基础设施

- [x] `docker-compose.yml` — Nginx 容器编排
- [x] `nginx.conf` — 反向代理配置
- [x] `ssl/` — SSL 证书目录（用于 Let's Encrypt）

### ✅ test-app/ 模板

- [x] `README.md` — 设置说明
- [x] `.env.production.example` — 环境变量模板
- [x] `docker-compose.template.yml` — 编排模板

### ✅ 文档

- [x] `README.md` — 项目总览
- [x] `MULTI_PROJECT_SETUP.md` — 多项目设置指南（新建）
- [x] `docs/mongodb-setup.md` — MongoDB 完整指南（620+ 行）
- [x] `docs/plan/docker-deployment-guide.md` — Docker 部署指南
- [x] `docs/plan/plan-project-structure-refactor.md` — 架构规划

### ✅ 脚本和配置

- [x] `.gitignore` — 多项目 Git 配置
- [x] `deploy-all.sh` — 批量部署脚本

---

## 🔧 环境变量检查

### ✅ ai-research-app/.env.production

需要在部署前填充以下字段：

```
NEXTAUTH_SECRET              待填: openssl rand -base64 32
NEXTAUTH_URL                 待填: https://your-domain.com
MONGODB_URI                  待填: mongodb://user:pass@host:27017/...
DATABASE_URL                 待填: ${MONGODB_URI}
DEEPSEEK_API_KEY             待填: 从 DeepSeek 控制台获取
SERPER_API_KEY               待填: 从 serper.dev 获取
NEXT_PUBLIC_API_URL          待填: https://your-domain.com/api
```

**状态**: ⏳ 需要填充实际值

---

## 🐳 Docker 镜像检查

### Dockerfile 构建验证

```bash
# 验证 Dockerfile 多阶段构建
cd ai-research-app

# 检查构建 (不实际构建，仅检查语法)
docker build --dry-run .
# 或实际构建
docker build -t ai-research-app:latest .
```

**推荐**: ⏳ 部署时执行

---

## 🌐 Nginx 反向代理检查

### 配置验证

```bash
# 验证 nginx.conf 语法
cd shared/nginx
docker run --rm -v $(pwd):/etc/nginx:ro nginx:latest nginx -t
```

**输出应为**: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### 路由配置

- [x] app1 上游已配置 (`upstream app1 { server app-ai-research-app:3000 }`)
- [x] app2 上游已定义 (注释状态，可按需启用)
- [x] 端口 80 配置正确
- [x] 端口 443 配置正确 (SSL 块已定义，待 Let's Encrypt)

---

## 💾 MongoDB 检查

### 连接字符串格式

```
mongodb://USERNAME:PASSWORD@HOST:PORT/DATABASE?authSource=admin&replicaSet=rs0
```

**示例**:
```
mongodb://app1_user:secure_password@mongodb:27017/ai_research_app1?authSource=admin&replicaSet=rs0
```

### ReplicaSet 初始化

需要执行 (参考 docs/mongodb-setup.md)：

```bash
docker exec mongodb mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
```

**状态**: ⏳ 首次部署时执行

---

## 🚀 快速启动检查清单

### Phase 1: 环境准备

- [ ] 编辑 `ai-research-app/.env.production`
- [ ] 生成 NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] 填写 DEEPSEEK_API_KEY
- [ ] 填写 SERPER_API_KEY
- [ ] 确认 MONGODB_URI 正确

### Phase 2: MongoDB 设置

- [ ] 启动 MongoDB 容器 (详见 docs/mongodb-setup.md)
- [ ] 初始化 ReplicaSet
- [ ] 创建应用数据库用户
- [ ] 验证连接: `mongosh "mongodb://..."`

### Phase 3: 构建和启动应用

```bash
cd ai-research-app

# 构建镜像
docker build -t ai-research-app:latest .

# 启动应用
docker compose up -d --build

# 验证运行
docker compose ps
docker compose logs app
```

- [ ] Docker 容器成功启动
- [ ] 应用在 `http://localhost:3000` 可访问
- [ ] 无错误日志输出

### Phase 4: 反向代理设置

```bash
cd shared/nginx

# 验证配置
docker run --rm -v $(pwd):/etc/nginx:ro nginx:latest nginx -t

# 启动 Nginx
docker compose up -d

# 验证反向代理
curl http://localhost
# 应该显示 ai-research-app 的响应
```

- [ ] Nginx 容器运行成功
- [ ] 反向代理正常工作
- [ ] 日志无错误

### Phase 5: 功能验证

- [ ] 登录页面加载正常
- [ ] 认证系统工作
- [ ] 数据库连接正常
- [ ] AI 研究流程可执行

---

## 🔍 故障排查

### 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 容器启动失败 | .env.production 未填 | 填写所有必需的环境变量 |
| MongoDB 连接失败 | ReplicaSet 未初始化 | 执行 rs.initiate() |
| Nginx 访问 502 | 上游服务未运行 | 检查 app1 容器状态 |
| 认证失败 | NEXTAUTH_SECRET 不匹配 | 重新生成和验证 |
| 构建失败 | 依赖版本冲突 | `pnpm install` 后重试 |

详见: [docs/mongodb-setup.md#故障排查](docs/mongodb-setup.md#故障排查)

---

## 📦 扩展检查

### 添加 test-app 时

- [ ] 从 app1 复制应用源代码
- [ ] 更新 docker-compose.yml (项目名、端口)
- [ ] 更新 .env.production (PROJECT_NAME、APP_PORT、MONGO_PASSWORD)
- [ ] 在 shared/nginx/nginx.conf 中启用 app2 块
- [ ] 重启 Nginx: `docker compose up -d`
- [ ] 验证路由: `curl http://localhost -H "Host: app2.example.com"`

---

## 🎯 完成标准

**此清单完成时，部署已就绪：**

✅ 所有必需的文件已创建
✅ 环境变量已填充
✅ MongoDB 已初始化
✅ 应用容器已启动
✅ Nginx 反向代理已配置
✅ 所有服务通过健康检查
✅ 可访问 http://localhost (或自定义域名)

---

**清单版本**: 1.0
**架构方案**: Scheme A - 多项目集合
**最后更新**: 2024-12-20
