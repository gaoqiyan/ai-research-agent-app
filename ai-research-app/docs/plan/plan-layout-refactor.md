# 左侧对话列表 + 右侧对话详情布局改造

## Context

当前项目是一个单页面 AI 研究助手应用，所有 UI 逻辑集中在 `app/page.tsx` 中，没有对话历史功能。用户希望改造为左右两栏布局：左侧展示历史对话列表，右侧展示对话详情，并将对话数据持久化到 localStorage。

## 数据模型

```ts
// app/types/conversation.ts
type TimelineItem = { title, logs, done, startTime?, endTime?, duration? }
type Conversation = {
  id: string;            // crypto.randomUUID()
  query: string;
  timeline: TimelineItem[];
  result: string;
  status: 'idle' | 'running' | 'completed';
  createdAt: number;     // Date.now()
}
```

localStorage key: `"ai_history"`, 值为 `Conversation[]` 数组。

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `app/styles/globals.css` | 添加 `@tailwind base/components/utilities` 指令 |
| 修改 | `app/layout.tsx` | 导入 globals.css，添加 body 基础样式 |
| 创建 | `app/types/conversation.ts` | 共享类型定义 |
| 修改 | `app/utils/storage.ts` | 重写为 typed CRUD 函数 |
| 创建 | `app/components/Sidebar.tsx` | 左侧对话列表 + 新建对话按钮 |
| 创建 | `app/components/ConversationItem.tsx` | 单条对话列表项 |
| 创建 | `app/components/Timeline.tsx` | 从 page.tsx 提取的时间线组件 |
| 创建 | `app/components/ResearchPanel.tsx` | 右侧面板：输入框 + 时间线 + 结果展示 |
| 创建 | `app/components/EmptyState.tsx` | 无对话选中时的空状态 |
| 重写 | `app/page.tsx` | 改为布局 shell：管理对话列表状态 + 渲染左右两栏 |
| 删除 | `app/compoments/` | 删除拼写错误的空目录 |

## 实现步骤

### 1. 基础设施

- **`app/styles/globals.css`**: 顶部添加 Tailwind 三行指令，保留现有 fadeIn 动画
- **`app/layout.tsx`**: 导入 globals.css，body 添加 `className="h-screen overflow-hidden"`
- **`app/types/conversation.ts`**: 导出 `TimelineItem` 和 `Conversation` 类型
- **`app/utils/storage.ts`**: 实现 `getAllConversations()`, `getConversation(id)`, `saveConversation(conv)`, `deleteConversation(id)`

### 2. 提取组件

- **`app/components/Timeline.tsx`**: 从 page.tsx 提取 Timeline/SkeletonLine/StepSkeleton，接收 `data: TimelineItem[]` 作为 props
- **`app/components/ConversationItem.tsx`**: 渲染单条对话（query 截断显示 + 时间 + 状态点）
- **`app/components/Sidebar.tsx`**: 固定宽度侧边栏 (w-64)，顶部标题 + 新建按钮，下方可滚动列表
- **`app/components/EmptyState.tsx`**: 居中提示文字 + 新建对话按钮

### 3. 核心逻辑

- **`app/components/ResearchPanel.tsx`**:
  - 迁移 page.tsx 中的全部流式处理逻辑（handleSearch、timer useEffect）
  - Props: `conversationId`, `onUpdate(conv)`
  - 挂载时从 localStorage 加载已有对话数据
  - 使用 `AbortController` 管理流请求，组件卸载时 abort
  - 流式过程中节流调用 `onUpdate` 持久化到 localStorage
  - 所有 inline style 替换为 Tailwind class
  - `<pre>` 包裹 ReactMarkdown 改为 `<div className="prose ...">`

- **`app/page.tsx`** (重写为布局 shell):
  - 状态: `conversations[]`, `activeId`
  - useEffect 加载 localStorage 对话列表
  - `handleNewConversation`: 创建新 Conversation，保存并设为 activeId
  - `handleConversationUpdate`: 更新 conversations 状态 + 持久化
  - 布局: `<div className="flex h-screen">` 包含 Sidebar + ResearchPanel
  - ResearchPanel 使用 `key={activeId}` 切换时完整重新挂载

### 4. 补充

- 安装 `@tailwindcss/typography` 插件用于 markdown 样式
- 在 `tailwind.config.ts` 中注册该插件

## 关键设计决策

- **不引入状态管理库**：仅 2 层组件嵌套，useState + props 足够
- **`key={activeId}` 强制重挂载**：切换对话时最干净的方式重置流式状态
- **`AbortController`**：切换对话时中止进行中的流请求
- **localStorage 写入节流**：流式过程中每 500ms 持久化一次，结束时立即写入

## 验证方式

1. `pnpm dev` 启动项目，确认左右两栏布局正常渲染
2. 输入查询并开始研究，确认流式时间线和结果正常展示
3. 刷新页面，确认对话列表从 localStorage 恢复
4. 点击历史对话，确认右侧面板正确加载历史数据
5. 新建对话，确认列表更新且右侧切换到空白面板
6. 研究进行中切换到其他对话，确认流请求被中止
