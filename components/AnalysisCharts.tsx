
import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisChartsProps {
  data: AnalysisResult;
}

const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ data }) => {
  // Fix: Explicitly cast entries to [string, number][] to avoid 'unknown' or 'any' types in arithmetic operations
  const categories = (Object.entries(data.summary.categories) as [string, number][]).sort((a, b) => b[1] - a[1]);
  // Fix: Provide a fallback of 1 for maxVal to satisfy Math.max parameter requirements and prevent division by zero
  const maxVal = Math.max(...categories.map(c => c[1]), 1);

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      Food: 'bg-orange-500',
      Shopping: 'bg-pink-500',
      Housing: 'bg-blue-500',
      Transport: 'bg-yellow-500',
      Utilities: 'bg-cyan-500',
      Healthcare: 'bg-red-500',
      Entertainment: 'bg-purple-500',
      Salary: 'bg-emerald-500',
      Transfer: 'bg-slate-500',
      Other: 'bg-slate-400'
    };
    return colors[cat] || 'bg-slate-300';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">Spending by Category</h3>
        <div className="space-y-4">
          {categories.slice(0, 6).map(([name, amount]) => (
            <div key={name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">{name}</span>
                <span className="text-slate-900 font-mono">₹{amount.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getCategoryColor(name)} transition-all duration-1000`} 
                  // Fix: amount and maxVal are now correctly typed as numbers
                  style={{ width: `${(amount / maxVal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
        <div className="relative w-40 h-40">
           {/* Simple SVG Donut Placeholder */}
           <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
             <path
               className="text-slate-100"
               stroke="currentColor"
               strokeWidth="3"
               fill="none"
               d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
             />
             <path
               className="text-blue-500"
               stroke="currentColor"
               strokeWidth="3"
               // Fix: Added safety check to prevent NaN if the total balance is zero
               strokeDasharray={`${(data.summary.totalWithdrawals / (data.summary.totalWithdrawals + data.summary.totalDeposits || 1)) * 100}, 100`}
               fill="none"
               d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
             />
           </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center">
             <span className="text-xs text-slate-400 uppercase">Withdrawals</span>
             <span className="text-lg font-bold text-slate-800">
               {/* Fix: Added safety check to prevent NaN if the total balance is zero */}
               {Math.round((data.summary.totalWithdrawals / (data.summary.totalWithdrawals + data.summary.totalDeposits || 1)) * 100)}%
             </span>
           </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-slate-500 max-w-[200px]">
            Withdrawals represent the major portion of your account activity this period.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCharts;
