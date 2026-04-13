import { callAI } from "./ai";
import { tools, toolMap } from "./tools";

export async function runResearchAgent(input: string, onLog?: (log: string) => void, memoryContext?: string, historyContext?: string) {
    let systemPrompt = `你是一个研究型AI：1. 必须先搜索2. 信息不够继续搜索3. 最多3轮4. 最后输出总结（带引用）`;

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

    let loop = 0;
    const MAX_LOOP = 5;

    while (loop < MAX_LOOP) {
        const isLastRound = loop === MAX_LOOP - 1;

        const msg = await callAI({
            messages: isLastRound
                ? [...messages, { role: "user", content: "这是最后一轮，请停止搜索，直接基于已有信息输出总结（带引用）。" }]
                : messages,
            tools: isLastRound ? undefined : tools,
        });

        if (!msg.tool_calls) {
            return msg.content ?? "";
        }

        const toolCall = msg.tool_calls[0];
        if (toolCall.type !== "function") continue;
        const args = JSON.parse(toolCall.function.arguments);

        // 🔥 每一轮搜索都输出日志
        onLog && onLog(`第${loop + 1}轮搜索: ${args.query}`);

        const result = await toolMap.search_google(args);

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