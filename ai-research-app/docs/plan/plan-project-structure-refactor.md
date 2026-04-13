# 项目结构规范化重构方案

> 状态：✅ 已完成  
> 日期：2026-04-13

## 一、重构背景

项目基于 Next.js App Router，但当前结构存在以下问题：

| 问题 | 说明 |
|------|------|
| `app/` 混杂非路由文件 | `components/`、`types/`、`utils/`、`styles/` 不应放在 App Router 目录内 |
| `lib/` 缺乏分层 | 7 个 AI/研究相关文件与 auth、db 工具平铺混放 |
| 废弃文件未清理 | `lib/db.ts`、`lib/init-db.ts`、`app/utils/storage.ts`、`scripts/init-db.sql` 已弃用未删除 |
| 预存类型 bug | `lib/auth-types.ts` 中 JWT 模块增强路径错误，构建无法通过 |
| login 页面缺 Suspense | `useSearchParams()` 未包裹 `Suspense`，Next.js 16 构建报错 |

## 二、核心原则

1. **`app/` 只放路由** — Next.js App Router 规范，仅保留 `page.tsx`、`layout.tsx`、`route.ts` 等路由文件
2. **按领域归组** — AI 研究逻辑聚合到 `lib/research/`，职责清晰
3. **client/server 边界** — `utils/` 放客户端工具，`lib/` 放服务端逻辑
4. **清理死代码** — 删除已废弃的 Postgres 相关文件
5. **保持 `@/` 前缀** — 所有导入使用 tsconfig paths 别名，路径一致性

## 三、重构前结构

```
ai-collection-project/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── components/          ❌ 非路由文件不应在 app/ 内
│   │   ├── ConversationItem.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ResearchPanel.tsx
│   │   ├── Sidebar.tsx
│   │   └── Timeline.tsx
│   ├── types/               ❌ 同上
│   │   └── conversation.ts
│   ├── utils/               ❌ 同上
│   │   ├── api.ts
│   │   ├── memory.ts
│   │   └── storage.ts       ❌ 废弃（全部注释）
│   ├── styles/              ❌ 同上
│   │   └── globals.css
│   ├── (auth)/...
│   └── api/...
│
├── lib/
│   ├── prisma.ts
│   ├── auth-types.ts
│   ├── auth-utils.ts
│   ├── db.ts                ❌ 废弃（Postgres）
│   ├── init-db.ts           ❌ 废弃（Postgres）
│   ├── ai.ts                ⚠️ 与下方文件同属研究领域，应归组
│   ├── planner.ts
│   ├── workflow.ts
│   ├── runResearchAgent.ts
│   ├── summarizeInfo.ts
│   ├── extractMemories.ts
│   └── tools.ts
│
├── scripts/
│   └── init-db.sql          ❌ 废弃（Postgres）
└── ...
```

## 四、重构后结构

```
ai-collection-project/
├── app/                          ✅ 仅保留路由文件
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   ├── register/route.ts
│       │   └── forgot-password/
│       │       ├── question/route.ts
│       │       ├── verify/route.ts
│       │       └── reset/route.ts
│       ├── conversations/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       └── research/route.ts
│
├── components/                   ✅ 顶层 UI 组件
│   ├── ConversationItem.tsx
│   ├── EmptyState.tsx
│   ├── ResearchPanel.tsx
│   ├── Sidebar.tsx
│   └── Timeline.tsx
│
├── lib/                          ✅ 服务端逻辑，按领域分层
│   ├── prisma.ts                    数据库客户端
│   ├── auth-types.ts                Auth 类型增强
│   ├── auth-utils.ts                Auth 工具函数
│   └── research/                 🆕 AI 研究领域子目录
│       ├── ai.ts                    DeepSeek API 客户端
│       ├── planner.ts               任务拆解
│       ├── workflow.ts              编排入口
│       ├── agent.ts                 ← runResearchAgent.ts（重命名）
│       ├── summarize.ts             ← summarizeInfo.ts（重命名）
│       ├── memories.ts              ← extractMemories.ts（重命名）
│       └── tools.ts                 搜索工具定义
│
├── types/                        ✅ 从 app/types/ 移出
│   └── conversation.ts
│
├── utils/                        ✅ 客户端工具函数
│   ├── api.ts
│   └── memory.ts
│
├── styles/                       ✅ 从 app/styles/ 移出
│   └── globals.css
│
├── prisma/schema.prisma
├── auth.ts
├── auth.config.ts
├── middleware.ts
└── docs/
```

## 五、变更清单

### 5.1 删除废弃文件（4 个）

| 文件 | 原因 |
|------|------|
| `lib/db.ts` | 已废弃的 Postgres 连接（全部注释） |
| `lib/init-db.ts` | 已废弃的 Postgres 表初始化（全部注释） |
| `app/utils/storage.ts` | 已废弃的 localStorage 管理（全部注释） |
| `scripts/init-db.sql` | 已废弃的 SQL 初始化脚本 |

### 5.2 移动文件

| 原路径 | 新路径 |
|--------|--------|
| `app/components/ConversationItem.tsx` | `components/ConversationItem.tsx` |
| `app/components/EmptyState.tsx` | `components/EmptyState.tsx` |
| `app/components/ResearchPanel.tsx` | `components/ResearchPanel.tsx` |
| `app/components/Sidebar.tsx` | `components/Sidebar.tsx` |
| `app/components/Timeline.tsx` | `components/Timeline.tsx` |
| `app/types/conversation.ts` | `types/conversation.ts` |
| `app/utils/api.ts` | `utils/api.ts` |
| `app/utils/memory.ts` | `utils/memory.ts` |
| `app/styles/globals.css` | `styles/globals.css` |

### 5.3 移动 + 重命名（lib → lib/research）

| 原路径 | 新路径 | 重命名原因 |
|--------|--------|------------|
| `lib/ai.ts` | `lib/research/ai.ts` | — |
| `lib/planner.ts` | `lib/research/planner.ts` | — |
| `lib/workflow.ts` | `lib/research/workflow.ts` | — |
| `lib/tools.ts` | `lib/research/tools.ts` | — |
| `lib/runResearchAgent.ts` | `lib/research/agent.ts` | 去掉冗余前缀，精简命名 |
| `lib/summarizeInfo.ts` | `lib/research/summarize.ts` | 去掉冗余后缀，精简命名 |
| `lib/extractMemories.ts` | `lib/research/memories.ts` | 去掉冗余前缀，精简命名 |

### 5.4 导入路径更新（~15 处）

| 旧导入路径 | 新导入路径 | 涉及文件 |
|------------|------------|----------|
| `@/app/types/conversation` | `@/types/conversation` | page.tsx, 4 个组件, api.ts, memory.ts |
| `@/app/utils/api` | `@/utils/api` | page.tsx, ResearchPanel.tsx |
| `@/app/styles/globals.css` | `@/styles/globals.css` | layout.tsx |
| `./components/Sidebar` | `@/components/Sidebar` | page.tsx |
| `./components/ResearchPanel` | `@/components/ResearchPanel` | page.tsx |
| `./components/EmptyState` | `@/components/EmptyState` | page.tsx |
| `./Timeline` | `@/components/Timeline` | ResearchPanel.tsx |
| `./ConversationItem` | `@/components/ConversationItem` | Sidebar.tsx |
| `@/lib/workflow` | `@/lib/research/workflow` | api/research/route.ts |
| `./runResearchAgent` | `./agent` | lib/research/workflow.ts |
| `./summarizeInfo` | `./summarize` | lib/research/workflow.ts |
| `./extractMemories` | `./memories` | lib/research/workflow.ts |

### 5.5 附带修复的预存 Bug（2 个）

| 文件 | 问题 | 修复方式 |
|------|------|----------|
| `lib/auth-types.ts` | `@auth/core/jwt` 模块增强路径错误（pnpm 严格提升下不可达） | 改为 `next-auth/jwt` 并添加 `import "next-auth/jwt"` |
| `app/(auth)/login/page.tsx` | `useSearchParams()` 未包裹 `Suspense`（Next.js 16 构建报错） | 拆分为 `LoginForm` + `Suspense` 包裹的默认导出 |

## 六、配置兼容性

- **tsconfig.json**: `@/*` → `./` 路径别名无需修改，顶层 `components/`、`types/`、`utils/`、`styles/` 自动匹配
- **tailwind.config.ts**: `content` 已包含 `./components/**`，无需修改
- **next.config.ts**: 无需修改

## 七、验证

```bash
pnpm run build   # ✅ TypeScript 编译通过，所有 12 个路由构建成功
```
