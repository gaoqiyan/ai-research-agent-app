# AI Research App 部署指南（傻瓜教程）

> 本教程手把手教你把 ai-research-app 部署到一台远程 Linux 服务器上。
> 全程复制粘贴命令即可，不需要额外知识。

---

## 你需要准备什么

在开始之前，确认你手上有这些东西：

| 序号 | 准备项 | 说明 |
|------|--------|------|
| 1 | 一台 Linux 服务器 | 推荐 Ubuntu 22.04/24.04，最低配置 2C4G，需要有公网 IP |
| 2 | 服务器的 SSH 登录信息 | 用户名 + IP + 密码 或 SSH 密钥 |
| 3 | DeepSeek API Key | 去 [platform.deepseek.com](https://platform.deepseek.com) 注册获取 |
| 4 | Serper API Key | 去 [serper.dev](https://serper.dev) 注册获取 |
| 5 | （可选）一个域名 | 如果你想用 `https://your-domain.com` 访问 |

---

## 总览

整个部署只有 5 步：

```
第 1 步：服务器装 Docker
第 2 步：把项目代码传到服务器
第 3 步：生成配置文件
第 4 步：构建并启动
第 5 步：验证能不能访问
```

预计耗时：**20~30 分钟**（大部分时间在等待下载和构建）

---

## 第 1 步：在服务器上安装 Docker

### 1.1 用 SSH 登录服务器

打开你的终端（Mac 用自带终端，Windows 用 PowerShell），输入：

```bash
ssh root@你的服务器IP
```

例如：

```bash
ssh root@123.45.67.89
```

输入密码后回车，看到命令行提示符变了，说明登录成功。

### 1.2 安装 Docker

逐行复制粘贴以下命令：

```bash
# 一键安装 Docker（官方脚本，适用于大部分 Linux）
curl -fsSL https://get.docker.com | sh
```

等它跑完（大约 1~2 分钟），然后验证：

```bash
docker --version
docker compose version
```

看到版本号就说明安装成功，类似这样：

```
Docker version 27.x.x, build xxxxxxx
Docker Compose version v2.x.x
```

> 如果 `docker compose version` 报错，说明你的 Docker 版本太老，运行：
> ```bash
> apt update && apt install -y docker-compose-plugin
> ```

### 1.3 启动 Docker（如果没有自动启动）

```bash
systemctl start docker
systemctl enable docker
```

---

## 第 2 步：把项目代码传到服务器

### 2.1 在服务器上创建目录

在服务器上运行：

```bash
mkdir -p /opt/ai-research-app
```

### 2.2 从你的 Mac 上传文件

**回到你的 Mac 终端**（新开一个终端窗口），进入项目目录：

```bash
cd ~/Desktop/personal/project/ai-test/ai-collection-project/ai-research-app
```

把整个项目传到服务器：

```bash
# 把 "root" 换成你的用户名，把 "123.45.67.89" 换成你的服务器 IP
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.env.local' \
  ./ root@123.45.67.89:/opt/ai-research-app/
```

> **说明**：`rsync` 会排除 `node_modules` 和 `.next` 这些不需要传的大文件夹。
> 如果没有 `rsync`，也可以用 `scp`：
> ```bash
> # 先在本地打包（排除不需要的目录）
> tar czf /tmp/ai-research-app.tar.gz \
>   --exclude='node_modules' --exclude='.next' --exclude='.env.local' .
> 
> # 传到服务器
> scp /tmp/ai-research-app.tar.gz root@123.45.67.89:/opt/
> 
> # 登录服务器解压
> ssh root@123.45.67.89
> mkdir -p /opt/ai-research-app
> tar xzf /opt/ai-research-app.tar.gz -C /opt/ai-research-app
> ```

---

## 第 3 步：生成配置文件

### 3.1 登录服务器并进入项目目录

```bash
ssh root@123.45.67.89
cd /opt/ai-research-app
```

### 3.2 运行配置生成脚本

```bash
bash scripts/generate-env.sh
```

脚本会一步一步问你问题，按照下面这样填：

```
请输入 MongoDB 管理用户名 (默认: ai_admin): 
👉 直接回车用默认的就行

是否自动生成强随机密码？(Y/n): 
👉 输入 Y 回车（会自动生成一个安全密码）

请输入应用端口 (默认: 3000): 
👉 直接回车用 3000，或者输入你想要的端口号

请输入镜像名 (默认: myorg/ai-research-app): 
👉 直接回车

请输入镜像 tag (默认: latest): 
👉 直接回车

请输入 NEXTAUTH_URL (默认: https://your.domain): 
👉 如果有域名就输入 https://your-domain.com
👉 如果没有域名就输入 http://你的服务器IP:3000

请输入 DEEPSEEK_API_KEY: 
👉 粘贴你的 DeepSeek API Key

请输入 SERPER_API_KEY: 
👉 粘贴你的 Serper API Key
```

脚本结束后会显示：

```
已生成 .env.production
请妥善保存密码：
  用户名: ai_admin
  密码: xxxxxxxxxxxxx     <-- 把这个密码记下来！
```

> **重要**：把显示的用户名和密码保存到安全的地方，以后维护数据库要用。

### 3.3 确认配置文件已生成

```bash
cat .env.production
```

检查里面的值都填好了，特别是 `DEEPSEEK_API_KEY` 和 `SERPER_API_KEY` 不为空。

---

## 第 4 步：构建并启动

### 4.1 构建 Docker 镜像

这一步会在服务器上编译项目，需要等几分钟：

```bash
cd /opt/ai-research-app
USE_LOCAL_BUILD=1 bash deploy-prod.sh
```

你会看到类似这样的输出：

```
Deploying ai-research-app from docker-compose.prod.yml
Building local image...
[+] Building ...
 => [deps 1/4] FROM docker.io/library/node:20-alpine ...
 => [deps 2/4] RUN npm install -g pnpm@latest ...
 => [deps 3/4] COPY package.json pnpm-lock.yaml ...
 => [deps 4/4] RUN apk add ... pnpm install ...
 => [builder 1/4] ...
 ...
Starting services...
[+] Running 4/4
 ✔ Network ... Created
 ✔ Container mongodb ... Started
 ✔ Container mongo-init ... Started
 ✔ Container app ... Started
Deployment finished.
```

> **构建过程大约需要 3~8 分钟**，取决于服务器性能和网速。
> 如果第一次拉取 `node:20-alpine` 和 `mongo:7` 镜像会比较慢，请耐心等待。

### 4.2 如果构建失败了怎么办

**常见问题 1：内存不足**
```
The build process was killed (possible OOM)
```
解决：服务器内存太小（至少需要 2GB），可以添加 swap：
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
# 然后重新运行 USE_LOCAL_BUILD=1 bash deploy-prod.sh
```

**常见问题 2：网络超时**
```
failed to fetch ... timeout
```
解决：重新运行命令，Docker 会从断点继续：
```bash
USE_LOCAL_BUILD=1 bash deploy-prod.sh
```

---

## 第 5 步：验证部署

### 5.1 检查容器是否都在运行

```bash
docker compose -f docker-compose.prod.yml ps
```

正常应该看到：

```
NAME        SERVICE    STATUS
app         app        Up (healthy)
mongodb     mongodb    Up
mongo-init  mongo-init Exited (0)     <-- 这个退出是正常的，它只运行一次
```

> 关键：`app` 状态是 `Up (healthy)`，`mongodb` 状态是 `Up`。
> `app` 刚启动时可能显示 `Up (health: starting)`，等 40 秒后会变成 `healthy`。

### 5.2 查看应用日志

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

看到类似 `Ready in ...` 或 `Listening on 0.0.0.0:3000` 就说明应用启动成功。

按 `Ctrl + C` 退出日志。

### 5.3 访问应用

打开浏览器，输入：

```
http://你的服务器IP:3000
```

你应该能看到登录页面！

> **如果打不开**，检查服务器防火墙是否放行了 3000 端口：
> ```bash
> # Ubuntu/Debian
> ufw allow 3000
> 
> # CentOS/RHEL
> firewall-cmd --add-port=3000/tcp --permanent
> firewall-cmd --reload
> ```
> 
> 同时检查你的云服务商（阿里云/腾讯云/AWS）**安全组**是否放行了 3000 端口的入站规则。

---

## 第 6 步（可选）：配置域名 + HTTPS

如果你有域名，可以配置 Nginx 反向代理 + 免费 SSL 证书。

### 6.1 安装 Nginx 和 Certbot

```bash
apt update
apt install -y nginx certbot python3-certbot-nginx
```

### 6.2 配置 Nginx

```bash
cat > /etc/nginx/sites-available/ai-research <<'EOF'
server {
    listen 80;
    server_name your-domain.com;    # <-- 换成你的域名

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

启用配置：

```bash
ln -sf /etc/nginx/sites-available/ai-research /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t          # 检查配置是否正确
systemctl reload nginx
```

### 6.3 申请 SSL 证书（免费）

```bash
certbot --nginx -d your-domain.com    # <-- 换成你的域名
```

按提示输入邮箱、同意条款即可，Certbot 会自动配置 HTTPS。

完成后，通过 `https://your-domain.com` 访问。

### 6.4 更新 NEXTAUTH_URL

如果你配了域名，需要更新配置：

```bash
cd /opt/ai-research-app

# 编辑 .env.production，把 NEXTAUTH_URL 改成你的域名
nano .env.production
# 找到 NEXTAUTH_URL=... 改成 NEXTAUTH_URL=https://your-domain.com

# 重启应用使配置生效
docker compose -f docker-compose.prod.yml restart app
```

---

## 日常运维命令速查表

在服务器上，进入 `/opt/ai-research-app` 目录后：

| 操作 | 命令 |
|------|------|
| 查看所有容器状态 | `docker compose -f docker-compose.prod.yml ps` |
| 查看应用日志 | `docker compose -f docker-compose.prod.yml logs -f app` |
| 查看 MongoDB 日志 | `docker compose -f docker-compose.prod.yml logs -f mongodb` |
| 重启应用 | `docker compose -f docker-compose.prod.yml restart app` |
| 停止所有服务 | `docker compose -f docker-compose.prod.yml down` |
| 停止并删除数据 | `docker compose -f docker-compose.prod.yml down -v`（**慎用！会删除数据库**）|
| 重新构建并启动 | `USE_LOCAL_BUILD=1 bash deploy-prod.sh` |

---

## 更新部署（新版本上线）

当你在本地修改了代码，想更新到服务器上：

### 方式一：在服务器上重新构建（推荐）

```bash
# 1. 在本地（你的 Mac）同步代码到服务器
cd ~/Desktop/personal/project/ai-test/ai-collection-project/ai-research-app
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.env.local' --exclude '.env.production' \
  ./ root@123.45.67.89:/opt/ai-research-app/

# 2. 登录服务器重新构建
ssh root@123.45.67.89
cd /opt/ai-research-app
USE_LOCAL_BUILD=1 bash deploy-prod.sh
```

### 方式二：本地构建镜像再传输（Mac M 系列芯片请用此方式）

```bash
# 在本地构建 linux/amd64 镜像（适配大部分服务器）
cd ~/Desktop/personal/project/ai-test/ai-collection-project/ai-research-app
docker build --platform linux/amd64 -t ai-research-app:latest .

# 导出并传输
docker save ai-research-app:latest | gzip > /tmp/ai-research-app.tar.gz
scp /tmp/ai-research-app.tar.gz root@123.45.67.89:/opt/

# 在服务器上加载并重启
ssh root@123.45.67.89
docker load < /opt/ai-research-app.tar.gz
cd /opt/ai-research-app
docker compose -f docker-compose.prod.yml up -d
```

---

## 常见问题 FAQ

### Q: 页面打开是白屏 / 500 错误

查看应用日志定位问题：
```bash
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

常见原因：
- `.env.production` 中的 API Key 为空 → 填写正确的 Key 后重启
- MongoDB 还没初始化完 → 等 30 秒后刷新

### Q: 注册/登录不了

```bash
# 检查 MongoDB 是否正常运行
docker compose -f docker-compose.prod.yml logs mongodb
```

如果看到认证相关错误，检查 `.env.production` 中的 `DATABASE_URL` 里的用户名密码是否和 `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` 一致。

### Q: 研究功能没结果

检查 AI 相关的 API Key 是否正确配置：
```bash
grep 'DEEPSEEK_API_KEY\|SERPER_API_KEY' .env.production
```

确保两个 Key 都有值且正确。

### Q: Mac M 系列芯片本地构建的镜像在服务器上跑不了

Mac M1/M2/M3/M4 默认构建 arm64 镜像，x86 服务器无法运行。
解决：构建时指定平台：
```bash
docker build --platform linux/amd64 -t ai-research-app:latest .
```

### Q: 怎么备份数据库

```bash
cd /opt/ai-research-app

# 备份
docker compose -f docker-compose.prod.yml exec mongodb \
  mongodump --uri="mongodb://ai_admin:你的密码@localhost:27017/ai_research?authSource=admin" \
  --archive=/tmp/backup.gz --gzip

# 从容器里复制出来
docker compose -f docker-compose.prod.yml cp mongodb:/tmp/backup.gz ./backup.gz
```

### Q: 怎么查看/管理数据库

```bash
# 进入 MongoDB 命令行
docker compose -f docker-compose.prod.yml exec mongodb \
  mongosh "mongodb://ai_admin:你的密码@localhost:27017/ai_research?authSource=admin"
```

---

## 架构图

```
                        用户浏览器
                            |
                            v
            ┌──── Nginx (可选, 80/443) ────┐
            |        反向代理 + HTTPS        |
            └───────────────────────────────┘
                            |
                            v
            ┌──── Docker Compose ───────────┐
            |                               |
            |   ┌─────────────────────┐     |
            |   |   app (Next.js)     |     |
            |   |   端口: 3000        |     |
            |   |   - 前端页面        |     |
            |   |   - API 接口        |     |
            |   |   - AI 研究引擎     |     |
            |   └─────────┬───────────┘     |
            |             |                 |
            |             v                 |
            |   ┌─────────────────────┐     |
            |   |   mongodb (Mongo 7) |     |
            |   |   端口: 27017       |     |
            |   |   - 用户数据        |     |
            |   |   - 对话记录        |     |
            |   └─────────────────────┘     |
            |                               |
            └───────────────────────────────┘
                     |           |
                     v           v
              DeepSeek API   Serper API
              (AI 推理)      (网络搜索)
```
