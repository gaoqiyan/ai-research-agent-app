# AI Research Agent App 2 - 示例项目

这是一个示例项目，用于演示多项目部署结构。

## 快速开始

```bash
# 1. 进入项目目录
cd test-app

# 2. 复制并配置环境变量
cp ../.env.example .env
nano .env  # 编辑配置

# 3. 从 ai-research-app 复制完整项目代码（或 git clone）
git clone <repo> . --depth 1

# 4. 安装依赖
pnpm install

# 5. 初始化 docker 容器
docker compose up -d --build

# 6. 初始化数据库
docker compose exec app npx prisma db push
```

## 项目标识

修改 docker-compose.yml 和 .env 中的：
- `PROJECT_NAME=test-app`
- `APP_PORT=3002`（避免与 app1 冲突）
- `MONGO_PASSWORD=` （不要与其他项目共用）

## 更多参考

参见根目录 README.md 和 docs/ 中的部署文档。
