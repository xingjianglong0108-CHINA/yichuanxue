
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- 1. 类型定义 (Types) ---
enum DiseaseType {
  ALL = "急性淋巴细胞白血病",
  AML = "急性髓细胞白血病",
  APL = "急性早幼粒细胞白血病",
  CML = "慢性粒细胞白血病",
  MDS = "骨髓增生异常综合征"
}

interface StructuredContent {
  prognosisLevel: "良好" | "中等" | "预后差" | "未知" | "未列出";
  summary: string;
  clinicalSignificance: string[];
  recommendations: string[];
  targetedTherapy?: string;
}

interface DualQueryResult {
  scccgReport: StructuredContent;
  globalReport: StructuredContent;
  groundingUrls?: string[];
  disclaimer: string;
}

// --- 2. 内部方案数据 (Constants) ---
const INTERNAL_PROTOCOL_DATA = `
SCCCG-AML-2025 (儿童 ≤18y):
- 预后良好: t(8;21)(q22;q22.1)/RUNX1-RUNX1T1, inv(16)/t(16;16)/CBFB-MYH11, NPM1突变(VAF>10%), CEBPA-bZip双突变。
- 预后中等: t(9;11)(p21.3;q23.3)/MLLT3-KMT2A, FLT3-ITD(有效TKI治疗下), t(8;16)(p11.2;p13.3)。
- 预后差: 复杂核型(>=3), 单体核型, t(6;9)/DEK-NUP214, KMT2A重排(除t(9;11)), t(9;22)/BCR-ABL1, inv(3)/t(3;3)/GATA2/MECOM, -5, del(5q), -7, TP53突变.

SCCCG-ALL-2023:
- 高危因素: d15 MRD >= 10%, d33 MRD >= 1%, W12 MRD >= 0.01%, MLL重排, MEF2D重排, 低二倍体(<44 chr), iAMP21, TCF3-HLF.
- 中危: Ph-like ALL, Ph-ALL (t(9;22)), t(1;19)/TCF3-PBX1.
- 低危: t(12;21)/ETV6-RUNX1, 高二倍体(>50 chr 且伴 +4,+10).

SCCCG-APL-2024:
- 诊断: PML-RARa/t(15;17). 
- 风险分层: 仅依据初始WBC, 高危 > 10 x 10^9/L. FLT3-ITD不作为预后差指标.
`;

// --- 3. 核心服务 (Service) ---
const queryGenetics = async (disease: DiseaseType, input: string): Promise<DualQueryResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";

  const systemInstruction = `
    你是一位血液肿瘤遗传学专家。你的任务是出具两份独立的临床分析报告。
    
    报告1：SCCCG内部方案报告
    - 必须严格仅依据提供的内部方案（SCCCG）文档。
    - 内部文档内容：${INTERNAL_PROTOCOL_DATA}
    - 如果输入的结果在SCCCG方案中未提及，请在prognosisLevel标记为"未列出"，并在summary中注明。
    
    报告2：全球权威数据库报告
    - 依据国际最新共识（NCCN 2024, WHO 5th Edition, ELN 2022）。
    - 必须使用 googleSearch 工具来校准最新临床标准。
    
    输出要求：
    1. 必须严格遵守 JSON 格式。
    2. 禁止使用任何 Markdown 标记。
    3. 语言：中文回答，专业术语保留英文。
  `;

  const prompt = `疾病类型：${disease}\n检查结果：${input}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      scccgReport: {
        type: Type.OBJECT,
        properties: {
          prognosisLevel: { type: Type.STRING },
          summary: { type: Type.STRING },
          clinicalSignificance: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          targetedTherapy: { type: Type.STRING },
        },
        required: ["prognosisLevel", "summary", "clinicalSignificance", "recommendations"],
      },
      globalReport: {
        type: Type.OBJECT,
        properties: {
          prognosisLevel: { type: Type.STRING },
          summary: { type: Type.STRING },
          clinicalSignificance: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          targetedTherapy: { type: Type.STRING },
        },
        required: ["prognosisLevel", "summary", "clinicalSignificance", "recommendations"],
      },
      disclaimer: { type: Type.STRING },
    },
    required: ["scccgReport", "globalReport", "disclaimer"],
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const data = JSON.parse(response.text || "{}");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const urls = groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];

    return {
      ...data,
      groundingUrls: Array.from(new Set(urls)),
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("深度分析失败，请检查网络或输入内容的准确性。");
  }
};

// --- 4. UI 子组件 ---
const ReportCard: React.FC<{ 
  title: string; 
  subtitle: string; 
  data: StructuredContent; 
  theme: 'blue' | 'indigo' 
}> = ({ title, subtitle, data, theme }) => {
  const getPrognosisColor = (level: string) => {
    switch (level) {
      case '良好': return 'bg-emerald-500 text-white';
      case '中等': return 'bg-amber-500 text-white';
      case '预后差': return 'bg-rose-500 text-white';
      case '未列出': return 'bg-slate-400 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const accentColor = theme === 'blue' ? 'text-blue-600' : 'text-indigo-600';
  const iconBg = theme === 'blue' ? 'bg-blue-50' : 'bg-indigo-50';

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full transform transition-all hover:shadow-xl hover:shadow-black/5">
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-900">{title}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${getPrognosisColor(data.prognosisLevel)}`}>
            {data.prognosisLevel}
          </div>
        </div>

        <div className="mb-8 p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
          <p className="text-base font-bold text-gray-800 leading-relaxed italic">
            “ {data.summary} ”
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${accentColor}`}>临床意义</h4>
            <ul className="space-y-3">
              {data.clinicalSignificance.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${theme === 'blue' ? 'bg-blue-400' : 'bg-indigo-400'}`}></div>
                  <span className="text-sm font-semibold text-gray-600 leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${accentColor}`}>诊疗建议</h4>
            <div className="grid gap-3">
              {data.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-50 shadow-sm group hover:border-gray-200 transition-colors">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${accentColor}`}>
                    <i className="fas fa-check text-[10px]"></i>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {data.targetedTherapy && (
            <div className={`mt-4 p-5 rounded-2xl border-2 border-dashed ${theme === 'blue' ? 'border-blue-100 bg-blue-50/20' : 'border-indigo-100 bg-indigo-50/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <i className={`fas fa-bullseye text-xs ${accentColor}`}></i>
                <span className={`text-[10px] font-black uppercase tracking-widest ${accentColor}`}>靶向治疗</span>
              </div>
              <p className="text-sm font-black text-gray-800">{data.targetedTherapy}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 5. 主应用 (App) ---
const App: React.FC = () => {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>(DiseaseType.ALL);
  const [geneticInput, setGeneticInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DualQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geneticInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await queryGenetics(selectedDisease, geneticInput);
      setResult(response);
    } catch (err: any) {
      setError(err.message || '查询失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#1C1C1E] font-sans selection:bg-blue-100">
      {/* 玻璃拟态背景 */}
      <div className="fixed inset-0 pointer-events-none opacity-50 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-200 blur-[180px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-200 blur-[180px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* 页眉 */}
        <header className="mb-14 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] shadow-2xl mb-8 transform transition-transform hover:rotate-3">
            <i className="fas fa-microscope text-3xl text-white"></i>
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-4 text-gray-900">遗传学临床决策双报告系统</h1>
          <div className="flex items-center justify-center gap-3">
            <span className="px-3 py-1 bg-white rounded-lg border border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-widest shadow-sm">Internal Protocol v2025</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <span className="px-3 py-1 bg-blue-600 rounded-lg text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-blue-500/20">Global Data Sync</span>
          </div>
        </header>

        {/* 输入面板 */}
        <section className="max-w-2xl mx-auto bg-white/70 backdrop-blur-3xl rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.04)] border border-white p-2 mb-16">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">选择疾病</label>
                  <div className="relative">
                    <select
                      value={selectedDisease}
                      onChange={(e) => setSelectedDisease(e.target.value as DiseaseType)}
                      className="w-full bg-gray-50/50 border-0 rounded-2xl px-5 py-4 text-base font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/5 transition-all"
                    >
                      {Object.values(DiseaseType).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none">
                      <i className="fas fa-chevron-down text-xs"></i>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">操作指令</label>
                  <button
                    type="submit"
                    disabled={isLoading || !geneticInput.trim()}
                    className={`w-full py-4 rounded-2xl font-black text-base text-white transition-all shadow-xl active:scale-95 ${
                      isLoading || !geneticInput.trim() ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-blue-500/30'
                    }`}
                  >
                    {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <span>开始生成报告</span>}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">检测结果描述</label>
                <textarea
                  placeholder="请输入核型、融合基因或点突变情况 (如: t(12;21), RUNX1-RUNX1T1, NPM1, FLT3-ITD...)"
                  value={geneticInput}
                  onChange={(e) => setGeneticInput(e.target.value)}
                  className="w-full bg-gray-50/50 border-0 rounded-2xl px-6 py-5 text-base font-medium focus:ring-4 focus:ring-blue-500/5 min-h-[120px] transition-all resize-none placeholder:text-gray-300"
                />
              </div>
            </form>
          </div>
        </section>

        {/* 报告对比展示 */}
        {result && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              <ReportCard 
                title="SCCCG 协作组方案报告" 
                subtitle="Source: SCCCG Internal Protocol (CN)" 
                data={result.scccgReport} 
                theme="blue" 
              />
              <ReportCard 
                title="全球权威数据库报告" 
                subtitle="Source: NCCN / ELN / WHO Global Standards" 
                data={result.globalReport} 
                theme="indigo" 
              />
            </div>

            {/* 引用链接 */}
            {result.groundingUrls && result.groundingUrls.length > 0 && (
              <div className="bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <i className="fas fa-link text-blue-500"></i> 全球循证医学依据
                </h3>
                <div className="flex flex-wrap gap-3">
                  {result.groundingUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-white rounded-xl border border-gray-100 flex items-center gap-3 group transition-all hover:border-blue-200 hover:shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs">
                        {i + 1}
                      </div>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 transition-colors">
                        {new URL(url).hostname}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 免责声明 */}
            <footer className="text-center px-12">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-loose max-w-3xl mx-auto">
                {result.disclaimer}
              </p>
            </footer>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 flex items-center gap-4 animate-bounce">
            <i className="fas fa-exclamation-triangle"></i>
            <span className="font-bold">{error}</span>
          </div>
        )}
      </div>

      <div className="pb-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
        LZRYEK Intelligence System • Professional Medical Only
      </div>
    </div>
  );
};

// --- 6. 挂载 ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
