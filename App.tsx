import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Asset, AssetType, PortfolioStats, AIAnalysisResult } from './types';
import { AssetTable } from './components/AssetTable';
import { DashboardStats } from './components/DashboardStats';
import { PortfolioHealth } from './components/PortfolioHealth';
import { Charts } from './components/Charts';
import { AssetForm } from './components/AssetForm';
import { AssetDetail } from './components/AssetDetail';
import { PriceAlertModal } from './components/PriceAlertModal';
import { NotificationToast, Notification } from './components/NotificationToast';
import { analyzePortfolio } from './services/geminiService';
import { exportPortfolioToExcel, exportPortfolioToCSV, parseExcelImport } from './services/excelService';
import { getLiveQuotes } from './services/financeService';
import { useTranslation } from 'react-i18next';

// Initial Mock Data
const MOCK_ASSETS: Asset[] = [
  { id: '1', symbol: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating', type: AssetType.ETF, quantity: 50, avgPrice: 110, currentPrice: 115.50, currency: 'EUR', allocation: 50, targetInvestment: 50, targetInvestmentPerPerson: 25, ter: 0.22, fundSize: "€12.3B", replication: "Physical", distribution: "Accumulating" },
  { id: '2', symbol: 'EUNA', name: 'iShares Core Global Aggregate Bond UCITS ETF', type: AssetType.ETF, quantity: 20, avgPrice: 50, currentPrice: 51.20, currency: 'EUR', allocation: 10, targetInvestment: 10, targetInvestmentPerPerson: 5, ter: 0.10, fundSize: "€4.1B", replication: "Physical (Sampling)", distribution: "Accumulating" },
  { id: '3', symbol: 'BTC', name: 'Bitcoin', type: AssetType.CRYPTO, quantity: 0.1, avgPrice: 40000, currentPrice: 42000, currency: 'EUR', allocation: 5, targetInvestment: 5, targetInvestmentPerPerson: 2.5 },
  { id: '4', symbol: 'IWDA', name: 'iShares Core MSCI World UCITS ETF', type: AssetType.ETF, quantity: 30, avgPrice: 90, currentPrice: 95.10, currency: 'EUR', allocation: 30, targetInvestment: 30, targetInvestmentPerPerson: 15, ter: 0.20, fundSize: "€65.2B", replication: "Physical", distribution: "Accumulating" },
  { id: '5', symbol: 'GLD', name: 'SPDR Gold Shares', type: AssetType.COMMODITY, quantity: 5, avgPrice: 180, currentPrice: 185.20, currency: 'EUR', allocation: 5, targetInvestment: 5, targetInvestmentPerPerson: 2.5 },
];

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  
  // Persistent Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('wealthFolio-theme');
    if (saved !== null) return saved === 'dark';
    return true; // Default to dark
  });
  
  // Layout State
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'All'>('All');
  
  // Alert State
  const [alertAsset, setAlertAsset] = useState<Asset | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { t, i18n } = useTranslation();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedInitial = useRef(false);

  useEffect(() => {
    if (hasFetchedInitial.current) return;
    hasFetchedInitial.current = true;
    
    const fetchInitial = async () => {
      setIsRefreshingPrices(true);
      try {
        const symbols = MOCK_ASSETS.map(a => a.symbol);
        const quotes = await getLiveQuotes(symbols);
        
        setAssets(prev => prev.map(asset => {
          const quote = quotes.find((q: any) => q.originalSymbol === asset.symbol || q.yahooSymbol === asset.symbol || q.name?.includes(asset.symbol));
          if (quote && quote.price) {
            return { ...asset, currentPrice: quote.price };
          }
          return asset;
        }));
      } catch (err) {
        console.error("Failed initial price sync");
      } finally {
        setIsRefreshingPrices(false);
      }
    };
    
    fetchInitial();
  }, []);

  // Derived Statistics
  const stats: PortfolioStats = useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + (asset.quantity * asset.currentPrice), 0);
    const totalCost = assets.reduce((sum, asset) => sum + (asset.quantity * asset.avgPrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGainLoss, totalGainLossPercentage };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            asset.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || asset.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [assets, searchTerm, filterType]);

  // Check for alerts whenever assets change
  useEffect(() => {
    assets.forEach(asset => {
      // Check High Threshold
      if (asset.alertHigh !== undefined && asset.currentPrice >= asset.alertHigh) {
        addNotification({
          id: `high-${asset.id}-${Date.now()}`,
          title: 'Price Alert',
          message: `${asset.symbol} has reached your target of €${asset.alertHigh.toFixed(2)}. Current price: €${asset.currentPrice.toFixed(2)}`,
          type: 'success'
        });
      }
      // Check Low Threshold
      if (asset.alertLow !== undefined && asset.currentPrice <= asset.alertLow) {
        addNotification({
          id: `low-${asset.id}-${Date.now()}`,
          title: 'Price Alert',
          message: `${asset.symbol} has dropped below your target of €${asset.alertLow.toFixed(2)}. Current price: €${asset.currentPrice.toFixed(2)}`,
          type: 'warning'
        });
      }
    });
  }, [assets]);

  const addNotification = (notification: Notification) => {
    // Prevent duplicate notifications for the exact same message in short succession
    setNotifications(prev => {
      const exists = prev.some(n => n.message === notification.message);
      if (exists) return prev;
      return [...prev, notification];
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Sync Dark Mode with Document Element and Persist
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('wealthFolio-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('wealthFolio-theme', 'light');
    }
  }, [darkMode]);

  const handleAddAsset = (asset: Asset) => {
    setAssets([...assets, asset]);
    addNotification({ id: Date.now().toString(), title: 'Asset Added', message: `Successfully added ${asset.symbol}`, type: 'success' });
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    addNotification({ id: Date.now().toString(), title: 'Asset Deleted', message: 'Asset removed from portfolio', type: 'info' });
  };

  const handleSaveAlerts = (id: string, high?: number, low?: number) => {
    setAssets(assets.map(a => a.id === id ? { ...a, alertHigh: high, alertLow: low } : a));
    addNotification({ id: Date.now().toString(), title: 'Alerts Updated', message: 'Price thresholds saved successfully', type: 'info' });
  };

  const refreshPrices = async () => {
    setIsRefreshingPrices(true);
    addNotification({ id: `refresh-${Date.now()}`, title: 'Updating', message: 'Fetching live prices...', type: 'info' });
    try {
      const symbols = assets.map(a => a.symbol);
      const quotes = await getLiveQuotes(symbols);
      
      const newAssets = assets.map(asset => {
        const quote = quotes.find((q: any) => q.originalSymbol === asset.symbol || q.yahooSymbol === asset.symbol || q.name?.includes(asset.symbol));
        if (quote && quote.price) {
          return { ...asset, currentPrice: quote.price };
        }
        return asset;
      });
      
      setAssets(newAssets);
      addNotification({ id: `refresh-success-${Date.now()}`, title: 'Prices Updated', message: 'Live data synced successfully.', type: 'success' });
    } catch (err) {
      addNotification({ id: `refresh-error-${Date.now()}`, title: 'Update Failed', message: 'Could not fetch live prices.', type: 'warning' });
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  const handleExport = () => {
    exportPortfolioToExcel(assets);
  };

  const handleExportCSV = () => {
    exportPortfolioToCSV(assets);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const importedAssets = await parseExcelImport(file);
        if (window.confirm(`Found ${importedAssets.length} assets. Add them to your portfolio?`)) {
          setAssets(prev => [...prev, ...importedAssets]);
          addNotification({ id: Date.now().toString(), title: 'Import Successful', message: `Imported ${importedAssets.length} assets`, type: 'success' });
        }
      } catch (error) {
        console.error("Import failed", error);
        addNotification({ id: Date.now().toString(), title: 'Import Failed', message: 'Could not parse Excel file', type: 'warning' });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAIAnalysis = async () => {
    if (assets.length === 0) return;
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const result = await analyzePortfolio(assets);
      setAiResult(result);
    } catch (error) {
      console.error(error);
      addNotification({ id: Date.now().toString(), title: 'Analysis Failed', message: 'Check API Key or try again later', type: 'warning' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300">
        
        {/* Notification Container */}
        <div className="fixed top-24 right-4 z-50 flex flex-col gap-3 pointer-events-none w-[calc(100vw-2rem)] sm:w-96">
          {notifications.map(n => (
            <NotificationToast key={n.id} notification={n} onDismiss={removeNotification} />
          ))}
        </div>

        {/* Navigation */}
        <nav className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 shadow-sm dark:shadow-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedAsset(null)}>
                <div className="relative">
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl blur-md opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center p-0.5 shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden transition-transform group-hover:scale-105 duration-300">
                    <div className="w-full h-full bg-slate-900 dark:bg-white rounded-[9px] flex items-center justify-center">
                      <svg className="w-6 h-6 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center">
                  <span>Wealth</span>
                  <span className="text-blue-600 dark:text-cyan-400">Folio</span>
                </h1>
              </div>
              <div className="flex items-center gap-4">
                 <button
                   onClick={() => {
                     const nextLang = i18n.language === 'en' ? 'pt-PT' : 'en';
                     i18n.changeLanguage(nextLang);
                   }}
                   className="p-2.5 rounded-xl text-xs font-bold uppercase text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-800/50 transition-all duration-200"
                   title={t('Change Language')}
                 >
                   {i18n.language === 'en' ? 'PT' : 'EN'}
                 </button>
                 <button
                   onClick={() => {
                     setDarkMode(!darkMode);
                     addNotification({
                       id: `theme-change-${Date.now()}`,
                       title: darkMode ? t('Light Mode Enabled') : t('Dark Mode Enabled'),
                       message: darkMode ? t('Interface switched to light mode.') : t('Interface switched to dark mode.'),
                       type: 'info'
                     });
                   }}
                   className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-800/50 transition-all duration-200"
                   title={darkMode ? t('Switch to Light Mode') : t('Switch to Dark Mode')}
                 >
                   {darkMode ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                     </svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                     </svg>
                   )}
                 </button>
                 {!selectedAsset && (
                   <button 
                    onClick={handleAIAnalysis}
                    className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all font-medium text-sm group"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                       <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                    ) : (
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {t('AI Insights')}
                  </button>
                 )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {selectedAsset ? (
            <AssetDetail 
              asset={selectedAsset} 
              darkMode={darkMode} 
              onBack={() => setSelectedAsset(null)} 
            />
          ) : (
            <>
              {/* AI Results Section */}
              {aiResult && (
                <div className="mb-10 animate-fade-in-down">
                  <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/10 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-500/30 shadow-sm relative overflow-hidden transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <svg className="w-32 h-32 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                          <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                          {t('Portfolio Analysis')}
                        </h2>
                        <button onClick={() => setAiResult(null)} className="p-2 rounded-lg text-indigo-400 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-white dark:hover:bg-indigo-900/50 transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/60 dark:bg-slate-900/60 p-5 rounded-xl backdrop-blur-md border border-white/20 dark:border-white/5 transition-colors">
                          <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">{t('Risk Score')}</p>
                          <div className="flex items-end gap-2 mt-2">
                             <span className={`text-5xl font-bold ${aiResult.riskScore > 7 ? 'text-rose-500' : aiResult.riskScore > 4 ? 'text-amber-500' : 'text-emerald-500'}`}>{aiResult.riskScore}</span>
                             <span className="text-indigo-900 dark:text-indigo-200 pb-2 font-medium">/ 10</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full rounded-full ${aiResult.riskScore > 7 ? 'bg-rose-500' : aiResult.riskScore > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${aiResult.riskScore * 10}%`}}></div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">{aiResult.riskAssessment}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-slate-900/60 p-5 rounded-xl backdrop-blur-md border border-white/20 dark:border-white/5 md:col-span-2 transition-colors">
                          <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-3">{t('AI Suggestions')}</p>
                          <ul className="space-y-3">
                            {aiResult.suggestions.map((s, i) => (
                              <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                  <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <span className="leading-relaxed">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Overview Section */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6 group cursor-pointer" onClick={() => setIsOverviewOpen(!isOverviewOpen)}>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{t('Dashboard Overview')}</h2>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-grow w-12 group-hover:w-24 transition-all duration-300"></div>
                  </div>
                  <button
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-cyan-400 transition-colors bg-white dark:bg-slate-900/50 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800"
                  >
                    {isOverviewOpen ? t('Hide Metrics') : t('Show Metrics')}
                    <svg 
                      className={`w-4 h-4 transition-transform duration-300 ${isOverviewOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div 
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${isOverviewOpen ? 'max-h-[2000px] opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-4'}`}
                >
                  <DashboardStats stats={stats} />
                  <PortfolioHealth assets={assets} />
                  <Charts assets={assets} darkMode={darkMode} />
                  
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-8"></div>
                </div>
              </div>

              {/* Holdings Section */}
              <div>
                <div className="flex flex-col mb-8 gap-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t('Holdings')}</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">{t('Manage your investment assets and alerts')}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                      {/* Hidden File Input */}
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange}
                      />

                      <button 
                        onClick={refreshPrices}
                        disabled={isRefreshingPrices}
                        className="flex-1 lg:flex-none px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/50 group whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRefreshingPrices ? (
                           <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4 text-emerald-500 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        )}
                        {t('Refresh')}
                      </button>
                      
                      <button 
                        onClick={handleImportClick}
                        className="flex-1 lg:flex-none px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        {t('Import')}
                      </button>
                      <button 
                        onClick={handleExport}
                        className="flex-1 lg:flex-none px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
                        title={t('Export to Excel')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {t('Excel')}
                      </button>
                      <button 
                        onClick={handleExportCSV}
                        className="flex-1 lg:flex-none px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
                        title={t('Export to CSV')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {t('CSV')}
                      </button>
                      <button 
                        onClick={() => setIsFormOpen(true)}
                        className="flex-1 lg:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        {t('Add Asset')}
                      </button>
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                        placeholder="Search by name or symbol..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="min-w-[180px]">
                      <select
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as AssetType | 'All')}
                      >
                        <option value="All">{t('All Types')}</option>
                        {Object.values(AssetType).map(v => (
                          <option key={v} value={v}>{t(v)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <AssetTable 
                  assets={filteredAssets} 
                  onDelete={handleDeleteAsset} 
                  onAlertClick={setAlertAsset} 
                  onAssetClick={(asset) => {
                    setSelectedAsset(asset);
                    setIsOverviewOpen(false);
                  }}
                />
              </div>

              {/* Modals */}
              {isFormOpen && (
                <AssetForm onAdd={handleAddAsset} onClose={() => setIsFormOpen(false)} />
              )}
              {alertAsset && (
                <PriceAlertModal asset={alertAsset} onSave={handleSaveAlerts} onClose={() => setAlertAsset(null)} />
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default App;