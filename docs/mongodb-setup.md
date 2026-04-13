# MongoDB 初始化与配置指南

> 针对多项目 Docker 部署的 MongoDB 管理

## 📋 目录

1. [快速初始化](#快速初始化)
2. [安全配置](#安全配置)
3. [索引管理](#索引管理)
4. [备份与恢复](#备份与恢复)
5. [故障排查](#故障排查)
6. [性能监控](#性能监控)

---

## 🚀 快速初始化

### 第 1 步：启动 MongoDB 容器

```bash
cd /projects/ai-research-app

export PROJECT_NAME=ai-research-app
export MONGO_PASSWORD=your-secure-password

docker compose up -d mongodb mongo-init
```

### 第 2 步：验证 ReplicaSet 初始化

```bash
# 查看初始化日志
docker compose logs mongo-init

# 预期输出：
# ReplicaSet initialized ✓
```

### 第 3 步：验证连接

```bash
# 进入 MongoDB 容器
docker compose exec mongodb mongosh \
  -u admin \
  -p $MONGO_PASSWORD \
  --authenticationDatabase admin

# 在 mongosh 中执行：
> rs.status()  # 查看 ReplicaSet 状态
> show databases
> use ai_research
> show collections
> exit
```

### 第 4 步：启动应用并初始化数据库

```bash
# 启动 Next.js 应用
docker compose up -d app

# 初始化 Prisma schema
docker compose exec app npx prisma db push

# 验证
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
  --eval "use ai_research; db.users.countDocuments()"
```

---

## 🔐 安全配置

### 1. 设置强认证

```bash
# docker-compose.yml 中的环境变量
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: your-strong-password-32bit  # 最少 32 位
  MONGO_INITDB_DATABASE: ai_research
```

### 2. 创建应用用户（可选但推荐）

```bash
# 进入 MongoDB
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin

# 创建应用专用用户（权限受限）
db.createUser({
  user: "app_user",
  pwd: "app-specific-password",  # 不同于 admin
  roles: [
    { role: "readWrite", db: "ai_research" }
  ]
})

# 验证
exit
mongosh -u app_user -p app-specific-password --authenticationDatabase ai_research

# 查看用户
db.getUsers()
```

### 3. 限制端口访问

```yaml
# docker-compose.yml
services:
  mongodb:
    ports:
      - "127.0.0.1:27017:27017"  # 仅本地访问
      # 不要用 0.0.0.0:27017:27017（暴露到网络）
```

### 4. 禁用 localhost 绕过

```bash
# mongosh 中
use admin
db.adminCommand({
  setParameter: 1,
  localHostAuthBypass: false  # 禁止未验证的本地连接
})
```

---

## 📊 索引管理

### 为常用查询创建索引

```bash
# 进入 MongoDB
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin

# 切换数据库
use ai_research

# 创建索引
db.conversations.createIndex({ userId: 1, createdAt: -1 })
db.messages.createIndex({ conversationId: 1, createdAt: -1 })
db.users.createIndex({ email: 1 })

# 查看索引
db.conversations.getIndexes()

# 删除索引（如果需要）
db.conversations.dropIndex("fieldName_1")
```

### 查看索引统计

```bash
# 进入 MongoDB
db.conversations.aggregate([
  {
    $indexStats: {}
  }
])
```

---

## 💾 备份与恢复

### 方式 1：手动备份

```bash
# 备份所有数据库
docker compose exec mongodb mongodump \
  --uri="mongodb://admin:$MONGO_PASSWORD@mongodb:27017/?authSource=admin" \
  --out=/data/db/backups/$(date +%Y%m%d_%H%M%S)

# 列出备份
docker compose exec mongodb ls -lh /data/db/backups/

# 恢复备份
docker compose exec mongodb mongorestore \
  --uri="mongodb://admin:$MONGO_PASSWORD@mongodb:27017/?authSource=admin" \
  --drop \
  /data/db/backups/20260413_120000
```

### 方式 2：定时备份（Cron 脚本）

创建脚本 `/projects/backup-mongodb.sh`：

```bash
#!/bin/bash
set -e

PROJECT_NAME=${1:-ai-research-app}
BACKUP_PATH="/projects/$PROJECT_NAME/backups"
MONGO_PASSWORD=${MONGO_PASSWORD}

mkdir -p $BACKUP_PATH

# 使用 Docker 容器进行备份
docker compose -f /projects/$PROJECT_NAME/docker-compose.yml exec -T mongodb mongodump \
  --uri="mongodb://admin:${MONGO_PASSWORD}@mongodb-${PROJECT_NAME}:27017/?authSource=admin" \
  --out=/data/db/backups/$(date +%Y%m%d_%H%M%S)

echo "✓ MongoDB 备份完成"

# 删除 7 天前的备份
find $BACKUP_PATH -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

echo "✓ 旧备份已清理"
```

添加到 crontab（每天凌晨 2 点备份）：

```bash
chmod +x /projects/backup-mongodb.sh

crontab -e
# 添加：
# 0 2 * * * cd /projects && MONGO_PASSWORD=xxx ./backup-mongodb.sh ai-research-app >> /var/log/mongodb-backup.log 2>&1
```

### 方式 3：MongoDB Atlas（云备份，可选）

```bash
# 连接到 MongoDB Atlas
mongosh "mongodb+srv://user:password@cluster.mongodb.net/?ssl=true"
```

---

## 🔍 故障排查

### 问题 1：MongoDB 无法启动

```bash
# 查看日志
docker compose logs mongodb

# 常见原因：
# - 磁盘空间不足
# - 配置错误
# - 权限问题

# 解决
docker compose down
docker volume rm mongo-ai-research-app  # 警告：会删除数据！
docker compose up -d mongodb
```

### 问题 2：ReplicaSet 初始化失败

```bash
# 查看初始化日志
docker compose logs mongo-init

# 手动初始化
docker compose exec mongodb mongosh --eval '
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "mongodb-ai-research-app:27017" }]
  })
'
```

### 问题 3：认证失败

```bash
# 验证凭证
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin

# 如果失败，检查：
# 1. PASSWORD 是否正确
# 2. MongoDB 是否完全启动
# 3. 容器网络是否正常

docker compose exec mongodb mongosh --eval "db.adminCommand({ ping: 1 })"
```

### 问题 4：ReplicaSet 状态异常

```bash
# 检查 ReplicaSet 状态
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
  --eval "rs.status()"

# 常见状态：
# - "PRIMARY": 主节点（正常）
# - "SECONDARY": 副本节点
# - "ARBITER": 仲裁节点
# - "STARTUP": 启动中
# - "RECOVERING": 恢复中

# 强制重新配置 ReplicaSet（危险操作）
db.adminCommand({ replSetReconfig: { _id: "rs0", members: [{ _id: 0, host: "mongodb-ai-research-app:27017" }] }, force: true })
```

### 问题 5：连接超时

```bash
# 增加连接超时
DATABASE_URL="mongodb://admin:password@mongodb-ai-research-app:27017/ai_research?replicaSet=rs0&serverSelectionTimeoutMS=5000&socketTimeoutMS=30000"

# 或检查 Docker 网络
docker network ls
docker network inspect shared-network
```

---

## 📈 性能监控

### 实时监控

```bash
# 进入 MongoDB
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin

# 查看当前操作
db.currentOp()

# 查看数据库统计
db.stats()

# 查看集合统计
db.conversations.stats()

# 慢查询日志
db.setProfilingLevel(1, { slowms: 100 })  # 记录 >100ms 的查询
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

### 容器资源监控

```bash
# 实时监控所有容器
docker stats

# 查看 MongoDB 容器详情
docker stats mongodb-ai-research-app --no-stream

# 查看容器进程
docker top mongodb-ai-research-app
```

### 导出监控数据

```bash
# 导出数据库统计
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
  --eval "db.stats()" > mongodb-stats.json

# 导出集合统计
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
  --eval "db.conversations.stats()" > collections-stats.json
```

---

## 🛠️ 日常维护

### 每日检查清单

```bash
#!/bin/bash
# daily-mongodb-check.sh

PROJECT_NAME=ai-research-app
MONGO_PASSWORD=$1

# 检查 MongoDB 是否运行
docker compose -f /projects/$PROJECT_NAME/docker-compose.yml ps mongodb | grep -q "Up" && echo "✓ MongoDB 运行中" || echo "✗ MongoDB 未运行"

# 检查 ReplicaSet 状态
docker compose -f /projects/$PROJECT_NAME/docker-compose.yml exec -T mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
  --eval "rs.status().ok" | grep -q "1" && echo "✓ ReplicaSet 正常" || echo "✗ ReplicaSet 异常"

# 检查磁盘空间
docker compose -f /projects/$PROJECT_NAME/docker-compose.yml exec -T mongodb df -h /data/db | tail -1

# 检查连接数
docker compose -f /projects/$PROJECT_NAME/docker-compose.yml exec -T mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
  --eval "db.serverStatus().connections"
```

运行：

```bash
chmod +x daily-mongodb-check.sh
./daily-mongodb-check.sh $MONGO_PASSWORD
```

### 定期维护

```bash
# 每周：检查和清理旧备份
find /projects/*/backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

# 每月：重建索引
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
  --eval "db.conversations.reIndex(); db.messages.reIndex();"

# 每半年：全量数据验证
mongodump && mongorestore  # 验证数据一致性
```

---

## 📞 常用命令速查

```bash
# 启动 MongoDB
docker compose up -d mongodb

# 进入 mongosh
docker compose exec mongodb mongosh -u admin -p $MONGO_PASSWORD --authenticationDatabase admin

# 查看数据库大小
db.stats().dataSize

# 查看集合数量
db.getCollectionNames()

# 查看用户列表
use admin
db.getUsers()

# 修改用户密码
db.changeUserPassword("admin", "new-password")

# 删除数据库
db.dropDatabase()

# 创建索引
db.collection.createIndex({ field: 1 })

# 删除索引
db.collection.dropIndex("field_1")
```

---

## 📚 更多资源

- [MongoDB 官方文档](https://docs.mongodb.com/)
- [Prisma MongoDB 指南](https://www.prisma.io/docs/orm/overview/databases/mongodb)
- [Docker MongoDB 镜像](https://hub.docker.com/_/mongo)
- [MongoShell 参考](https://docs.mongodb.com/mongodb-shell/)

---

**最后更新**：2026-04-13
