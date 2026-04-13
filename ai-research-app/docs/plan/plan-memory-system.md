# 方案2：Agent 摘要记忆系统

## Context

当前研究 agent 每次查询都是独立的，没有跨对话记忆。方案2 的核心思路：每次研究结束后让 AI 提取关键事实存为 memory，后续研究时把相关 memory 注入 prompt，让 agent 能基于已有知识工作。

## 数据流

```
研究完成 → AI 提取关键事实 → 存入 localStorage
                                    ↓
新查询 → 从 localStorage 加载 memories → 随 query 发送到 API
                                              ↓
                              planner/agent 的 system prompt 注入 memories
```

## 数据模型

```ts
// 新增到 app/types/conversation.ts
type MemoryItem = {
  id: string;
  fact: string;             // "特斯拉2025Q3营收同比增长18%"
  keywords: string[];       // ["特斯拉", "营收", "Q3"]
  sourceQuery: string;      // 来源对话的查询
  createdAt: number;
};
```

存储在 localStorage 独立 key `ai_memories`，与对话数据分离。

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `app/types/conversation.ts` | 新增 `MemoryItem` 类型 |
| 创建 | `app/utils/memory.ts` | memory 的 localStorage CRUD |
| 创建 | `lib/extractMemories.ts` | AI 调用：从研究结果中提取关键事实 + 关键词 |
| 修改 | `lib/planner.ts` | 接受 memories 参数，注入 system prompt |
| 修改 | `lib/runResearchAgent.ts` | 接受 memories 参数，注入 system prompt |
| 修改 | `lib/workflow.ts` | 接受 memories，传递给 planner/agent；研究结束后提取 memory 通过 stream 返回 |
| 修改 | `app/api/research/route.ts` | 接受请求中的 memories，传给 workflow |
| 修改 | `app/components/ResearchPanel.tsx` | 查询时加载 memories 发送；接收新 memories 存入 localStorage |

## 实现细节

### 1. `lib/extractMemories.ts`（新建）
- 调用 `callAI`，prompt 要求从研究报告中提取 5-10 条关键事实
- 每条包含 `fact`（一句话陈述）和 `keywords`（3-5 个关键词）
- 输出 JSON 格式，用 `JSON.parse` 解析

### 2. `lib/workflow.ts`（修改）
- `runWorkflowStream(input, send, memories?)` 新增第三个参数
- 构建 memory 上下文字符串，传给 `planTask` 和 `runResearchAgent`
- 在 `send({ type: "final" })` 之后，调用 `extractMemories(summary)` 提取记忆
- 通过 `send({ type: "memories", items: [...] })` 新增事件类型推送给前端

### 3. `lib/planner.ts`（修改）
- `planTask(input, memoryContext?)` 新增可选参数
- 有 memory 时在 system prompt 追加："你已知以下事实，请据此优化研究计划，避免重复已知信息"

### 4. `lib/runResearchAgent.ts`（修改）
- `runResearchAgent(input, onLog?, memoryContext?)` 新增可选参数
- 有 memory 时在 system prompt 追加已知事实，让 agent 聚焦于未知信息

### 5. 前端 `ResearchPanel.tsx`（修改）
- `handleSearch` 时调用 `getAllMemories()` 获取所有 memory
- POST body 改为 `{ query, memories }`
- 处理新事件类型 `"memories"`：调用 `saveMemories(items)` 存入 localStorage

### 6. 前端 `app/utils/memory.ts`（新建）
- `getAllMemories(): MemoryItem[]`
- `saveMemories(items: MemoryItem[]): void` — 追加到已有列表
- `clearMemories(): void`

## 关键设计决策

- **不引入状态管理库**：仅 2 层组件嵌套，useState + props 足够
- **记忆与对话数据分离**：独立 localStorage key，互不影响
- **全量注入**：将所有 memories 注入 prompt（短句形式 token 消耗小），不做前端筛选
- **后端提取、前端存储**：提取需要 AI 调用（后端），存储需要 localStorage（前端）

## 验证方式

1. 第一次研究 "特斯拉最新财报"，完成后检查 localStorage `ai_memories` 有提取的事实
2. 第二次研究 "特斯拉供应链风险"，观察 planner 的步骤是否引用了之前的财报结论
3. 检查 agent 搜索轮次是否减少（因为已有部分已知信息）
