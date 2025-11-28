import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { User, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface PayeeAnalysisProps {
  transactions: Transaction[];
}

interface PayeeGroup {
  name: string;
  totalWithdrawals: number;
  totalDeposits: number;
  count: number;
  transactions: Transaction[];
}

const PayeeAnalysis: React.FC<PayeeAnalysisProps> = ({ transactions }) => {
  const [expandedPayee, setExpandedPayee] = useState<string | null>(null);

  const payeeGroups = useMemo(() => {
    const map = new Map<string, PayeeGroup>();
    
    transactions.forEach(t => {
      // Normalize name: use extracted name or fallback to "Other"
      let name = t.name ? t.name.trim() : 'Unknown / Other';
      if (name.length === 0) name = 'Unknown / Other';
      
      if (!map.has(name)) {
        map.set(name, {
          name,
          totalWithdrawals: 0,
          totalDeposits: 0,
          count: 0,
          transactions: []
        });
      }
      
      const group = map.get(name)!;
      group.totalWithdrawals += t.withdrawalAmount || 0;
      group.totalDeposits += t.depositAmount || 0;
      group.count += 1;
      group.transactions.push(t);
    });

    // Sort by total volume (deposits + withdrawals) descending
    return Array.from(map.values()).sort((a, b) => 
      (b.totalWithdrawals + b.totalDeposits) - (a.totalWithdrawals + a.totalDeposits)
    );
  }, [transactions]);

  const toggleExpand = (name: string) => {
    setExpandedPayee(expandedPayee === name ? null : name);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (payeeGroups.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">Transactions by Payee/Payer</h3>
        <p className="text-sm text-slate-500 mt-1">Grouped by extracted names from narration</p>
      </div>

      <div className="divide-y divide-slate-50">
        {payeeGroups.map((group) => (
          <div key={group.name} className="bg-white transition-colors hover:bg-slate-50">
            <div 
              className="p-4 cursor-pointer flex items-center justify-between"
              onClick={() => toggleExpand(group.name)}
            >
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{group.name}</h4>
                  <p className="text-xs text-slate-500">{group.count} Transaction{group.count !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right hidden sm:block">
                  {group.totalDeposits > 0 && (
                    <div className="flex items-center text-emerald-600 text-sm">
                      <ArrowDownLeft size={14} className="mr-1" />
                      {formatCurrency(group.totalDeposits)}
                    </div>
                  )}
                  {group.totalWithdrawals > 0 && (
                    <div className="flex items-center text-rose-600 text-sm">
                      <ArrowUpRight size={14} className="mr-1" />
                      {formatCurrency(group.totalWithdrawals)}
                    </div>
                  )}
                </div>
                {expandedPayee === group.name ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </div>
            </div>

            {expandedPayee === group.name && (
              <div className="bg-slate-50 p-4 border-t border-slate-100 animate-fade-in">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase border-b border-slate-200">
                      <th className="py-2 pl-2">Date</th>
                      <th className="py-2">Narration</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {group.transactions.map((t, idx) => (
                      <tr key={idx}>
                        <td className="py-3 pl-2 whitespace-nowrap text-slate-600">{t.date}</td>
                        <td className="py-3 text-slate-600 text-xs sm:text-sm">{t.narration}</td>
                        <td className="py-3 text-right font-mono">
                          {t.withdrawalAmount > 0 ? (
                            <span className="text-rose-600">-{formatCurrency(t.withdrawalAmount)}</span>
                          ) : (
                            <span className="text-emerald-600">+{formatCurrency(t.depositAmount)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PayeeAnalysis;