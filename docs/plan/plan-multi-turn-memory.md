# 多轮对话 + 摘要记忆简化

## Context

两个改动：
1. **多轮对话**：当前 `Conversation` 只有一个 `query` + `result`，用户要求改为一问一答多条形式，支持在同一对话中进行多轮研究
2. **简化记忆**：当前 `extractMemories` 提取 5-10 条独立事实，用户要求简化为基于完整回答生成 3-4 句摘要 + 关键词

## 一、数据模型变更 — `app/types/conversation.ts`

```ts
// 新增
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;           // 用户消息=查询文本，助手消息=markdown结果
  timeline?: TimelineItem[]; // 仅助手消息有
  createdAt: number;
};

// 修改 Conversation：去掉 query/timeline/result，改用 messages
export type Conversation = {
  id: string;
  messages: Message[];
  status: 'idle' | 'running' | 'completed';
  createdAt: number;
};

// 修改 MemoryItem：fact → summary
export type MemoryItem = {
  id: string;
  summary: string;       // 3-4句完整摘要（原 fact: 单句事实）
  keywords: string[];
  sourceQuery: string;
  createdAt: number;
};
```

## 二、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `app/types/conversation.ts` | 新增 `Message`，重构 `Conversation`（messages 替代 query/timeline/result），`MemoryItem.fact` → `summary` |
| 修改 | `app/components/ResearchPanel.tsx` | 改为多轮聊天界面：消息列表 + 底部输入框，streaming 更新最后一条助手消息 |
| 修改 | `app/components/ConversationItem.tsx` | 标题从 `conv.query` 改为取第一条用户消息内容 |
| 修改 | `app/page.tsx` | `handleNewConversation` 创建 `messages: []`，`handleConversationUpdate` 不变 |
| 修改 | `app/api/research/route.ts` | 新增接受 `history` 参数（前几轮 Q&A 摘要），传给 workflow |
| 修改 | `lib/workflow.ts` | 接受 `history`，构建对话上下文注入 planner/agent；`MemoryInput.fact` → `summary` |
| 修改 | `lib/planner.ts` | 新增 `historyContext?` 参数，注入前几轮对话上下文 |
| 修改 | `lib/runResearchAgent.ts` | 新增 `historyContext?` 参数，注入前几轮对话上下文 |
| 修改 | `lib/extractMemories.ts` | prompt 从"提取5-10条事实"改为"生成3-4句摘要+关键词"，返回单条 `{ summary, keywords }` |
| 修改 | `app/utils/memory.ts` | 字段引用从 `fact` 改为 `summary` |

## 三、实现细节

### 1. `ResearchPanel.tsx` — 多轮聊天界面

核心改动：从单次查询展示改为消息列表。

**状态管理：**
- `messages: Message[]` 替代原 `query/timeline/result` 三个独立状态
- `input: string` 为当前输入框内容（提交后清空）
- `isStreaming` 保持不变

**提交流程 (`handleSend`)：**
1. 创建 user message，追加到 messages
2. 创建空 assistant message（`content: '', timeline: []`），追加到 messages
3. 构建 `history`：从已完成的消息中提取前几轮 `{ query, result_summary }`（每轮结果截取前 300 字）
4. POST `{ query, memories, history }` 到 `/api/research`
5. 流式更新 messages 数组中最后一条 assistant message 的 `timeline` 和 `content`
6. 清空 input

**渲染：**
```tsx
<div className="flex flex-col h-full">
  {/* 消息列表 - 可滚动 */}
  <div className="flex-1 overflow-y-auto p-8">
    <h1>AI 研究助手</h1>
    {messages.map(msg => (
      msg.role === 'user'
        ? <用户消息气泡 content={msg.content} />
        : <助手消息：可折叠Timeline + ReactMarkdown结果 />
    ))}
  </div>
  {/* 底部输入框 - 固定 */}
  <div className="border-t p-4">
    <input + button>
  </div>
</div>
```

**persistUpdate 改动：**
- 构建 `Conversation` 时用 `messages` 而非 `query/timeline/result`

### 2. `ConversationItem.tsx` — 标题适配

```tsx
// 原来
<p>{conversation.query || "新对话"}</p>

// 改为
const firstUserMsg = conversation.messages.find(m => m.role === 'user');
<p>{firstUserMsg?.content || "新对话"}</p>
```

### 3. `page.tsx` — 创建对话适配

```tsx
// 原来
const conv = { id, query: "", timeline: [], result: "", status: "idle", createdAt };

// 改为
const conv = { id, messages: [], status: "idle", createdAt };
```

### 4. 后端对话上下文注入

**`route.ts`**：
```ts
const { query, memories, history } = await req.json();
await runWorkflowStream(query, send, memories, history);
```

**`workflow.ts`**：
```ts
export async function runWorkflowStream(
  input: string,
  send: (data: any) => void,
  memories?: MemoryInput,
  history?: { query: string; summary: string }[],
) {
  // 构建对话上下文
  let historyContext: string | undefined;
  if (history && history.length > 0) {
    historyContext = history
      .map(h => `问：${h.query}\n答：${h.summary}`)
      .join('\n\n');
  }
  // 传给 planTask 和 runResearchAgent
}
```

**`planner.ts`**：
```ts
export async function planTask(input: string, memoryContext?: string, historyContext?: string) {
  if (historyContext) {
    systemPrompt += `\n\n此对话中之前的研究：\n${historyContext}\n\n请基于以上对话上下文，为当前问题制定研究计划。`;
  }
}
```

**`runResearchAgent.ts`**：
```ts
export async function runResearchAgent(input: string, onLog?: (...) => void, memoryContext?: string, historyContext?: string) {
  if (historyContext) {
    systemPrompt += `\n\n此对话中之前的研究：\n${historyContext}\n\n请基于以上上下文，聚焦回答当前问题。`;
  }
}
```

### 5. `extractMemories.ts` — 简化摘要

**prompt 改为：**
```
你是信息摘要专家。基于研究报告，生成一段简洁摘要。

输出严格的JSON格式，不要包含其他文字：
{ "summary": "3-4句概括核心结论的摘要", "keywords": ["关键词1", "关键词2", ...] }

要求：
- summary 用3-4句话概括研究的核心发现和结论
- 包含关键数据、名称、时间等具体信息
- keywords 提取5-8个核心关键词
```

**返回值变更：**
- 原来：`{ fact, keywords }[]`（5-10条）
- 现在：`{ summary, keywords }`（单条）
- 函数返回类型改为 `{ summary: string; keywords: string[] } | null`

### 6. `workflow.ts` — 记忆字段适配

```ts
// MemoryInput 类型更新
type MemoryInput = { summary: string; keywords: string[] }[];

// 构建记忆上下文
memoryContext = memories.map(m => `- ${m.summary}`).join("\n");

// 提取记忆后发送
const newMemory = await extractMemories(summary.content, input);
if (newMemory) {
  send({ type: "memories", item: newMemory, query: input });
}
```

### 7. `ResearchPanel.tsx` — 记忆处理适配

```ts
// 发送记忆
const memories = getAllMemories().map(m => ({ summary: m.summary, keywords: m.keywords }));

// 接收记忆（现在是单条）
if (data.type === "memories") {
  const newMemory: MemoryItem = {
    id: crypto.randomUUID(),
    summary: data.item.summary,
    keywords: data.item.keywords,
    sourceQuery: data.query,
    createdAt: Date.now(),
  };
  saveMemories([newMemory]);
}
```

## 四、验证方式

1. 新建对话 → 输入第一个问题 → 确认消息列表显示用户问题 + 助手流式回答
2. 回答完成后 → 输入第二个问题 → 确认助手回答引用了第一轮的上下文
3. 侧边栏对话标题显示第一个问题内容
4. 切换对话 → 确认历史消息正确加载
5. 检查 localStorage `ai_memories`：每次研究只生成一条摘要记忆（非 5-10 条事实）
6. 刷新页面 → 确认多轮对话数据从 localStorage 正确恢复
