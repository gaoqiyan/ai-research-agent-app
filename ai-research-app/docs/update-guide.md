# 更新部署 & 排查手册

> 本地改代码 → 构建镜像 → 传到服务器 → 更新容器，以及出问题时怎么排查。
> 所有命令都可以直接复制粘贴。

---

## 一、代码更新部署流程（完整 4 步）

### 第 1 步：本地构建镜像

```bash
cd ~/Desktop/personal/project/ai-test/ai-collection-project/ai-research-app

# 构建 linux/amd64 镜像（适配服务器）
docker build --platform linux/amd64 --no-cache -t myorg/ai-research-app:latest .
```

> **注意**：`--no-cache` 确保每次都用最新代码构建，不会用旧缓存。
> 构建大约需要 3~5 分钟。

### 第 2 步：导出镜像

```bash
docker save myorg/ai-research-app:latest | gzip > /tmp/app-image.tar.gz
```

### 第 3 步：上传到服务器

```bash
scp /tmp/app-image.tar.gz root@47.95.237.247:/opt/
```

### 第 4 步：服务器更新

```bash
ssh root@47.95.237.247

cd /opt/ai-research-app

# 停止旧容器
docker compose -f docker-compose.prod.yml stop app

# 删除旧镜像（确保 load 的是新的）
docker rmi myorg/ai-research-app:latest

# 加载新镜像
docker load < /opt/app-image.tar.gz

# 启动新容器
docker compose -f docker-compose.prod.yml up -d
```

### 一键脚本版（可以保存为 update.sh）

在 Mac 本地创建 `update.sh`：

```bash
#!/bin/bash
set -e

SERVER="root@47.95.237.247"
PROJECT_DIR="$HOME/Desktop/personal/project/ai-test/ai-collection-project/ai-research-app"

echo ">>> 第 1 步：构建镜像..."
cd "$PROJECT_DIR"
docker build --platform linux/amd64 --no-cache -t myorg/ai-research-app:latest .

echo ">>> 第 2 步：导出镜像..."
docker save myorg/ai-research-app:latest | gzip > /tmp/app-image.tar.gz

echo ">>> 第 3 步：上传到服务器..."
scp /tmp/app-image.tar.gz "$SERVER":/opt/

echo ">>> 第 4 步：服务器更新..."
ssh "$SERVER" bash -s <<'REMOTE'
cd /opt/ai-research-app
docker compose -f docker-compose.prod.yml stop app
docker rmi myorg/ai-research-app:latest
docker load < /opt/app-image.tar.gz
docker compose -f docker-compose.prod.yml up -d
echo ">>> 完成！查看状态："
sleep 3
docker compose -f docker-compose.prod.yml ps
REMOTE

echo ">>> 全部完成！"
```

使用方法：

```bash
chmod +x update.sh
./update.sh
```

---

## 二、仅修改环境变量（不改代码）

如果只是改 API Key、密码等配置，**不需要重新构建镜像**：

```bash
ssh root@47.95.237.247
cd /opt/ai-research-app

# 编辑 .env
vi .env
# 按 i 进入编辑模式，修改后按 Esc，输入 :wq 保存

# 重建容器（重新读取 .env）
docker compose -f docker-compose.prod.yml up -d --force-recreate app
```

> **注意**：`restart` 不会重新读取 `.env`，必须用 `--force-recreate`。

验证环境变量是否生效：

```bash
docker compose -f docker-compose.prod.yml exec app env | grep 你要查的变量名
```

---

## 三、排查问题

### 3.1 代码没更新？

**症状**：部署后页面行为和旧版一样，改动没生效。

**排查步骤**：

```bash
# 1. 检查镜像是否是新的（看 CREATED 时间）
docker images myorg/ai-research-app:latest

# 2. 检查容器是否用的新镜像（对比 IMAGE ID）
docker compose -f docker-compose.prod.yml ps -a
docker inspect ai-research-app-app-1 --format='{{.Image}}'

# 3. 如果镜像时间是旧的 → 说明 docker load 没加载新镜像
# 解决：先删旧镜像再 load
docker compose -f docker-compose.prod.yml stop app
docker rmi myorg/ai-research-app:latest
docker load < /opt/app-image.tar.gz
docker compose -f docker-compose.prod.yml up -d

# 4. 如果镜像是新的但行为没变 → 可能浏览器缓存
# 解决：Ctrl+Shift+R 强制刷新浏览器
```

**如果 `docker load` 输出只有 `Loaded image` 没有 `Loading layer`**：

说明镜像内容没变。问题出在 Mac 构建端：

```bash
# Mac 上重新构建，加 --no-cache 禁用缓存
docker build --platform linux/amd64 --no-cache -t myorg/ai-research-app:latest .
```

### 3.2 环境变量没更新？

**症状**：改了 `.env` 但应用还是读的旧值。

```bash
# 1. 确认 .env 文件内容是对的
cat /opt/ai-research-app/.env | grep 变量名

# 2. 确认容器里的环境变量
docker compose -f docker-compose.prod.yml exec app env | grep 变量名

# 3. 如果不一致 → 用 --force-recreate 重建（不是 restart！）
docker compose -f docker-compose.prod.yml up -d --force-recreate app

# 4. 再次验证
docker compose -f docker-compose.prod.yml exec app env | grep 变量名
```

> **关键区别**：
> - `restart` = 重启容器，**不重新读取 `.env`**
> - `up -d --force-recreate` = 销毁旧容器并创建新容器，**会重新读取 `.env`**

### 3.3 容器启动失败 / 不健康？

```bash
# 查看容器状态
docker compose -f docker-compose.prod.yml ps

# 查看应用日志
docker compose -f docker-compose.prod.yml logs --tail=50 app

# 查看 MongoDB 日志
docker compose -f docker-compose.prod.yml logs --tail=50 mongodb

# 直接 curl 测试
curl -s http://localhost:3000
curl -s http://localhost:3000/api/auth/session
```

### 3.4 常见错误速查

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| `Exec format error` | Mac ARM 构建的镜像在 x86 服务器上不兼容 | 构建时加 `--platform linux/amd64` |
| `UntrustedHost` | NextAuth 不信任当前域名 | `auth.config.ts` 中添加 `trustHost: true` |
| `crypto.randomUUID is not a function` | HTTP（非 HTTPS）环境不支持此 API | 使用 `generateId()` 替代 |
| `Authentication Fails, api key invalid` | DeepSeek API Key 错误或过期 | 更新 `.env` 中的 Key，然后 `--force-recreate` |
| `security.keyFile is required` | MongoDB 开启认证 + replica set 需要 keyFile | 使用带 keyFile 的 docker-compose 配置 |
| `MONGO_INITDB_ROOT_USERNAME not set` | `.env` 文件缺少 MongoDB 变量 | 检查 `.env` 是否包含所有必要变量 |
| 容器一直 `Restarting` | 查看日志定位原因 | `docker compose logs --tail=50 服务名` |
| `docker load` 没有 `Loading layer` | 镜像和已有的完全相同 | Mac 端用 `--no-cache` 重新构建 |

### 3.5 进入容器内部排查

```bash
# 进入 app 容器（查看文件、测试连接等）
docker compose -f docker-compose.prod.yml exec app sh

# 在容器内测试 MongoDB 连接
node -e "
  const url = process.env.DATABASE_URL;
  console.log('DATABASE_URL:', url);
"

# 退出容器
exit
```

### 3.6 完全重置（核弹选项）

如果一切都乱了，可以完全清除重来：

```bash
cd /opt/ai-research-app

# 停止所有容器并删除数据卷（会丢失数据库数据！）
docker compose -f docker-compose.prod.yml down -v

# 删除镜像
docker rmi myorg/ai-research-app:latest

# 重新加载镜像
docker load < /opt/app-image.tar.gz

# 重新启动
docker compose -f docker-compose.prod.yml up -d
```

> **警告**：`down -v` 会删除 MongoDB 数据卷，所有用户数据和对话记录会丢失！

---

## 四、快速命令参考

| 场景 | 命令 |
|------|------|
| **改了代码** | Mac: `docker build --platform linux/amd64 --no-cache -t myorg/ai-research-app:latest .` → 导出 → 上传 → 服务器 load + up |
| **改了 .env** | 服务器: `docker compose -f docker-compose.prod.yml up -d --force-recreate app` |
| **查看状态** | `docker compose -f docker-compose.prod.yml ps` |
| **查看日志** | `docker compose -f docker-compose.prod.yml logs --tail=50 app` |
| **检查环境变量** | `docker compose -f docker-compose.prod.yml exec app env \| grep 变量名` |
| **检查镜像时间** | `docker images myorg/ai-research-app:latest` |
| **强制刷新浏览器** | `Ctrl+Shift+R`（Mac: `Cmd+Shift+R`） |
