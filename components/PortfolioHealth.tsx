import React, { useState } from 'react';
import { Asset } from '../types';
import { useTranslation } from 'react-i18next';
import { RebalancingModal } from './RebalancingModal';

interface PortfolioHealthProps {
  assets: Asset[];
}

export const PortfolioHealth: React.FC<PortfolioHealthProps> = ({ assets }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const totalValue = assets.reduce((sum, a) => sum + (a.quantity * a.currentPrice), 0);
  
  const rebalancingData = assets
    .filter(a => a.allocation && a.allocation > 0)
    .map(a => {
      const currentVal = a.quantity * a.currentPrice;
      const currentPct = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;
      const targetPct = a.allocation || 0;
      const diff = currentPct - targetPct;
      
      return {
        ...a,
        currentPct,
        targetPct,
        diff,
        needsAttention: Math.abs(diff) > 5 // Threshold 5%
      };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const criticalIssues = rebalancingData.filter(d => d.needsAttention);

  if (assets.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 transition-all">
      {/* Rebalancing Panel */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col transition-all">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('Rebalancing Status')}
          </h3>
          {criticalIssues.length > 0 && (
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-md animate-pulse">
              {criticalIssues.length} {t('Assets need attention')}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {rebalancingData.slice(0, 4).map((item) => (
            <div key={item.id} className="group">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{item.symbol}</span>
                  <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded uppercase">{t(item.type)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('Current vs Target')}</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {item.currentPct.toFixed(1)}% <span className="text-slate-400 font-normal mx-1">/</span> {item.targetPct}%
                    </p>
                  </div>
                  <div className={`w-12 text-center text-xs font-bold px-2 py-1 rounded ${item.diff > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
                    {item.diff > 0 ? '+' : ''}{item.diff.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                 <div 
                   className={`h-full absolute top-0 left-0 transition-all duration-1000 ${item.needsAttention ? 'bg-gradient-to-r from-amber-400 to-rose-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-blue-500'}`}
                   style={{ width: `${Math.min(item.currentPct, 100)}%` }}
                 ></div>
                 <div 
                   className="h-full absolute top-0 w-0.5 bg-slate-900 dark:bg-white z-10 opacity-30" 
                   style={{ left: `${item.targetPct}%` }}
                 ></div>
              </div>
            </div>
          ))}
          {rebalancingData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p className="text-xs font-medium">{t('No allocation targets set')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Diversification Card */}
      <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-lg border border-blue-500 dark:border-slate-700 p-6 flex flex-col justify-between text-white transition-all hover:scale-[1.02] duration-300 group overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
           <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <div className="relative z-10">
          <h3 className="text-white/80 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">{t('Portfolio Health')}</h3>
          
          <div className="mb-6">
            <span className="text-4xl font-black text-white dark:bg-clip-text dark:text-transparent dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-400">
              {rebalancingData.length > 0 ? (100 - (criticalIssues.length / rebalancingData.length) * 50).toFixed(0) : '100'}
            </span>
            <span className="text-xl font-bold ml-1 text-white/90">/ 100</span>
          </div>

          <div className="space-y-3">
             <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${criticalIssues.length === 0 ? 'bg-emerald-300 dark:bg-emerald-400' : 'bg-amber-300 dark:bg-amber-400'}`}></div>
                <span className="text-white/90 dark:text-slate-300 font-medium">
                  {criticalIssues.length === 0 ? t('Diversification is optimal') : t('High concentration risk detected')}
                </span>
             </div>
             <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-cyan-200 dark:bg-blue-400"></div>
                <span className="text-white/90 dark:text-slate-300 font-medium">{assets.length} {t('Active positions')}</span>
             </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="mt-6 w-full py-2.5 bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 border border-white/20 dark:border-white/10 rounded-xl text-xs font-bold transition-all backdrop-blur-sm text-white"
        >
           {t('View Rebalancing Plan')}
        </button>
      </div>

      {isModalOpen && (
        <RebalancingModal assets={assets} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};
