import React from 'react';
import { Asset } from '../types';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

interface RebalancingModalProps {
  assets: Asset[];
  onClose: () => void;
}

export const RebalancingModal: React.FC<RebalancingModalProps> = ({ assets, onClose }) => {
  const { t } = useTranslation();
  
  const totalValue = assets.reduce((sum, a) => sum + (a.quantity * a.currentPrice), 0);
  
  const rebalancingPlan = assets
    .filter(a => a.allocation && a.allocation > 0)
    .map(a => {
      const currentVal = a.quantity * a.currentPrice;
      const targetVal = totalValue * ((a.allocation || 0) / 100);
      const diffVal = targetVal - currentVal;
      
      return {
        ...a,
        currentVal,
        targetVal,
        diffVal,
        action: diffVal > 0 ? 'Buy' : 'Sell',
      };
    })
    .filter(a => Math.abs(a.diffVal) > 0.01)
    .sort((a, b) => Math.abs(b.diffVal) - Math.abs(a.diffVal));

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm transition-all p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
              {t('Rebalancing Plan')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('Suggested trades to reach your target allocation.')}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {rebalancingPlan.length > 0 ? (
            <div className="space-y-4">
              {rebalancingPlan.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      item.action === 'Buy' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.action === 'Buy' ? '+' : '-'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{item.symbol}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                         <span>{t('Target')}: {item.allocation}%</span>
                         <span>•</span>
                         <span>{t('Current')}: {((item.currentVal / totalValue) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${item.action === 'Buy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {item.action === 'Buy' ? '+' : '-'}{item.currency} {Math.abs(item.diffVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                      {t(item.action)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
               <svg className="w-16 h-16 mb-4 opacity-20 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t('Portfolio is Balanced')}</h3>
               <p className="text-sm">{t('Your actual allocation matches your targets.')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
