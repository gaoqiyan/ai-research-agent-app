import { callAI } from "./ai";

export async function extractMemories(
  result: string,
  query: string,
): Promise<{ summary: string; keywords: string[] } | null> {
  const res = await callAI({
    messages: [
      {
        role: "system",
        content: `你是信息摘要专家。基于研究报告，生成一段简洁摘要。

输出严格的JSON格式，不要包含其他文字：
{ "summary": "3-4句概括核心结论的摘要", "keywords": ["关键词1", "关键词2", "关键词3"] }

要求：
- summary 用3-4句话概括研究的核心发现和结论
- 包含关键数据、名称、时间等具体信息
- keywords 提取5-8个核心关键词
- 不要过于笼统`,
      },
      {
        role: "user",
        content: `研究问题：${query}\n\n研究报告：\n${result}`,
      },
    ],
  });

  try {
    const content = res?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}
