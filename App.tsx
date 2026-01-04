
import React, { useState } from 'react';
import { DiseaseType, QueryResult } from './types';
import { queryGenetics } from './services/geminiService';

const App: React.FC = () => {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>(DiseaseType.ALL);
  const [geneticInput, setGeneticInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
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
      setError(err.message || '查询过程中发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const getPrognosisColor = (level: string) => {
    switch (level) {
      case '良好': return 'bg-gradient-to-r from-emerald-400 to-teal-500';
      case '中等': return 'bg-gradient-to-r from-orange-400 to-amber-500';
      case '预后差': return 'bg-gradient-to-r from-rose-500 to-red-600';
      default: return 'bg-gradient-to-r from-gray-400 to-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans selection:bg-blue-100">
      {/* Background Decorative Element */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[22px] shadow-xl mb-6 transform transition-transform hover:scale-105 duration-300">
            <i className="fas fa-dna text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-[#1C1C1E]">血液遗传学分析</h1>
          <p className="text-[#8E8E93] text-sm font-medium">SCCCG 临床协作方案 · 智能化决策支持</p>
          <p className="text-[#8E8E93] text-sm font-medium mt-1">LZRYEK</p>
        </header>

        {/* Input Form Card - Enhanced with Gradients */}
        <section className="relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white p-1 mb-8">
          <div className="p-7">
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-blue-600/70 uppercase tracking-[0.15em] ml-2">
                  目标疾病
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl opacity-50"></div>
                  <select
                    value={selectedDisease}
                    onChange={(e) => setSelectedDisease(e.target.value as DiseaseType)}
                    className="relative w-full bg-transparent border-0 rounded-2xl px-5 py-4 text-base font-semibold focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all cursor-pointer text-[#1C1C1E]"
                  >
                    {Object.values(DiseaseType).map((disease) => (
                      <option key={disease} value={disease} className="bg-white">
                        {disease}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500/50">
                    <i className="fas fa-chevron-down text-sm"></i>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-blue-600/70 uppercase tracking-[0.15em] ml-2">
                  遗传学检测数据
                </label>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl"></div>
                  <textarea
                    placeholder="输入染色体、融合基因或突变结果 (如: t(8;21), BCR-ABL1...)"
                    value={geneticInput}
                    onChange={(e) => setGeneticInput(e.target.value)}
                    className="relative w-full bg-transparent border-0 rounded-2xl px-5 py-4 text-base font-medium focus:ring-2 focus:ring-blue-500/20 min-h-[150px] transition-all resize-none placeholder:text-[#C7C7CC] text-[#1C1C1E]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !geneticInput.trim()}
                className={`w-full py-4.5 rounded-[1.25rem] font-bold text-lg text-white transition-all shadow-[0_10px_20px_rgba(59,130,246,0.3)] active:scale-[0.97] disabled:shadow-none disabled:translate-y-0 ${
                  isLoading || !geneticInput.trim() 
                  ? 'bg-[#E5E5EA] cursor-not-allowed text-[#AEAEB2]' 
                  : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:brightness-110 active:brightness-90'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="tracking-wide">深度分析中</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <i className="fas fa-sparkles text-sm opacity-80"></i>
                    <span>开始临床解析</span>
                  </div>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Error Messaging */}
        {error && (
          <div className="bg-red-50/80 backdrop-blur-md text-red-600 p-5 rounded-3xl mb-8 flex items-center gap-4 animate-in zoom-in-95 duration-300 border border-red-100">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <i className="fas fa-exclamation-triangle text-sm"></i>
            </div>
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Results: Refined iOS Style List View */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
            {/* Status Summary Card */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden border border-white">
              <div className="p-7 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold mb-1 text-[#1C1C1E]">分析结论</h2>
                  <div className="flex items-center gap-1.5 text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider">
                    <i className="fas fa-database text-[10px]"></i>
                    {result.source === 'internal' ? 'SCCCG 协作组方案' : '多维度数据整合'}
                  </div>
                </div>
                <div className={`px-5 py-2 rounded-full text-white text-xs font-black shadow-lg shadow-black/5 transform hover:scale-105 transition-transform ${getPrognosisColor(result.structuredData.prognosisLevel)}`}>
                  {result.structuredData.prognosisLevel}
                </div>
              </div>
              <div className="px-7 pb-8 pt-3 border-t border-[#F2F2F7]">
                <p className="text-lg font-semibold text-[#1C1C1E] leading-[1.6]">
                  {result.structuredData.summary}
                </p>
              </div>
            </div>

            {/* Clinical Significance List */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-white">
              <div className="px-8 pt-6 pb-2">
                <h3 className="text-[11px] font-black text-blue-500/60 uppercase tracking-[0.2em]">临床价值</h3>
              </div>
              <div className="divide-y divide-[#F2F2F7]">
                {result.structuredData.clinicalSignificance.map((point, i) => (
                  <div key={i} className="px-8 py-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors first:rounded-t-none last:rounded-b-[2.5rem]">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] shrink-0"></div>
                    <span className="text-base font-medium text-[#2C2C2E] leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations List */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-white">
              <div className="px-8 pt-6 pb-2">
                <h3 className="text-[11px] font-black text-indigo-500/60 uppercase tracking-[0.2em]">后续诊疗建议</h3>
              </div>
              <div className="divide-y divide-[#F2F2F7]">
                {result.structuredData.recommendations.map((rec, i) => (
                  <div key={i} className="px-8 py-5 flex items-center gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <i className="fas fa-check text-[10px] text-indigo-600"></i>
                    </div>
                    <span className="text-base font-semibold text-[#2C2C2E]">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeted Therapy - Vibrant Gradient Card */}
            {result.structuredData.targetedTherapy && (
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-[2.5rem] shadow-2xl p-7 text-white relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-6 opacity-10 transform rotate-12 transition-transform group-hover:scale-110 duration-700">
                  <i className="fas fa-capsules text-[140px]"></i>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                      <i className="fas fa-bullseye text-xs"></i>
                    </div>
                    <h3 className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em]">靶向治疗参考</h3>
                  </div>
                  <p className="text-xl font-bold leading-snug drop-shadow-md">
                    {result.structuredData.targetedTherapy}
                  </p>
                </div>
              </div>
            )}

            {/* Grounding URLs - Styled as Cards */}
            {result.groundingUrls && result.groundingUrls.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-[#8E8E93] uppercase tracking-[0.2em] ml-6">国际数据库文献</h3>
                <div className="grid gap-3">
                  {result.groundingUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/60 backdrop-blur-sm px-6 py-4.5 rounded-2xl flex items-center justify-between group active:scale-[0.99] transition-all shadow-sm border border-white hover:border-blue-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <i className="fas fa-file-alt text-sm"></i>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#1C1C1E]">参考数据源 {idx + 1}</span>
                          <span className="text-[10px] text-[#8E8E93] truncate max-w-[200px]">{new URL(url).hostname}</span>
                        </div>
                      </div>
                      <i className="fas fa-arrow-right text-[10px] text-[#C7C7CC] group-hover:text-blue-500 group-hover:translate-x-1 transition-all"></i>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="px-8 py-6 text-center">
              <p className="text-[#8E8E93] text-[10px] font-medium leading-relaxed italic opacity-80 uppercase tracking-wider">
                {result.structuredData.disclaimer}
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-[#8E8E93] text-[10px] font-bold uppercase tracking-[0.3em] pb-16 opacity-50">
        Clinical Decision Support System
      </footer>
    </div>
  );
};

export default App;
