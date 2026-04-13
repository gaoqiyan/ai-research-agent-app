// 搜索工具
import axios from "axios";

export const tools = [
    {
        type: "function",
        function: {
            name: "search_info",
            description: "搜索最新信息。如果搜索失败，AI 会使用内部知识库进行分析。",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string" },
                },
                required: ["query"],
            },
        },
    },
];

export const toolMap = {
    search_info: async ({ query }: { query: string }) => {
        try {
            console.log(`🔍 尝试通过 Serper 搜索: "${query}"`);
            
            const res = await axios.post(
                "https://google.serper.dev/search",
                { q: query },
                {
                    headers: {
                        "X-API-KEY": process.env.SERPER_API_KEY,
                    },
                    timeout: 8000, // 8 秒超时
                }
            );

            if (res.data?.organic && res.data.organic.length > 0) {
                console.log(`✅ Serper 搜索成功，获得 ${res.data.organic.length} 条结果`);
                return res.data.organic.slice(0, 5).map((item: { title: string; link: string; snippet: string }) => ({
                    title: item.title,
                    link: item.link,
                    snippet: item.snippet,
                }));
            } else {
                console.log(`⚠️ Serper 未返回结果`);
                return [{
                    title: "[内部知识库] 搜索结果为空",
                    link: "#",
                    snippet: "外部搜索无结果。请直接使用你的内部知识库进行分析。",
                }];
            }
        } catch (error: any) {
            console.error(`❌ Serper 搜索失败:`, error.message);
            
            // 返回降级提示，告诉 AI 使用内部知识库
            return [{
                title: "[内部知识库] 外部搜索不可用",
                link: "#",
                snippet: `外部搜索服务不可用（${error.message}）。请直接使用你的内部知识库为用户分析 "${query}"。基于你的训练数据提供最准确的信息。`,
            }];
        }
    },
};