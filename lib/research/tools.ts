// 搜索工具
import axios from "axios";

export const tools = [
    {
        type: "function",
        function: {
            name: "search_google",
            description: "搜索最新信息",
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
    search_google: async ({ query }: { query: string }) => {
        const res = await axios.post(
            "https://google.serper.dev/search",
            { q: query },
            {
                headers: {
                    "X-API-KEY": process.env.SERPER_API_KEY,
                },
            }
        );

        return res.data.organic.slice(0, 5).map((item: { title: string; link: string; snippet: string }) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
        }));
    },
};