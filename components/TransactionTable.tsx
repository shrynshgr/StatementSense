import React from 'react';
import { Transaction } from '../types';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  
  const handleExportCSV = () => {
    const headers = ["Date", "Narration", "Reference No", "Withdrawal", "Deposit", "Balance"];
    const csvContent = [
      headers.join(","),
      ...transactions.map(t => [
        `"${t.date}"`,
        `"${t.narration.replace(/"/g, '""')}"`,
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">Transaction Details</h3>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <th className="p-4 border-b border-slate-100">Date</th>
              <th className="p-4 border-b border-slate-100 w-1/3">Narration</th>
              <th className="p-4 border-b border-slate-100 text-right text-rose-600">Withdrawal</th>
              <th className="p-4 border-b border-slate-100 text-right text-emerald-600">Deposit</th>
              <th className="p-4 border-b border-slate-100 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-50">
            {transactions.map((t, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 whitespace-nowrap font-medium text-slate-600">{t.date}</td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">{t.narration}</span>
                    {t.referenceNo && (
                      <span className="text-xs text-slate-400 mt-1">Ref: {t.referenceNo}</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right font-mono">
                  {t.withdrawalAmount > 0 ? (
                    <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded">
                      -{t.withdrawalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="p-4 text-right font-mono">
                  {t.depositAmount > 0 ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      +{t.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="p-4 text-right font-mono font-medium text-slate-900">
                  {t.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No transactions found.
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