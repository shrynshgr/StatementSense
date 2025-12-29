
import React, { useState } from 'react';
import { Transaction } from '../types';
import { Download, Search, Filter } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(t => 
    t.narration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleExportCSV = () => {
    const headers = ["Date", "Narration", "Category", "Reference No", "Withdrawal", "Deposit", "Balance"];
    const csvContent = [
      headers.join(","),
      ...transactions.map(t => [
        `"${t.date}"`,
        `"${t.narration.replace(/"/g, '""')}"`,
        `"${t.category}"`,
        `"${t.referenceNo || ''}"`,
        t.withdrawalAmount,
        t.depositAmount,
        t.closingBalance
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `statement_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryStyles = (cat: string) => {
    const styles: Record<string, string> = {
      Food: 'bg-orange-50 text-orange-600',
      Shopping: 'bg-pink-50 text-pink-600',
      Salary: 'bg-emerald-50 text-emerald-600',
      Transfer: 'bg-slate-100 text-slate-600',
      Utilities: 'bg-cyan-50 text-cyan-600',
      Housing: 'bg-blue-50 text-blue-600',
    };
    return styles[cat] || 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-800">Transaction History</h3>
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <th className="p-4 border-b border-slate-100">Date</th>
              <th className="p-4 border-b border-slate-100">Details</th>
              <th className="p-4 border-b border-slate-100">Category</th>
              <th className="p-4 border-b border-slate-100 text-right">Withdrawal</th>
              <th className="p-4 border-b border-slate-100 text-right">Deposit</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-50">
            {filteredTransactions.map((t, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 whitespace-nowrap font-medium text-slate-500">{t.date}</td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">{t.name || t.narration.substring(0, 30)}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{t.narration}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded-full ${getCategoryStyles(t.category)}`}>
                    {t.category}
                  </span>
                </td>
                <td className="p-4 text-right font-mono text-rose-600 font-medium">
                  {t.withdrawalAmount > 0 ? `₹${t.withdrawalAmount.toLocaleString()}` : '-'}
                </td>
                <td className="p-4 text-right font-mono text-emerald-600 font-medium">
                  {t.depositAmount > 0 ? `₹${t.depositAmount.toLocaleString()}` : '-'}
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                  No matching transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
