# 服务器准备检查表（可打印）

> 说明：在部署 `ai-research-app` 前逐项检查并勾选。复制本文件到本地修改后打印。

## 基本信息
- [ ] 服务器规格已确认（CPU / 内存 / 磁盘）
- [ ] 操作系统已更新（推荐 Ubuntu 22.04 LTS）

## 基础更新与用户
- [ ] 系统包已更新：

```bash
sudo apt update && sudo apt upgrade -y
```

- [ ] 部署用户已创建并加入 docker 组：

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
```

- [ ] SSH 密钥认证启用并禁用密码登录

## Docker 与 Docker Compose
- [ ] Docker Engine 已安装并启用：`docker --version`
- [ ] Docker Compose 可用：`docker compose version` 或 `docker-compose --version`
- [ ] 部署用户可运行 docker 命令（无需 sudo）

## 防火墙与端口
- [ ] 必要端口已开放：SSH、80、443、（若直接暴露）3000

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

## 域名与 TLS
- [ ] DNS A/AAAA 已指向服务器 IP
- [ ] TLS 证书方案已确定（certbot/nginx 或 Traefik）

## 反向代理（若使用）
- [ ] 共享 nginx/Traefik 已部署并连接到内部网络
- [ ] `nginx.conf` 或 Traefik 路由已指向内部服务

## 数据库（MongoDB）
- [ ] 使用托管 DB 或在私有网络中运行 MongoDB
- [ ] 强密码已设置并安全保存
- [ ] 持久卷已配置（不要使用容器临时存储）
- [ ] 备份机制已配置（定期备份并异地存储）

示例备份（在宿主或管理容器中执行）：
```bash
docker exec ai-research-mongo sh -c 'mongodump --archive=/data/backup/backup-$(date +%F).gz --gzip'
```

## 环境变量与 Secrets
- [ ] 已创建 `.env.production`（不要提交到仓库）
- [ ] 敏感密钥使用 Docker secrets / Vault / 云 KMS 管理
- [ ] `.env.production` 权限设为 600

## 持久化与卷
- [ ] Docker 卷或宿主卷用于数据库数据
- [ ] 磁盘空间预留检查（日志、备份）

## Prisma 与迁移
- [ ] `DATABASE_URL` 已正确配置并可从容器内访问
- [ ] 部署流程包含 `npx prisma generate` 与 `prisma db push` 或 `prisma migrate deploy`

示例（在容器内或 CI 中执行）：
```bash
npx prisma generate
npx prisma db push
# 或（若使用 migration files）
pnpm prisma migrate deploy
```

## 日志、监控与健康
- [ ] 日志导出方式已确定（docker logs / Loki / ELK）
- [ ] 健康检查配置（容器 HEALTHCHECK 或外部探针）
- [ ] 监控方案（Prometheus + Grafana 或云监控）已规划

## 自动重启与更新
- [ ] Compose 中设置了 `restart` 策略（如 `unless-stopped`）
- [ ] 镜像更新/自动拉取策略已定（watchtower / CI 推送 + webhook）

## 安全加固
- [ ] 仅开放必要端口，禁用无用服务
- [ ] 安装并配置 Fail2ban（如适用）
- [ ] 定期系统与镜像安全扫描

## 备份与回滚
- [ ] 备份策略已文档化并验证恢复步骤
- [ ] 镜像版本化策略（语义化 tag 或 Git SHA）用于回滚

回滚示例：
```bash
# 修改 .env.production 中的 IMAGE/APP_TAG 指向旧 tag
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 验证与发布后检查
- [ ] 访问 `https://your.domain/` 并验证 UI、登录功能
- [ ] 容器状态：
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```
- [ ] 简单应用端点健康检查：
```bash
docker compose -f docker-compose.prod.yml exec app sh -c 'curl -I http://localhost:3000'
```

## 部署当天清单（快速复查）
- [ ] 域名解析生效
- [ ] `.env.production` 已填写并测试连接
- [ ] 最近备份已完成并可用
- [ ] 回滚镜像 tag 已准备好
- [ ] 监控/告警已启用

---

如需我，我可以：
- 将本文件导出为 PDF 并生成打印版；
- 基于本检查表生成具体的 `playbook` 脚本或 GitHub Actions workflow。
