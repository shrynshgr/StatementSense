import React from 'react';
import { AnalysisResult } from '../types';
import { TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';

interface StatsOverviewProps {
  data: AnalysisResult;
}

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtext?: string;
  colorClass: string;
}> = ({ title, value, icon, colorClass, subtext }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
        {icon}
      </div>
    </div>
    {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
  </div>
);

const StatsOverview: React.FC<StatsOverviewProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR', // Assuming INR based on sample doc, could be dynamic
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Total Deposits"
        value={formatCurrency(data.summary.totalDeposits)}
        icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
        colorClass="bg-emerald-100 text-emerald-600"
      />
      <StatCard
        title="Total Withdrawals"
        value={formatCurrency(data.summary.totalWithdrawals)}
        icon={<TrendingDown className="w-6 h-6 text-rose-600" />}
        colorClass="bg-rose-100 text-rose-600"
      />
      <StatCard
        title="Net Movement"
        value={formatCurrency(data.summary.netMovement)}
        icon={<Wallet className="w-6 h-6 text-blue-600" />}
        colorClass="bg-blue-100 text-blue-600"
        subtext={data.summary.netMovement >= 0 ? "+ Positive Cashflow" : "- Negative Cashflow"}
      />
      <StatCard
        title="Transactions"
        value={data.summary.transactionCount.toString()}
        icon={<Activity className="w-6 h-6 text-indigo-600" />}
        colorClass="bg-indigo-100 text-indigo-600"
        subtext="Total processed rows"
      />
    </div>
  );
};

export default StatsOverview;