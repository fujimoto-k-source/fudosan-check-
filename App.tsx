
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { checkComplianceWithFiles } from './services/geminiService';
import { ComplianceReport } from './types';
import { JudgmentBadge } from './components/JudgmentBadge';

const App: React.FC = () => {
  const [adText, setAdText] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | undefined>();
  
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designPreview, setDesignPreview] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn("Location permission denied.")
      );
    }
  }, []);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenceFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_txt(wb.Sheets[wsname]);
        setEvidenceText(data);
      } catch (err) {
        setError("エクセル解析エラー");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDesignFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => setDesignPreview(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      let designData;
      if (designPreview) {
        designData = { data: designPreview, mimeType: designFile?.type || 'application/pdf' };
      }
      const result = await checkComplianceWithFiles(adText, evidenceText, designData as any, userLocation);
      setReport(result);
    } catch (err: any) {
      setError("AI解析中にエラーが発生しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyFullReport = () => {
    if (!report) return;
    const text = `【不動産広告審査レポート】\n総評: ${report.overallComment}\n\n` + 
      report.results.map(r => `・${r.item}: [${r.judgment}] ${r.suggestion}\n  (事実: ${r.factCheckResult})`).join('\n\n') +
      (report.revisedAdCopy ? `\n\n【修正案】\n${report.revisedAdCopy}` : "");
    navigator.clipboard.writeText(text);
    alert("レポート全文をコピーしました。チャット等に貼り付けて共有できます。");
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-900 pb-20">
      <nav className="no-print bg-[#0F172A] border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-shield-halved text-white text-xl"></i>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">AD-CHECK ENTERPRISE</span>
              <div className="text-[10px] font-bold text-slate-400 tracking-widest -mt-1 uppercase">Compliance Engine</div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="no-print animate-fade-in">
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900">広告審査を、<span className="text-indigo-600">もっと速く、正確に。</span></h2>
            <p className="text-slate-500 mt-2 font-medium">物件原本と広告案を照合し、公正規約に基づきAIが自動校閲します。</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                   <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 font-black">1</span>
                   物件原本 (Excel)
                </h3>
                <div className="relative border-2 border-dashed rounded-2xl p-6 text-center bg-slate-50 border-slate-200 hover:border-indigo-400 transition-all cursor-pointer">
                  <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <i className="fas fa-file-excel text-2xl text-slate-300 mb-2"></i>
                  <p className="text-xs font-bold text-slate-500">{evidenceFile ? evidenceFile.name : 'Excelファイルをアップロード'}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                   <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 font-black">2</span>
                   広告案 / キャッチコピー
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea
                    value={adText}
                    onChange={(e) => setAdText(e.target.value)}
                    placeholder="修正したいテキスト案を入力してください..."
                    className="w-full h-32 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <div className="relative border-2 border-dashed rounded-2xl p-4 text-center bg-slate-50 border-slate-200 hover:border-indigo-400 transition-all">
                    <input type="file" onChange={handleDesignUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <i className="fas fa-image text-2xl text-slate-300 mb-2"></i>
                    <p className="text-xs font-bold text-slate-500">{designFile ? designFile.name : '制作データ(PDF/画像)\nをアップロード'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!evidenceFile && !adText)}
              className={`px-12 py-5 rounded-2xl font-black text-lg text-white shadow-xl transition-all ${
                isAnalyzing || (!evidenceFile && !adText) ? 'bg-slate-300' : 'bg-[#0F172A] hover:scale-105'
              }`}
            >
              {isAnalyzing ? <><i className="fas fa-spinner fa-spin mr-2"></i>解析中...</> : 'コンプライアンス診断を実行'}
            </button>
          </div>
        </div>

        {report && (
          <div className="mt-16 space-y-10 animate-fade-in-up">
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-8 md:p-12 bg-[#0F172A] text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h2 className="text-3xl font-black mb-2">診断レポート</h2>
                  <p className="text-slate-400 text-sm italic">AIによる公正競争規約との照合結果</p>
                </div>
                <div className="flex gap-4 no-print">
                  <button onClick={copyFullReport} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold text-sm transition border border-white/10">
                    <i className="fas fa-copy mr-2"></i> チャット用にコピー
                  </button>
                  <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg">
                    <i className="fas fa-print mr-2"></i> 印刷 / PDF保存
                  </button>
                </div>
              </div>

              <div className="p-8 bg-indigo-50/50 border-b border-indigo-100">
                <div className="flex items-start">
                  <div className="bg-indigo-100 p-3 rounded-xl mr-4"><i className="fas fa-comment-dots text-indigo-600"></i></div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-1">総評</h4>
                    <p className="text-slate-700 font-bold leading-relaxed">{report.overallComment}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {['項目', '記載内容', 'ファクトチェック', '判定', '修正指示'].map(h => (
                        <th key={h} className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.results.map((res, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="px-8 py-6 font-black text-slate-800 text-sm">{res.item}</td>
                        <td className="px-8 py-6 text-slate-500 text-sm">{res.originalContent}</td>
                        <td className="px-8 py-6 text-slate-600 text-sm italic font-medium">{res.factCheckResult}</td>
                        <td className="px-8 py-6"><JudgmentBadge judgment={res.judgment} /></td>
                        <td className="px-8 py-6 text-sm font-bold text-slate-900">{res.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {report.revisedAdCopy && (
              <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-xl">
                <h3 className="text-xl font-black mb-6 flex items-center">
                  <i className="fas fa-pen-nib mr-3 text-indigo-600"></i> 修正後の完成原稿案
                </h3>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 font-bold leading-loose text-slate-800 whitespace-pre-wrap">
                  {report.revisedAdCopy}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
