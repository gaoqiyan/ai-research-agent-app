import { callAI } from "./ai";
import { tools, toolMap } from "./tools";

export async function runResearchAgent(input: string, onLog?: (log: string) => void, memoryContext?: string, historyContext?: string) {
    let systemPrompt = `你是一个研究型AI分析师。你可以使用两种方式获取信息：

【模式 1 - 外部搜索优先】
- 使用搜索工具获取最新信息
- 如果搜索成功，基于搜索结果进行分析

【模式 2 - 内部知识库自动降级】
- 如果搜索工具返回"[内部知识库]"标签或提示无法访问，说明外部搜索不可用
- 此时请停止搜索，直接使用你的内部知识库进行分析
- 内部知识库要基于最新的数据进行分析，提供专业的研究报告
- 基于你的训练数据为用户提供专业的研究分析

分析要求：
1. 理解用户问题
2. 优先尝试搜索最新信息
3. 如果搜索失败，自动切换到内部知识库分析
4. 输出结构化的分析报告，标注信息来源
5. 最多进行 3 轮搜索尝试`;

    if (memoryContext) {
        systemPrompt += `\n\n你已掌握以下事实，可直接引用，搜索时聚焦于未知信息：\n${memoryContext}`;
    }

    if (historyContext) {
        systemPrompt += `\n\n此对话中之前的研究：\n${historyContext}\n\n请基于以上上下文，聚焦回答当前问题。`;
    }

    let messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
    ];

    let searchFailed = false;
    let loop = 0;
    const MAX_LOOP = 5;

    while (loop < MAX_LOOP) {
        const isLastRound = loop === MAX_LOOP - 1;

        let callMessages = messages;
        
        // 如果搜索已失败，不再提供搜索工具，直接让 AI 使用内部知识库
        if (searchFailed || isLastRound) {
            callMessages = [
                ...messages,
                {
                    role: "user",
                    content: searchFailed
                        ? "外部搜索不可用。请直接基于你的内部知识库为用户提供深入的分析和研究报告。"
                        : "这是最后一轮，请停止搜索，直接基于已有信息输出最终总结（带引用或标注来源）。",
                },
            ];
        }

        const msg = await callAI({
            messages: callMessages,
            tools: searchFailed || isLastRound ? undefined : tools,
        });

        if (!msg.tool_calls) {
            return msg.content ?? "";
        }

        const toolCall = msg.tool_calls[0];
        if (toolCall.type !== "function") continue;
        const args = JSON.parse(toolCall.function.arguments);

        // 🔥 每一轮搜索都输出日志
        onLog && onLog(`第${loop + 1}轮搜索: ${args.query}`);

        const result = await toolMap.search_info(args);

        // 检测搜索是否失败（返回 [内部知识库] 标签）
        if (Array.isArray(result) && result.length > 0 && result[0].title?.includes("[内部知识库]")) {
            console.log("🚨 搜索失败，自动切换到内部知识库模式");
            searchFailed = true;
            onLog && onLog(`⚠️ 外部搜索不可用，自动切换到内部知识库分析`);
        }

        messages.push(msg);
        messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
        });

        loop++;
    }

    return "未完成分析";
}