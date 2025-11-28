import React, { useState } from 'react';
import { FileText, RotateCcw, Loader2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import StatsOverview from './components/StatsOverview';
import TransactionTable from './components/TransactionTable';
import PayeeAnalysis from './components/PayeeAnalysis';
import { analyzeBankStatement, fileToGenerativePart } from './services/geminiService';
import { AnalysisResult, AnalysisStatus } from './types';

function App() {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setStatus(AnalysisStatus.ANALYZING);
    setErrorMessage(null);
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const { data, mimeType } = await fileToGenerativePart(file);
      const analysisResult = await analyzeBankStatement(data, mimeType);
      setResult(analysisResult);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Unknown error occurred");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setSelectedFile(null);
    setErrorMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              StatementSense
            </h1>
          </div>
          {status !== AnalysisStatus.IDLE && (
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
            >
              <RotateCcw size={16} />
              <span>Analyze Another</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* State: IDLE - Upload Prompt */}
        {status === AnalysisStatus.IDLE && (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Unlock Your Bank Statement Data
              </h2>
              <p className="text-lg text-slate-600">
                Upload a PDF or image of your bank statement to instantly extract transactions, 
                calculate totals, and export to Excel/CSV.
              </p>
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 font-bold">1</div>
                <h3 className="font-semibold mb-2">Upload File</h3>
                <p className="text-sm text-slate-500">Take a photo or upload a PDF scan of your statement.</p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 font-bold">2</div>
                <h3 className="font-semibold mb-2">AI Extraction</h3>
                <p className="text-sm text-slate-500">Our advanced AI reads the text, dates, and amounts accurately.</p>
              </div>
              <div className="p-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 font-bold">3</div>
                <h3 className="font-semibold mb-2">View & Export</h3>
                <p className="text-sm text-slate-500">See your spending in a clean table and export to CSV.</p>
              </div>
            </div>
          </div>
        )}

        {/* State: ANALYZING - Loading View */}
        {status === AnalysisStatus.ANALYZING && (
          <div className="flex flex-col items-center justify-center mt-20 space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-white p-4 rounded-full shadow-lg border border-slate-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
            </div>
            <div className="text-center max-w-md">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Analyzing your statement...</h3>
              <p className="text-slate-500">
                Please wait while we extract transaction details. This usually takes 5-10 seconds.
              </p>
            </div>
          </div>
        )}

        {/* State: ERROR - Error View */}
        {status === AnalysisStatus.ERROR && (
          <div className="max-w-md mx-auto mt-20 text-center bg-white p-8 rounded-xl shadow-sm border border-rose-100">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Analysis Failed</h3>
            <p className="text-slate-500 mb-4">
              We couldn't read the transactions from this file. Please ensure it is clear, well-lit, and contains a visible table structure.
            </p>
            {errorMessage && (
               <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm mb-6 break-words">
                 Error details: {errorMessage}
               </div>
            )}
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* State: SUCCESS - Results View */}
        {status === AnalysisStatus.SUCCESS && result && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              
              {/* Left Column: Stats & Table */}
              <div className="flex-1 w-full">
                <StatsOverview data={result} />
                <PayeeAnalysis transactions={result.transactions} />
                <TransactionTable transactions={result.transactions} />
              </div>

              {/* Right Column: Source Image/PDF Preview (Sticky) */}
              <div className="lg:w-80 w-full shrink-0">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                    <span>Source Document</span>
                    <span className="text-xs font-normal text-slate-400">
                      {selectedFile?.name.length! > 20 ? selectedFile?.name.substring(0, 20) + '...' : selectedFile?.name}
                    </span>
                  </h4>
                  <div className="relative rounded-lg overflow-hidden border border-slate-100 bg-slate-50 aspect-[3/4] group">
                    {previewUrl && (
                      selectedFile?.type === 'application/pdf' ? (
                        <object
                          data={previewUrl}
                          type="application/pdf"
                          className="w-full h-full"
                          title="PDF Preview"
                        >
                          <div className="flex items-center justify-center h-full text-sm text-slate-400 p-4 text-center">
                            PDF Preview Not Available
                          </div>
                        </object>
                      ) : (
                        <img 
                          src={previewUrl} 
                          alt="Statement Preview" 
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                        />
                      )
                    )}
                  </div>
                  <div className="mt-4 text-xs text-slate-400 text-center">
                    Review the original document to verify extracted data accuracy.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;