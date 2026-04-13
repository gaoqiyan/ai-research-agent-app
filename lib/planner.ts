// 任务拆解
import { callAI } from "./ai";

export async function planTask(input: string, memoryContext?: string, historyContext?: string) {
    let systemPrompt = `把用户问题拆成3-5个研究步骤,每一步必须清晰、可执行，输出格式：每行是一个清晰的完整的步骤`;

    if (memoryContext) {
        systemPrompt += `\n\n你已掌握以下事实，请据此优化研究计划，避免重复已知信息，聚焦于未知领域：\n${memoryContext}`;
    }

    if (historyContext) {
        systemPrompt += `\n\n此对话中之前的研究：\n${historyContext}\n\n请基于以上对话上下文，为当前问题制定研究计划。`;
    }

    const res = await callAI({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
        ],
    });

    return res?.content?.split("\n").filter(Boolean);
}