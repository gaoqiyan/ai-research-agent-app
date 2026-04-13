# 变更记录

## #5 — 多轮对话 + 摘要记忆简化 (2026-04-10)

### 修改文件：

- [conversation.ts](app/types/conversation.ts) — 新增 `Message` 类型（id, role, content, timeline?, createdAt）；`Conversation` 从 `query/timeline/result` 重构为 `messages: Message[]`；`MemoryItem.fact` 改为 `summary`
- [ResearchPanel.tsx](app/components/ResearchPanel.tsx) — 重写为多轮聊天界面：消息列表（用户气泡+助手回答）+ 底部输入框，流式更新最后一条助手消息，提交后清空输入；构建 `history` 对话上下文发送给后端
- [ConversationItem.tsx](app/components/ConversationItem.tsx) — 标题从 `conv.query` 改为取第一条用户消息内容
- [page.tsx](app/page.tsx) — `handleNewConversation` 创建 `messages: []` 替代原 `query/timeline/result`
- [extractMemories.ts](lib/extractMemories.ts) — prompt 从"提取5-10条事实"改为"生成3-4句摘要+关键词"；返回单条 `{ summary, keywords }` 替代数组
- [workflow.ts](lib/workflow.ts) — 新增 `history` 参数构建对话上下文，传给 planner/agent；`MemoryInput.fact` → `summary`；记忆事件从 `items` 改为 `item`（单条）
- [planner.ts](lib/planner.ts) — 新增 `historyContext?` 参数，注入前几轮对话上下文到 system prompt
- [runResearchAgent.ts](lib/runResearchAgent.ts) — 新增 `historyContext?` 参数，注入前几轮对话上下文到 system prompt
- [route.ts](app/api/research/route.ts) — 从请求体解构 `history`，传给 `runWorkflowStream`

### 关键特性：

- 对话支持多轮一问一答，用户可在同一对话中追问
- 后续提问自动携带前几轮 Q&A 摘要作为对话上下文
- 摘要记忆从 5-10 条独立事实简化为 1 条 3-4 句完整摘要 + 关键词
- 聊天界面：用户消息气泡右对齐，助手回答左对齐（含可折叠 Timeline + Markdown 结果）

---

## #4 — Agent 摘要记忆系统 (2026-04-10)

### 新建文件：

- [extractMemories.ts](lib/extractMemories.ts) — AI 调用：从研究报告中提取 5-10 条关键事实 + 关键词，输出 JSON 格式
- [memory.ts](app/utils/memory.ts) — memory 的 localStorage CRUD（`getAllMemories`, `saveMemories`, `clearMemories`），独立 key `ai_memories`

### 修改文件：

- [conversation.ts](app/types/conversation.ts) — 新增 `MemoryItem` 类型（id, fact, keywords, sourceQuery, createdAt）
- [planner.ts](lib/planner.ts) — `planTask(input, memoryContext?)` 新增可选参数，有记忆时追加到 system prompt 引导优化研究计划
- [runResearchAgent.ts](lib/runResearchAgent.ts) — `runResearchAgent(input, onLog?, memoryContext?)` 新增可选参数，有记忆时注入已知事实让 agent 聚焦未知信息
- [workflow.ts](lib/workflow.ts) — `runWorkflowStream` 新增 `memories` 参数：构建记忆上下文传给 planner/agent；研究结束后调用 `extractMemories` 提取记忆，通过新事件 `{ type: "memories" }` 推送给前端；修复 `await await` 双重 await bug
- [route.ts](app/api/research/route.ts) — 从请求体解构 `memories`，传给 `runWorkflowStream`
- [ResearchPanel.tsx](app/components/ResearchPanel.tsx) — 查询时调用 `getAllMemories()` 随请求发送；处理 `"memories"` 事件类型，将提取的记忆存入 localStorage

### 数据流：

```
研究完成 → AI 提取关键事实 → stream 推送 { type: "memories" } → 前端存入 localStorage
新查询 → 前端加载 memories → 随 POST body 发送 → planner/agent system prompt 注入
```

### 关键特性：

- 每次研究结束自动提取关键事实作为长期记忆
- 记忆独立存储在 localStorage key `ai_memories`，与对话数据分离
- planner 基于已有记忆优化研究计划，避免重复已知信息
- agent 基于已有记忆聚焦搜索，减少冗余搜索轮次

---

## #3 — 对话删除功能 (2026-04-10)

### 修改文件：

- [ConversationItem.tsx](app/components/ConversationItem.tsx) — 添加 hover 显示的删除按钮（垃圾桶图标），`e.stopPropagation()` 防止触发选中
- [Sidebar.tsx](app/components/Sidebar.tsx) — 透传 `onDelete` 回调到 ConversationItem
- [page.tsx](app/page.tsx) — 新增 `handleDelete`：调用 `deleteConversation` 从 localStorage 删除 + 更新列表状态，若删除当前选中项则清空 `activeId`

---

## #2 — 左右两栏布局 + localStorage 持久化 (2026-04-10)

### 新建文件：

- [conversation.ts](app/types/conversation.ts) — `Conversation` 和 `TimelineItem` 类型定义
- [Sidebar.tsx](app/components/Sidebar.tsx) — 左侧对话列表 + 新建按钮
- [ConversationItem.tsx](app/components/ConversationItem.tsx) — 单条对话项（截断标题 + 相对时间 + 状态指示）
- [ResearchPanel.tsx](app/components/ResearchPanel.tsx) — 右侧面板，包含完整的流式研究逻辑
- [Timeline.tsx](app/components/Timeline.tsx) — 从 page.tsx 提取的时间线组件
- [EmptyState.tsx](app/components/EmptyState.tsx) — 无对话选中时的空状态

### 修改文件：

- [page.tsx](app/page.tsx) — 重写为布局 shell，管理 `conversations` + `activeId` 状态
- [storage.ts](app/utils/storage.ts) — 重写为 typed CRUD 函数（`getAllConversations`, `getConversation`, `saveConversation`, `deleteConversation`）
- [layout.tsx](app/layout.tsx) — 导入 globals.css，添加 body 基础样式
- [globals.css](app/styles/globals.css) — 添加 `@tailwind base/components/utilities` 指令
- [tailwind.config.ts](tailwind.config.ts) — 注册 `@tailwindcss/typography` 插件

### 删除：

- `app/compoments/` — 删除拼写错误的空目录

### 关键特性：

- 对话数据持久化到 localStorage（key: `ai_history`），刷新页面后恢复
- 流式过程中 500ms 节流写入 localStorage
- 切换对话时通过 `AbortController` 中止进行中的请求
- `key={activeId}` 确保切换时完整重挂载 ResearchPanel

---

## #1 — 初始项目 (2026-04-10)

### 关键文件：

- [page.tsx](app/page.tsx) — 单页面 AI 研究助手，所有 UI 逻辑集中于此
- [route.ts](app/api/research/route.ts) — POST 流式研究接口
- [workflow.ts](lib/workflow.ts) — 编排器：plan → research per step → summarize
- [ai.ts](lib/ai.ts) — OpenAI SDK 配置，指向 DeepSeek API
- [planner.ts](lib/planner.ts) — 任务分解（3-5 步研究计划）
- [tools.ts](lib/tools.ts) — Google 搜索工具（Serper API）
- [runResearchAgent.ts](lib/runResearchAgent.ts) — Agent 循环（最多 3 轮工具调用）
- [summarizeInfo.ts](lib/summarizeInfo.ts) — 最终报告摘要生成

### 关键特性：

- 流式调用 /api/research 接口，展示 Timeline 研究步骤 + ReactMarkdown 渲染结果
- 后端：DeepSeek API + Serper Google 搜索，planner → agent loop → summarizer 流水线
- 无对话历史、无持久化
