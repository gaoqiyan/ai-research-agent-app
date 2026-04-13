// 核心workflow
import { planTask } from "./planner";
import { runResearchAgent } from "./runResearchAgent";
import { summarizeInfo } from "./summarizeInfo";
import { extractMemories } from "./extractMemories";

export async function runWorkflow(input: string) {
  console.log("🧠 拆解任务...");
  const steps = (await planTask(input)) || [];
  console.log("✅ 任务拆解完成:", steps);

  let results = [];

  for (let step of steps) {
    console.log("🔍 执行:", step);

    const result = await runResearchAgent(step);

    results.push({
      step,
      result,
    });
  }

  console.log("📊 汇总结果...");

  const summary = await summarizeInfo(results);

  return summary.content;
}

type MemoryInput = { summary: string; keywords: string[] }[];
type HistoryInput = { query: string; summary: string }[];

export async function runWorkflowStream(
  input: string,
  send: (data: any) => void,
  _memories?: MemoryInput, // 跨对话记忆已禁用
  history?: HistoryInput,
) {
  // // 构建记忆上下文（跨对话记忆已禁用）
  // let memoryContext: string | undefined;
  // if (memories && memories.length > 0) {
  //   memoryContext = memories.map((m) => `- ${m.summary}`).join("\n");
  //   send({ type: "status", message: `🧠 已加载 ${memories.length} 条历史记忆` });
  // }
  let memoryContext: string | undefined;

  // 构建对话上下文
  let historyContext: string | undefined;
  if (history && history.length > 0) {
    historyContext = history
      .map((h) => `问：${h.query}\n答：${h.summary}`)
      .join("\n\n");
  }

  // 1️⃣ 拆任务
  send({ type: "status", message: "🧠 正在拆解任务..." });

  const steps = (await planTask(input, memoryContext, historyContext)) || [];

  let results: any[] = [];

  // 2️⃣ 执行步骤（逐步返回）
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    send({
        type: "step",
        step: i,
        message: step,
    });

    const result = await runResearchAgent(step, (log) => {
        send({
            type: "search",
            step: i,
            message: log,
        });
    }, memoryContext, historyContext);

    send({
        type: "done",
        step: i,
        message: "完成",
    });

    results.push({ step, result });
  }

  // 3️⃣ 汇总
  send({ type: "status", message: "✍️ 正在生成最终报告..." });

  const summary = await summarizeInfo(results);

  send({
    type: "final",
    content: summary.content,
  });

  // 4️⃣ 提取摘要 + 关键词（存入消息，用于后续 history）
  if (summary.content) {
    const memoryResult = await extractMemories(summary.content, input);
    if (memoryResult) {
      send({ type: "summary", summary: memoryResult.summary, keywords: memoryResult.keywords });
    }
  }

  // // 跨对话记忆已禁用
  // if (summary.content) {
  //   send({ type: "status", message: "💾 正在提取关键记忆..." });
  //   const newMemory = await extractMemories(summary.content, input);
  //   if (newMemory) {
  //     send({ type: "memories", item: newMemory, query: input });
  //   }
  // }
}
