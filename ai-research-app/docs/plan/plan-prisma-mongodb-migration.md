# Prisma + MongoDB 迁移方案

## Context

从 postgres.js + 原始 SQL 迁移到 Prisma ORM + MongoDB，原因：
- MongoDB 文档模型天然适合对话数据（Conversation 嵌套 Message[]）
- Prisma 提供类型安全的查询 API，减少手写 SQL 出错
- Prisma schema 作为 single source of truth，替代手动建表脚本

## 变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `prisma/schema.prisma` | MongoDB provider + User/Conversation/Message 模型 |
| 新建 | `lib/prisma.ts` | Prisma Client 单例（dev 环境热更新安全） |
| 重写 | `app/api/conversations/route.ts` | raw SQL → Prisma 查询 |
| 重写 | `app/api/conversations/[id]/route.ts` | raw SQL → Prisma 查询 |
| 修改 | `docker-compose.yml` | Postgres → MongoDB 7 + replica set 初始化 |
| 修改 | `.env.local` | `POSTGRES_URL` → `DATABASE_URL`（MongoDB 连接串） |
| 修改 | `package.json` | 添加 prisma + @prisma/client 依赖 |
| 废弃 | `lib/db.ts` | postgres 连接已注释 |
| 废弃 | `lib/init-db.ts` | 自动建表逻辑已注释（Prisma 管理 schema） |
| 废弃 | `scripts/init-db.sql` | SQL 脚本已注释 |

## 数据模型（prisma/schema.prisma）

```prisma
model User {
  id            String         @id @default(auto()) @map("_id") @db.ObjectId
  userId        String         @unique
  name          String?
  createdAt     DateTime       @default(now())
  conversations Conversation[]
}

model Conversation {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  convId    String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [userId])
  status    String    @default("idle")
  messages  Message[]
  createdAt DateTime  @default(now())
}

model Message {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  msgId          String
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [convId])
  role           String
  content        String       @default("")
  timeline       Json?
  createdAt      DateTime     @default(now())
}
```

## 关键设计决策

1. **MongoDB replica set 必需**：Prisma 对 MongoDB 要求 replica set，docker-compose 中用 `mongo-init` sidecar 自动初始化
2. **字段映射**：`convId`/`msgId` 存前端 UUID，`_id` 由 MongoDB 自动生成 ObjectId
3. **无 CASCADE**：MongoDB 不支持外键级联，DELETE 路由手动先删 messages 再删 conversation
4. **默认用户**：API 路由中 `ensureDefaultUser()` 用 `upsert` 保证幂等

## 启动步骤

```bash
# 1. 启动 MongoDB
docker-compose up -d

# 2. 等待 replica set 初始化（约 5 秒）

# 3. 推送 schema 到 MongoDB
npx prisma db push

# 4. 启动应用
pnpm dev
```

## 未变更文件

以下文件无需修改，因为它们调用的是 REST API 而非直接操作数据库：
- `app/utils/api.ts`（前端 API 封装）
- `app/page.tsx`（页面组件）
- `app/components/ResearchPanel.tsx`（研究面板）
