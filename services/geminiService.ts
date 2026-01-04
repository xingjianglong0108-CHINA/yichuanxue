
import { GoogleGenAI, Type } from "@google/genai";
import { INTERNAL_PROTOCOL_DATA } from "../constants";
import { DiseaseType, QueryResult, StructuredContent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const queryGenetics = async (disease: DiseaseType, input: string): Promise<QueryResult> => {
  const model = "gemini-3-pro-preview";
  
  const systemInstruction = `
    你是一位血液肿瘤遗传学专家。你的任务是根据提供的内部协作方案（SCCCG）文档回答有关基因和染色体异常的临床意义查询。
    
    内部文档内容摘要：
    ${INTERNAL_PROTOCOL_DATA}
    
    输出要求：
    1. 必须严格遵守提供的 JSON 格式。
    2. 禁止使用任何 Markdown 符号，如 #, *, -, \` 等。
    3. 语言：中文回答，专业术语保留英文。
    
    查询逻辑：
    - 检索 SCCCG 内部方案。
    - 若无记录，查询国际权威数据库（NCCN/WHO/ELN）。
    - 区分“内部结论”与“国际结论”。
    
    JSON 结构字段说明：
    - prognosisLevel: 只能是 "良好", "中等", "预后差", "未知" 之一。
    - summary: 一句话总结核心结论。
    - clinicalSignificance: 字符串数组，列出具体的临床意义点。
    - recommendations: 字符串数组，列出后续检查建议。
    - targetedTherapy: 如果有靶向药，列出药物名称，否则留空。
    - disclaimer: 固定免责声明。
  `;

  const prompt = `疾病类型：${disease}\n检查结果：${input}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prognosisLevel: { type: Type.STRING },
            summary: { type: Type.STRING },
            clinicalSignificance: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            targetedTherapy: { type: Type.STRING },
            disclaimer: { type: Type.STRING },
          },
          required: ["prognosisLevel", "summary", "clinicalSignificance", "recommendations", "disclaimer"],
        },
      },
    });

    const structuredData: StructuredContent = JSON.parse(response.text || "{}");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const urls = groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];

    return {
      source: urls.length > 0 ? 'both' : 'internal',
      structuredData,
      groundingUrls: Array.from(new Set(urls)),
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("查询失败，请检查网络或输入内容。");
  }
};
