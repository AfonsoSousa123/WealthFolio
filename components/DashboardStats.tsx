import React from 'react';
import { PortfolioStats } from '../types';
import { useTranslation } from 'react-i18next';

interface DashboardStatsProps {
  stats: PortfolioStats;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const { t } = useTranslation();
  const isProfitable = stats.totalGainLoss >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div className="relative overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/5 p-6 flex flex-col justify-between transition-all hover:shadow-md dark:hover:border-white/10 group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <svg className="w-24 h-24 text-slate-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
        </div>
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t('Total Value')}</h3>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            €{stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="h-1 w-12 bg-blue-500 rounded-full mt-4"></div>
      </div>

      <div className="relative overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/5 p-6 flex flex-col justify-between transition-all hover:shadow-md dark:hover:border-white/10 group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <svg className="w-24 h-24 text-slate-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
        </div>
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t('Cost Basis')}</h3>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            €{stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="h-1 w-12 bg-purple-500 rounded-full mt-4"></div>
      </div>

      <div className="relative overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/5 p-6 flex flex-col justify-between transition-all hover:shadow-md dark:hover:border-white/10 group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <svg className="w-24 h-24 text-slate-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
        </div>
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t('Total Gain/Loss')}</h3>
          <div className="flex flex-wrap items-baseline gap-3">
            <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isProfitable ? '+€' : '-€'}{Math.abs(stats.totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isProfitable ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'}`}>
              {isProfitable ? '+' : ''}{stats.totalGainLossPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className={`h-1 w-12 rounded-full mt-4 ${isProfitable ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
      </div>
    </div>
  );
};