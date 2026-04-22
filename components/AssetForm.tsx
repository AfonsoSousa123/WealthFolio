import React, { useState } from 'react';
import { AssetType, Asset } from '../types';
import { useTranslation } from 'react-i18next';

interface AssetFormProps {
  onAdd: (asset: Asset) => void;
  onClose: () => void;
}

export const AssetForm: React.FC<AssetFormProps> = ({ onAdd, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: AssetType.STOCK,
    quantity: '',
    avgPrice: '',
    currentPrice: '',
    allocation: '',
    targetInvestment: '',
    targetInvestmentPerPerson: '',
    isin: '',
    wkn: '',
    ter: '',
    fundSize: '',
    replication: 'Physical',
    distribution: 'Accumulating',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsset: Asset = {
      id: Date.now().toString(),
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      type: formData.type,
      quantity: Number(formData.quantity) || 0,
      avgPrice: Number(formData.avgPrice) || 0,
      currentPrice: Number(formData.currentPrice) || 0,
      allocation: Number(formData.allocation) || 0,
      targetInvestment: Number(formData.targetInvestment) || 0,
      targetInvestmentPerPerson: Number(formData.targetInvestmentPerPerson) || 0,
      isin: formData.isin || undefined,
      wkn: formData.wkn || undefined,
      ter: formData.type === AssetType.ETF ? Number(formData.ter) || 0 : undefined,
      fundSize: formData.type === AssetType.ETF ? formData.fundSize : undefined,
      replication: formData.type === AssetType.ETF ? formData.replication : undefined,
      distribution: formData.type === AssetType.ETF ? formData.distribution : undefined,
      currency: 'EUR'
    };
    onAdd(newAsset);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm transition-all">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 animate-fade-in-up transition-colors border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('Add New Asset')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Symbol')}</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="AAPL"
                value={formData.symbol}
                onChange={e => setFormData({...formData, symbol: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Type')}</label>
              <select
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as AssetType})}
              >
                {Object.values(AssetType).map(v => (
                  <option key={v} value={v}>{t(v)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Name')}</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="Apple Inc."
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ISIN</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 uppercase"
                placeholder="US0378331005"
                value={formData.isin}
                onChange={e => setFormData({...formData, isin: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">WKN</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 uppercase"
                placeholder="A2H573"
                value={formData.wkn}
                onChange={e => setFormData({...formData, wkn: e.target.value.toUpperCase()})}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Quantity')}</label>
              <input
                type="number"
                step="any"
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="0"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Avg Price')}</label>
              <input
                type="number"
                step="any"
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="0.00"
                value={formData.avgPrice}
                onChange={e => setFormData({...formData, avgPrice: e.target.value})}
              />
            </div>
             <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('Cur. Price')}</label>
              <input
                type="number"
                step="any"
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="0.00"
                value={formData.currentPrice}
                onChange={e => setFormData({...formData, currentPrice: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('% Alocação')}</label>
              <input
                type="number"
                step="any"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="0"
                value={formData.allocation}
                onChange={e => setFormData({...formData, allocation: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('€ Investir')}</label>
              <input
                type="number"
                step="any"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="0.00"
                value={formData.targetInvestment}
                onChange={e => setFormData({...formData, targetInvestment: e.target.value})}
              />
            </div>
             <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('€ Cada')}</label>
              <input
                type="number"
                step="any"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="0.00"
                value={formData.targetInvestmentPerPerson}
                onChange={e => setFormData({...formData, targetInvestmentPerPerson: e.target.value})}
              />
            </div>
          </div>

          {formData.type === AssetType.ETF && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 animate-fade-in-down">
               <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">ETF Specific Data</p>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">TER % (Annual)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 text-sm"
                      placeholder="0.07"
                      value={formData.ter}
                      onChange={e => setFormData({...formData, ter: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">{t('Fund Size')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 text-sm"
                      placeholder="€2.5B"
                      value={formData.fundSize}
                      onChange={e => setFormData({...formData, fundSize: e.target.value})}
                    />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">{t('Replication')}</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 text-sm"
                      value={formData.replication}
                      onChange={e => setFormData({...formData, replication: e.target.value})}
                    >
                      <option value="Physical">Physical</option>
                      <option value="Physical (Sampling)">Physical (Sampling)</option>
                      <option value="Synthetic">Synthetic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">{t('Distribution Policy')}</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-900 text-sm"
                      value={formData.distribution}
                      onChange={e => setFormData({...formData, distribution: e.target.value})}
                    >
                      <option value="Accumulating">Accumulating</option>
                      <option value="Distributing">Distributing</option>
                    </select>
                  </div>
               </div>
            </div>
          )}

          <div className="pt-6 flex gap-3">
             <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              {t('Add Asset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};