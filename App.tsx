
import React, { useState, useEffect } from 'react';
import { FileText, RotateCcw, AlertCircle, ShieldCheck, List, Users, Key, ExternalLink, Lock, Calendar, Info, Cpu, Zap, Mail, Landmark, ShieldAlert } from 'lucide-react';
import FileUpload from './components/FileUpload';
import StatsOverview from './components/StatsOverview';
import TransactionTable from './components/TransactionTable';
import PayeeAnalysis from './components/PayeeAnalysis';
import AnalysisCharts from './components/AnalysisCharts';
import ChatPanel from './components/ChatPanel';
import { analyzeBankStatement, fileToGenerativePart } from './services/geminiService';
import { AnalysisResult, AnalysisStatus } from './types';

function App() {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'payees'>('transactions');
  const [loadingMessage, setLoadingMessage] = useState('Initializing Analyst...');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (err) {
        console.error("Failed to open key selection", err);
      }
    }
  };

  const loadingMessages = [
    "Optimizing document for AI...",
    "Scanning table structure...",
    "Gemini 3 Pro is reasoning over entries...",
    "Checking math and balances...",
    "Cleaning up merchant names...",
    "Finalizing your financial report...",
  ];

  useEffect(() => {
    let interval: number;
    if (status === AnalysisStatus.ANALYZING) {
      let i = 0;
      interval = window.setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setStatus(AnalysisStatus.ANALYZING);
    setErrorMessage('');
    
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const { data, mimeType } = await fileToGenerativePart(file);
      const analysisResult = await analyzeBankStatement(data, mimeType);
      
      setResult(analysisResult);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error: any) {
      console.error("App Error Handler:", error);
      const msg = error.message || "";
      
      if (msg.includes("Requested entity was not found") || msg.includes("API Key")) {
        setHasApiKey(false);
        setErrorMessage("Your API Key is missing or invalid. Please select a valid key from a paid GCP project.");
      } else {
        setErrorMessage(msg || "We encountered an error processing this document.");
      }
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setSelectedFile(null);
    setErrorMessage('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // Mandatory Key Selection Screen - Compact Version
  if (hasApiKey === false || (hasApiKey === null && !process.env.API_KEY)) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/30">
              <Key size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">StatementSense</h2>
            <p className="text-blue-100 font-medium text-xs opacity-80 uppercase tracking-widest">Setup Required</p>
          </div>
          
          <div className="p-6 text-center">
            <p className="text-slate-600 mb-6 leading-relaxed text-sm">
              Use your own Gemini API Key for private analysis. No data is stored or shared.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleSelectKey}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-100 flex items-center justify-center space-x-3 group active:scale-[0.98]"
              >
                <span>Select API Key</span>
                <Key size={18} className="group-hover:rotate-12 transition-transform" />
              </button>
              <div className="pt-4 border-t border-slate-100">
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-indigo-700 transition-colors py-2"
                >
                  <Landmark size={14} />
                  <span>Setup Billing Guide</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-4 flex items-center justify-center space-x-2 text-slate-400 border-t border-slate-100">
            <ShieldAlert size={12} />
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">Privacy First Engine</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                Statement<span className="text-blue-600">Sense</span>
              </h1>
              <div className="flex items-center text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                <ShieldCheck size={10} className="mr-1" />
                <span>Zero Storage Privacy</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectKey}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-colors border border-slate-200"
            >
              <Key size={12} />
              <span>CHANGE KEY</span>
            </button>
            {status !== AnalysisStatus.IDLE && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 text-sm text-slate-500 hover:text-blue-600 font-semibold transition-all px-4 py-2 rounded-lg hover:bg-blue-50"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-full text-[10px] font-bold text-blue-600 border border-blue-100">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>PRO 3.0 ENGINE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {status === AnalysisStatus.IDLE && (
          <div className="max-w-3xl mx-auto mt-12 animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-widest flex items-center">
                  <Cpu size={12} className="mr-1.5" />
                  Gemini 3 Pro
                </span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-widest flex items-center">
                  <Zap size={12} className="mr-1.5" />
                  Enhanced OCR
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight text-balance">
                High Precision <br/><span className="text-blue-600">Statement Analysis.</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-xl mx-auto mb-6">
                Extract every transaction with high accuracy using local, AI-powered document reasoning.
              </p>
              
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start space-x-4 text-amber-800 max-w-lg mx-auto mb-8 shadow-sm">
                <div className="bg-amber-200 p-2.5 rounded-xl text-amber-700 shrink-0">
                   <Landmark size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-900 mb-0.5">
                    HDFC Bank Support Only
                  </p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Currently optimized specifically for <strong>HDFC Bank statements</strong>. Support for more banks will be added in future updates.
                  </p>
                </div>
              </div>
            </div>
            
            <FileUpload onFileSelect={handleFileSelect} />
            
            <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Smart Extraction", desc: "Intelligent recognition of HDFC transaction layouts and patterns." },
                { title: "Safe & Local", desc: "Analysis results are never stored on any server. Privacy first." },
                { title: "Interactive Chat", desc: "Ask specific questions about your HDFC spending after the scan." }
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === AnalysisStatus.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Cpu className="w-10 h-10 text-blue-600 animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 text-xl font-bold text-slate-900">Processing Your Data</h3>
            <p className="mt-2 text-slate-500 font-medium italic max-w-sm">{loadingMessage}</p>
          </div>
        )}

        {status === AnalysisStatus.ERROR && (
          <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl border border-rose-100 shadow-xl text-center animate-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Analysis Failed</h3>
            <p className="text-slate-500 mb-4 leading-relaxed">{errorMessage}</p>
            
            <div className="mb-8 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-2">Need help?</p>
              <a 
                href="mailto:shrynshgr@gmail.com" 
                className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
              >
                <Mail size={14} />
                <span>shrynshgr@gmail.com</span>
              </a>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => selectedFile && handleFileSelect(selectedFile)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCcw size={18} />
                <span>Retry Analysis</span>
              </button>
              <button
                onClick={handleReset}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Try Different File
              </button>
            </div>
          </div>
        )}

        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Analysis Summary</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-sm text-slate-500 font-medium">Processed {result.summary.transactionCount} transactions.</p>
                  {(result.summary.startDate || result.summary.endDate) && (
                    <div className="flex items-center space-x-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-bold">
                      <Calendar size={12} />
                      <span>{result.summary.startDate || '?'} — {result.summary.endDate || '?'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex p-1 bg-slate-200/50 rounded-xl shadow-inner">
                <button 
                  onClick={() => setActiveTab('transactions')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <List size={16} />
                  <span>Ledger</span>
                </button>
                <button 
                  onClick={() => setActiveTab('payees')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'payees' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Users size={16} />
                  <span>Payees</span>
                </button>
              </div>
            </div>

            <StatsOverview data={result} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <AnalysisCharts data={result} />
                {previewUrl && (
                  <div className="mt-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Document Source</h4>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-100 bg-slate-50 relative group">
                      {selectedFile?.type === 'application/pdf' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <FileText size={48} className="mb-2" />
                          <span className="text-xs font-medium">PDF View Not Available</span>
                        </div>
                      ) : (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="lg:col-span-2 space-y-8">
                {activeTab === 'transactions' ? (
                  <TransactionTable transactions={result.transactions} />
                ) : (
                  <PayeeAnalysis transactions={result.transactions} />
                )}
              </div>
            </div>
            <ChatPanel transactions={result.transactions} />
          </div>
        )}
      </main>
      
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 text-center">
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            StatementSense &bull; High Precision Financial AI &bull; {new Date().getFullYear()}
          </p>
          <div className="flex flex-col items-center space-y-2">
            <p className="text-[11px] text-slate-500 font-medium">Currently HDFC Bank only. More banks coming soon.</p>
            <p className="text-[11px] text-slate-500 font-medium">Facing any problems or issues?</p>
            <a 
              href="mailto:shrynshgr@gmail.com" 
              className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 transition-colors"
            >
              <Mail size={12} />
              <span>Contact: shrynshgr@gmail.com</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
