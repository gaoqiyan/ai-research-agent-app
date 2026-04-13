# 聊天数据迁移到 Postgres 后端

## Context

当前所有对话数据存储在浏览器 localStorage，存在以下问题：
- 数据与浏览器绑定，换设备/清缓存即丢失
- 无法区分用户
- 不适合生产环境

目标：将对话存储迁移到 Postgres，预留 `user_id` 字段但暂不实现登录，使用固定 `default_user`。流式研究期间数据保持在 React 内存中，仅在研究完成时写入数据库。

## 一、数据库层

### 1. 新建 `lib/db.ts` — Postgres 连接

```ts
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "prefer" });
export default sql;
```

### 2. 新建 `scripts/init-db.sql` — 建表脚本

```sql
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'idle',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  timeline        JSONB,
  created_at      BIGINT NOT NULL
);

-- 默认用户
INSERT INTO users (id, name, created_at)
VALUES ('default_user', '默认用户', extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
```

### 3. 新建 `lib/init-db.ts` — 程序化建表（可选）

提供 `ensureTables()` 函数，首次请求时自动建表，避免手动执行 SQL。用一个 module-level flag 保证只执行一次。

## 二、API 路由

### `app/api/conversations/route.ts` — 列表 & 新建

```
GET  /api/conversations         → 返回 default_user 的所有对话（含 messages）
POST /api/conversations         → 创建新对话（自动关联 default_user）
```

GET 返回格式与现有 `Conversation` 类型一致，messages 按 `created_at` 排序。

### `app/api/conversations/[id]/route.ts` — 单个对话操作

```
GET    /api/conversations/:id   → 返回单个对话（含 messages）
PUT    /api/conversations/:id   → 更新对话（status + 全量 messages upsert）
DELETE /api/conversations/:id   → 删除对话（CASCADE 删除 messages）
```

PUT 是核心：研究完成时，前端将完整的 `messages[]` 发给后端，后端用事务：
1. 更新 conversations.status
2. 删除该对话的旧 messages
3. 批量插入新 messages

这样避免了复杂的 diff/upsert 逻辑，一次性写入最终状态。

### 所有 API 路由硬编码 `user_id = "default_user"`

后续接入认证时只需改为从 session 取 userId。

## 三、前端适配

### 1. 新建 `app/utils/api.ts` — 后端 API 封装

```ts
export async function fetchConversations(): Promise<Conversation[]>
export async function fetchConversation(id: string): Promise<Conversation | null>
export async function createConversation(conv: Conversation): Promise<void>
export async function updateConversation(conv: Conversation): Promise<void>
export async function removeConversation(id: string): Promise<void>
```

所有函数返回 Promise，内部调 `fetch("/api/conversations/...")`。

### 2. 修改 `app/page.tsx`

- 导入 `api.ts` 替代 `storage.ts`
- `useEffect` 加载对话列表：`fetchConversations()` → `setConversations()`
- `handleNewConversation`：调 `createConversation(conv)`
- `handleDelete`：调 `removeConversation(id)`
- `handleConversationUpdate`：调 `updateConversation(conv)`
- 所有调用改为 async，加 loading 状态

### 3. 修改 `app/components/ResearchPanel.tsx`

- 导入 `api.ts` 替代 `storage.ts`
- `useEffect` 加载：`fetchConversation(id)` 替代 `getConversation(id)`
- `persistUpdate` 简化：
  - 流式期间（`status === "running"`）：只更新 React 状态，**不调 API**
  - 完成时（`status === "completed"` 或 `"idle"`）：调 `updateConversation(conv)`
- 移除 500ms 节流逻辑（不再需要，因为流式期间不持久化）

### 4. 删除/注释 `app/utils/storage.ts`

不再需要 localStorage 存储。保留文件但注释内容，或直接删除。

## 四、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `lib/db.ts` | postgres 连接实例 |
| 新建 | `lib/init-db.ts` | 自动建表逻辑 |
| 新建 | `scripts/init-db.sql` | SQL 建表脚本（参考/手动执行用） |
| 新建 | `app/api/conversations/route.ts` | GET 列表 / POST 新建 |
| 新建 | `app/api/conversations/[id]/route.ts` | GET 单个 / PUT 更新 / DELETE 删除 |
| 新建 | `app/utils/api.ts` | 后端 API 封装函数 |
| 修改 | `app/page.tsx` | localStorage → API 调用，加 async/loading |
| 修改 | `app/components/ResearchPanel.tsx` | localStorage → API，流式期间不持久化，完成时写 DB |
| 修改 | `.env.local` | 添加 `POSTGRES_URL` |
| 删除 | `app/utils/storage.ts` | 不再需要（或注释保留） |

## 五、实现顺序

1. **数据库层**：`lib/db.ts` + `lib/init-db.ts` + `scripts/init-db.sql` + `.env.local` 配置
2. **API 路由**：`conversations/route.ts` + `conversations/[id]/route.ts`
3. **前端封装**：`app/utils/api.ts`
4. **前端适配**：`page.tsx` + `ResearchPanel.tsx`
5. **清理**：删除/注释 `storage.ts`

## 六、验证方式

1. 启动本地 Postgres，配置 `.env.local` 中的 `POSTGRES_URL`
2. 启动应用，首次请求自动建表
3. 新建对话 → 检查 DB 中 `conversations` 表有记录，`user_id = 'default_user'`
4. 输入问题 → 研究完成后检查 `messages` 表有完整消息记录
5. 刷新页面 → 对话列表和历史消息从 DB 正确加载
6. 删除对话 → DB 中对话和消息同时删除（CASCADE）
7. 多轮对话 → 每轮完成后 DB 中追加新消息
