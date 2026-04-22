import React, { useState, useMemo } from 'react';
import { Asset } from '../types';
import { useTranslation } from 'react-i18next';

type SortField = 'name' | 'symbol' | 'type' | 'value' | 'gainLoss' | 'allocation' | 'targetInvestment' | 'targetInvestmentPerPerson';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface AssetTableProps {
  assets: Asset[];
  onDelete: (id: string) => void;
  onAlertClick: (asset: Asset) => void;
  onAssetClick: (asset: Asset) => void;
}

export const AssetTable: React.FC<AssetTableProps> = ({ assets, onDelete, onAlertClick, onAssetClick }) => {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'value', direction: 'desc' });

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedAssets = useMemo(() => {
    const sortableAssets = [...assets];
    return sortableAssets.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'symbol':
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'value':
          aValue = a.quantity * a.currentPrice;
          bValue = b.quantity * b.currentPrice;
          break;
        case 'gainLoss':
          aValue = (a.quantity * a.currentPrice) - (a.quantity * a.avgPrice);
          bValue = (b.quantity * b.currentPrice) - (b.quantity * b.avgPrice);
          break;
        case 'allocation':
          aValue = a.allocation || 0;
          bValue = b.allocation || 0;
          break;
        case 'targetInvestment':
          aValue = a.targetInvestment || 0;
          bValue = b.targetInvestment || 0;
          break;
        case 'targetInvestmentPerPerson':
          aValue = a.targetInvestmentPerPerson || 0;
          bValue = b.targetInvestmentPerPerson || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assets, sortConfig]);

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
           <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">{t('No assets found')}</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm text-center">{t('Get started by adding a new investment manually or importing your portfolio from Excel.')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs uppercase text-slate-500 dark:text-slate-500 font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800">
            <tr>
              <th className="px-6 py-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('name')}>
                    {t('Investimento')}
                    {sortConfig.field === 'name' && (
                      <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] opacity-60 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('symbol')}>
                    {t('Symbol')}
                    {sortConfig.field === 'symbol' && (
                      <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">
                  {t('Estratégia')}
                  {sortConfig.field === 'type' && (
                    <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-5 text-right text-[10px] opacity-60 tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('allocation')}>
                <div className="flex items-center justify-end gap-1">
                  {t('% de Alocação')}
                  {sortConfig.field === 'allocation' && (
                    <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-5 text-right text-[10px] opacity-60 tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('targetInvestment')}>
                <div className="flex items-center justify-end gap-1">
                  {t('€ a investir')}
                  {sortConfig.field === 'targetInvestment' && (
                    <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-5 text-right text-[10px] opacity-60 tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('targetInvestmentPerPerson')}>
                <div className="flex items-center justify-end gap-1">
                  {t('€ a investir cada')}
                  {sortConfig.field === 'targetInvestmentPerPerson' && (
                    <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-5 text-right text-[10px] opacity-60 tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('value')}>
                <div className="flex items-center justify-end gap-1">
                  {t('Value')}
                  {sortConfig.field === 'value' && (
                    <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-5 text-right text-[10px] opacity-60 tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('gainLoss')}>
                <div className="flex items-center justify-end gap-1">
                  {t('Gain/Loss')}
                  {sortConfig.field === 'gainLoss' && (
                    <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-5 text-center">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {sortedAssets.map((asset) => {
              const totalValue = asset.quantity * asset.currentPrice;
              const totalCost = asset.quantity * asset.avgPrice;
              const gainLoss = totalValue - totalCost;
              const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
              const isProfitable = gainLoss >= 0;
              const hasAlert = asset.alertHigh !== undefined || asset.alertLow !== undefined;

              return (
                <tr 
                  key={asset.id} 
                  onClick={() => onAssetClick(asset)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/40 group cursor-pointer transition-all duration-200 border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                >
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white dark:group-hover:text-blue-400">
                    <div className="flex flex-col">
                      <span className="tracking-tight">{asset.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-semibold uppercase">{asset.symbol}</span>
                        {asset.isin && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                            <span className="text-[9px] text-slate-400/80 dark:text-slate-500/80 font-mono tracking-wider">{asset.isin}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter
                      ${asset.type === 'Stock' || asset.type === 'Ações' ? 'border border-blue-500/30 text-blue-400 bg-blue-500/5' : 
                        asset.type === 'ETF' ? 'border border-violet-500/30 text-violet-400 bg-violet-500/5' : 
                        asset.type === 'Commodity' || asset.type === 'Ouro' ? 'border border-amber-500/30 text-amber-400 bg-amber-500/5' : 
                        asset.type === 'Crypto' || asset.type === 'Cripto' ? 'border border-orange-500/30 text-orange-400 bg-orange-500/5' :
                        'border border-slate-500/30 text-slate-400 bg-slate-500/5'}`}>
                      {t(asset.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                    {asset.allocation ? `${asset.allocation.toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">
                    {asset.targetInvestment ? `€${asset.targetInvestment.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">
                    {asset.targetInvestmentPerPerson ? `€${asset.targetInvestmentPerPerson.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-slate-900 dark:text-white dark:group-hover:text-cyan-400 transition-colors">
                    €{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono text-xs ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <div className="flex flex-col items-end">
                      <span className="font-bold">{isProfitable ? '+€' : '-€'}{Math.abs(gainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] opacity-70">({isProfitable ? '+' : ''}{gainLossPercent.toFixed(2)}%)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAlertClick(asset)}
                        className={`p-2 rounded-full transition-colors ${hasAlert ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                        title="Set Price Alert"
                      >
                         <svg className="w-5 h-5" fill={hasAlert ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                         </svg>
                      </button>
                      <button 
                        onClick={() => onDelete(asset.id)}
                        className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        title="Delete Asset"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};