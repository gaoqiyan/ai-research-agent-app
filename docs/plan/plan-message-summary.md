# Assistant 消息 AI 摘要 + 关键词

## Context

当前构建 history 时直接截取 assistant 回答前 300 字符，质量差。改为每次研究完成后调用 LLM 生成 2-4 句摘要 + 关键词，持久化到 Message，后续传 history 直接使用存储摘要。

## 变更

| 文件 | 改动 |
|------|------|
| `app/types/conversation.ts` | Message 类型添加 `summary?` / `keywords?` |
| `prisma/schema.prisma` | Message model 添加 `summary String?` / `keywords String[]` |
| `lib/workflow.ts` | 启用 `extractMemories`，研究完成后提取摘要并通过 `{ type: "summary" }` 事件发送 |
| `app/components/ResearchPanel.tsx` | 处理 `summary` 流事件写入 message；history 构建优先使用存储摘要 |
| `app/api/conversations/[id]/route.ts` | GET/PUT 透传 summary/keywords |
| `app/api/conversations/route.ts` | GET 列表透传 summary/keywords |

## 数据流

1. 研究完成 → `workflow.ts` 调 `extractMemories(report, query)` → 返回 `{ summary, keywords }`
2. 通过 NDJSON 流发送 `{ type: "summary", summary, keywords }` 事件
3. `ResearchPanel.tsx` 接收后写入当前 assistant message 对象
4. 对话完成时 `updateConversation` 将含 summary/keywords 的 messages 写入 MongoDB
5. 下次发消息时 history 构建优先取 `message.summary`，无则 fallback 到 `content.slice(0, 300)`
