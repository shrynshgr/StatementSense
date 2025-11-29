import React, { useState } from 'react';
import { Transaction } from '../types';
import { Users, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface PayeeAnalysisProps {
  transactions: Transaction[];
}

interface PayeeData {
  totalWithdrawal: number;
  totalDeposit: number;
  items: Transaction[];
}

const PayeeAnalysis: React.FC<PayeeAnalysisProps> = ({ transactions }) => {
  const grouped = transactions.reduce((acc, t) => {
    const name = t.name && t.name.trim().length > 0 ? t.name : 'Other Transactions';
    if (!acc[name]) {
      acc[name] = { totalWithdrawal: 0, totalDeposit: 0, items: [] };
    }
    acc[name].items.push(t);
    acc[name].totalWithdrawal += t.withdrawalAmount || 0;
    acc[name].totalDeposit += t.depositAmount || 0;
    return acc;
  }, {} as Record<string, PayeeData>);

  const sortedNames = Object.keys(grouped).sort();

  const handleExportCSV = () => {
    const headers = ["Payee Name", "Date", "Narration", "Reference No", "Withdrawal", "Deposit"];
    const rows: string[] = [];

    sortedNames.forEach(name => {
      grouped[name].items.forEach(t => {
        rows.push([
          `"${name.replace(/"/g, '""')}"`,
          `"${t.date}"`,
          `"${t.narration.replace(/"/g, '""')}"`,
          `"${t.referenceNo || ''}"`,
          t.withdrawalAmount || 0,
          t.depositAmount || 0
        ].join(","));
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payee_analysis_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-2">
            <Users className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Payee Analysis</h3>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {sortedNames.map(name => (
            <PayeeGroup key={name} name={name} data={grouped[name]} />
        ))}
        {sortedNames.length === 0 && (
            <div className="p-8 text-center text-slate-400">No payee data extracted.</div>
        )}
      </div>
    </div>
  );
};

interface PayeeGroupProps {
  name: string;
  data: PayeeData;
}

const PayeeGroup: React.FC<PayeeGroupProps> = ({ name, data }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="bg-white hover:bg-slate-50 transition-colors">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
            >
                <div className="flex items-center space-x-4">
                    <span className="font-medium text-slate-900">{name}</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{data.items.length} txns</span>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="text-right text-sm font-mono">
                        {data.totalDeposit > 0 && <span className="text-emerald-600 mr-3">+{data.totalDeposit.toLocaleString()}</span>}
                        {data.totalWithdrawal > 0 && <span className="text-rose-600">-{data.totalWithdrawal.toLocaleString()}</span>}
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>
            {isOpen && (
                <div className="bg-slate-50 p-4 border-t border-slate-100 pl-12">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-slate-500 uppercase text-left">
                                <th className="pb-2 font-medium">Date</th>
                                <th className="pb-2 font-medium">Narration</th>
                                <th className="pb-2 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {data.items.map((t, i) => (
                                <tr key={i}>
                                    <td className="py-2 text-slate-600 w-24">{t.date}</td>
                                    <td className="py-2 text-slate-600">{t.narration}</td>
                                    <td className="py-2 text-right font-mono">
                                        {t.withdrawalAmount > 0 ? (
                                            <span className="text-rose-600">-{t.withdrawalAmount.toLocaleString()}</span>
                                        ) : (
                                            <span className="text-emerald-600">+{t.depositAmount.toLocaleString()}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default PayeeAnalysis;