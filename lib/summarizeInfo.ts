import { callAI } from "./ai";

export async function summarizeInfo(results: any[]) {
    const res =  await callAI({
        messages: [
            {
                role: "system",
                content: `
    你是分析专家，请整合所有信息输出结构化报告：
    
    ## 核心结论
    ## 关键分析
    ## 趋势
    ## 风险
    ## 建议
    ## 参考来源
    ## 引用链接
    `,
            },
            {
                role: "user",
                content: JSON.stringify(results),
            },
        ],
    });
    return res;

}