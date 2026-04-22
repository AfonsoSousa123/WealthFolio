import React, { useState } from 'react';
import { Asset } from '../types';
import { useTranslation } from 'react-i18next';

interface PriceAlertModalProps {
  asset: Asset;
  onSave: (id: string, high?: number, low?: number) => void;
  onClose: () => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({ asset, onSave, onClose }) => {
  const { t } = useTranslation();
  const [high, setHigh] = useState<string>(asset.alertHigh?.toString() || '');
  const [low, setLow] = useState<string>(asset.alertLow?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      asset.id, 
      high ? parseFloat(high) : undefined, 
      low ? parseFloat(low) : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm transition-all">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 m-4 animate-fade-in-up transition-colors border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('Price Alerts for')} {asset.symbol}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('Current Price')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">€{asset.currentPrice.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Alert if price rises above')}</label>
            <input
              type="number"
              step="any"
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
              placeholder={t("Target High")}
              value={high}
              onChange={e => setHigh(e.target.value)}
            />
          </div>

           <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Alert if price drops below')}</label>
            <input
              type="number"
              step="any"
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
              placeholder={t("Target Low")}
              value={low}
              onChange={e => setLow(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              {t('Save Alerts')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};