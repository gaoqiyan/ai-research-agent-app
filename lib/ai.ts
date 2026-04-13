// 调用AI
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
});

export async function callAI({ messages, tools }: { messages: any[]; tools?: any[] }) {
    const res = await client.chat.completions.create({
        model: "deepseek-chat",
        messages,
        tools,
    });

    return res.choices[0].message;
}