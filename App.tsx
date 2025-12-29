
import React, { useState, useEffect } from 'react';
import { FileText, RotateCcw, AlertCircle, ShieldCheck, List, Users, Key, ExternalLink, Lock, Calendar, Info, Cpu, Zap, Mail, Landmark, ShieldAlert, TrendingUp, DollarSign, MessageSquare, ArrowRight } from 'lucide-react';
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
  
  // Local API Key State
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const [showKeyOverlay, setShowKeyOverlay] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>('');

  useEffect(() => {
    // If no key in localStorage and no env key, force overlay
    if (!apiKey && !process.env.API_KEY) {
      setShowKeyOverlay(true);
    }
  }, [apiKey]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempKey.trim()) {
      localStorage.setItem('gemini_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowKeyOverlay(false);
      setTempKey('');
    }
  };

  const loadingMessages = [
    "Gemini 3 Pro is scanning entries...",
    "Decoding transaction narrations...",
    "Categorizing spending patterns...",
    "Reconciling balances and amounts...",
    "Building your financial profile...",
    "Almost ready with your insights...",
  ];

  useEffect(() => {
    let interval: number;
    if (status === AnalysisStatus.ANALYZING) {
      let i = 0;
      interval = window.setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 3000);
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
      // Pass the key specifically (local or env)
      const effectiveKey = apiKey || process.env.API_KEY || '';
      const analysisResult = await analyzeBankStatement(data, mimeType, effectiveKey);
      
      setResult(analysisResult);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      const msg = error.message || "";
      
      if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("401") || msg.includes("403")) {
        setShowKeyOverlay(true);
        setErrorMessage("Your API Key is invalid or expired. Please update it to continue.");
      } else {
        setErrorMessage(msg || "We encountered an error processing this statement.");
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

  // API Key Setup Overlay
  if (showKeyOverlay) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck size={120} />
            </div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                <FileText size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">StatementSense</h2>
            </div>
            <h3 className="text-2xl font-bold mb-3 leading-tight">API Key Required</h3>
            <p className="text-blue-100/80 font-medium text-sm leading-relaxed">
              Enter your Gemini API Key to enable local analysis. Your key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
          <div className="p-8 space-y-6">
            <form onSubmit={handleSaveKey} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Gemini API Key</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    placeholder="paste your key here..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-base transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center space-x-3 group"
              >
                <span>Save Key & Continue</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex flex-col items-center space-y-3">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-indigo-700 transition-colors"
              >
                <Landmark size={14} />
                <span>Get a free key from Google AI Studio</span>
                <ExternalLink size={12} />
              </a>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center">
                <ShieldCheck size={12} className="mr-1.5 text-emerald-500" />
                Zero-Knowledge Privacy
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={handleReset}>
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">
                Statement<span className="text-blue-600">Sense</span>
              </h1>
              <div className="flex items-center text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1.5"></div>
                <span>Private Engine Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setShowKeyOverlay(true)}
              className="hidden md:flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all border border-slate-200 active:scale-95"
            >
              <Key size={14} />
              <span>{apiKey ? 'CHANGE KEY' : 'SET API KEY'}</span>
            </button>
            {status !== AnalysisStatus.IDLE && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 text-sm text-slate-500 hover:text-blue-600 font-bold transition-all px-4 py-2 rounded-xl hover:bg-blue-50 active:scale-95"
              >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">New Scan</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {status === AnalysisStatus.IDLE && (
          <div className="max-w-4xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12 space-y-6">
              <div className="inline-flex items-center px-4 py-1.5 bg-blue-50 text-blue-700 text-[11px] font-black rounded-full uppercase tracking-[0.2em] border border-blue-100 shadow-sm">
                <Cpu size={14} className="mr-2" />
                Gemini 3 Pro Precision Analysis
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Master Your Finances <br/>
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">In One Secure Scan.</span>
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                Automatically extract transactions, detect patterns, and chat with your spending data. Private, precise, and professional.
              </p>
              
              <div className="bg-amber-50 border border-amber-100 rounded-[1.5rem] p-6 flex items-start space-x-4 text-amber-800 max-w-xl mx-auto shadow-sm animate-pulse">
                <div className="bg-amber-200 p-3 rounded-xl text-amber-700 shrink-0">
                   <Landmark size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-900 mb-0.5 uppercase tracking-wide">
                    HDFC Bank Support Only
                  </p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    This version is specifically optimized for <strong>HDFC Bank statements</strong>. Other formats may have reduced accuracy.
                  </p>
                </div>
              </div>
            </div>

            <FileUpload onFileSelect={handleFileSelect} />
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <Zap size={24} />
                </div>
                <h3 className="text-lg font-bold">Instant OCR</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">Extract tables, dates, and currency values with military-grade precision from images.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-emerald-200 transition-colors">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <ShieldAlert size={24} />
                </div>
                <h3 className="text-lg font-bold">Privacy First</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">Your financial documents are processed in memory. No data is stored on our servers.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-indigo-200 transition-colors">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-lg font-bold">Deep Insights</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">Get immediate summaries of your burn rate, merchant grouping, and monthly cashflow.</p>
              </div>
            </div>
          </div>
        )}

        {status === AnalysisStatus.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
            <div className="relative mb-12">
              <div className="w-32 h-32 border-[6px] border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                   <Cpu className="w-10 h-10 text-blue-600 animate-pulse" />
                </div>
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Analyzing Statement</h3>
            <p className="mt-4 text-slate-500 font-bold italic text-lg">{loadingMessage}</p>
          </div>
        )}

        {status === AnalysisStatus.ERROR && (
          <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-[2.5rem] border border-rose-100 shadow-2xl shadow-rose-100/50 text-center animate-in slide-in-from-bottom-8 duration-500">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-12 h-12 text-rose-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Analysis Interrupted</h3>
            <p className="text-slate-500 mb-8 leading-relaxed text-lg font-medium">{errorMessage}</p>
            
            <div className="mb-10 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left">
              <div className="flex items-center space-x-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-3">
                <Info size={12} />
                <span>Support Contact</span>
              </div>
              <p className="text-sm text-slate-600 font-medium mb-3">If you continue to face issues with your HDFC statement, reach out to us:</p>
              <a 
                href="mailto:shrynshgr@gmail.com" 
                className="flex items-center space-x-3 text-blue-600 hover:text-blue-700 font-bold text-base transition-colors group"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform">
                  <Mail size={16} />
                </div>
                <span>shrynshgr@gmail.com</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => selectedFile && handleFileSelect(selectedFile)}
                className="py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center space-x-3 shadow-lg active:scale-95"
              >
                <RotateCcw size={20} />
                <span>Retry Analysis</span>
              </button>
              <button
                onClick={handleReset}
                className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
              >
                Try Different File
              </button>
            </div>
          </div>
        )}

        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="space-y-3">
                <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
                  <ShieldCheck size={12} className="mr-1.5" />
                  Successfully Analyzed
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Statement Insights</h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center text-slate-500 font-bold text-sm">
                    <List size={16} className="mr-2 text-blue-500" />
                    {result.summary.transactionCount} Rows Extracted
                  </div>
                  {(result.summary.startDate || result.summary.endDate) && (
                    <div className="flex items-center space-x-2 text-sm text-slate-500 font-bold">
                      <Calendar size={16} className="text-blue-500" />
                      <span>{result.summary.startDate || 'N/A'} — {result.summary.endDate || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex p-1.5 bg-slate-100 rounded-2xl shadow-inner self-start lg:self-end">
                <button 
                  onClick={() => setActiveTab('transactions')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <List size={18} />
                  <span>LEDGER</span>
                </button>
                <button 
                  onClick={() => setActiveTab('payees')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'payees' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Users size={18} />
                  <span>PAYEES</span>
                </button>
              </div>
            </div>
            <StatsOverview data={result} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 space-y-10">
                <AnalysisCharts data={result} />
                {previewUrl && (
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden group">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Source Document</h4>
                      <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                        <FileText size={16} />
                      </div>
                    </div>
                    <div className="aspect-[3/4.2] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative">
                      {selectedFile?.type === 'application/pdf' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                          <FileText size={64} className="mb-4 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-widest">PDF Content Loaded</span>
                        </div>
                      ) : (
                        <img 
                          src={previewUrl} 
                          alt="Statement Preview" 
                          className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 cursor-zoom-in" 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-2">
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
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
           <div className="space-y-4 text-center md:text-left">
             <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">
               &copy; {new Date().getFullYear()} StatementSense &bull; Local Private Analysis
             </p>
             <p className="text-xs text-slate-500 font-medium">Currently optimized for HDFC Bank formats.</p>
           </div>
           
           <div className="flex flex-col items-center md:items-end space-y-4">
              <div className="flex items-center space-x-6 text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="flex items-center"><ShieldCheck size={12} className="mr-1.5 text-emerald-500" /> Secure Browser Session</span>
              </div>
              <a 
                href="mailto:shrynshgr@gmail.com" 
                className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 transition-all active:scale-95"
              >
                <Mail size={14} />
                <span>shrynshgr@gmail.com</span>
              </a>
           </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
