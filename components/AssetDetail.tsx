import React, { useState, useMemo, useEffect } from 'react';
import { Asset, AIAssetAnalysisResult, RealTimeAssetData } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Line, ComposedChart, Brush, ReferenceLine } from 'recharts';
import { getLiveHistory } from '../services/financeService';
import { generateHistory, calculateSMA, calculateRSI, TechnicalAnalysisChart, calculateEMA, calculateMACD, calculateBollingerBands } from './Charts';
import { analyzeAsset, getRealTimeAssetData } from '../services/geminiService';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RefreshCw, Loader2, Info, TrendingUp, TrendingDown, Target, Brain, ExternalLink, Clock, Sparkles, HelpCircle, Zap, Activity, Copy, Check, Filter } from 'lucide-react';

interface AssetDetailProps {
  asset: Asset;
  darkMode: boolean;
  onBack: () => void;
}

export const AssetDetail: React.FC<AssetDetailProps> = ({ asset, darkMode, onBack }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<number>(1);
  const [aiAnalysis, setAiAnalysis] = useState<AIAssetAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Real Data State
  const [realData, setRealData] = useState<RealTimeAssetData | null>(null);
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  const [liveChartData, setLiveChartData] = useState<any[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);

  // Technical Indicators Toggles
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showTrend, setShowTrend] = useState(false);

  // Zoom State
  const [zoomState, setZoomState] = useState<{
    left: string | number | null;
    right: string | number | null;
    refAreaLeft: string | number | null;
    refAreaRight: string | number | null;
    top: string | number;
    bottom: string | number;
  }>({
    left: null,
    right: null,
    refAreaLeft: null,
    refAreaRight: null,
    top: 'auto',
    bottom: 'auto',
  });
  
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  const resetZoom = () => {
    setZoomState({
      left: null,
      right: null,
      refAreaLeft: null,
      refAreaRight: null,
      top: 'auto',
      bottom: 'auto',
    });
  };

  const fetchHistory = React.useCallback(async () => {
    setIsLoadingChart(true);
    setLiveChartData([]); // Clear old data to show loading state
    resetZoom();
    
    let rangeOpt = '5y';
    let intervalOpt = '1d';

    if (timeRange === 1) {
      rangeOpt = '1d';
      intervalOpt = '2m'; 
    } else if (timeRange === 7) {
      rangeOpt = '7d';
      intervalOpt = '15m'; 
    } else if (timeRange === 30) {
      rangeOpt = '1mo';
      intervalOpt = '1h'; 
    } else if (timeRange === 90) {
      rangeOpt = '3mo';
      intervalOpt = '1d';
    } else if (timeRange === 365) {
      rangeOpt = '1y';
      intervalOpt = '1d';
    } else if (timeRange === 1825) {
      rangeOpt = '5y';
      intervalOpt = '1wk'; 
    } else if (timeRange === 3650) {
      rangeOpt = 'max';
      intervalOpt = '1wk';
    }

    try {
      const historyRes = await getLiveHistory(asset.symbol, rangeOpt, intervalOpt);
      if (historyRes && historyRes.history) {
        setLiveChartData(historyRes.history.map((h: any) => ({
          date: h.date,
          price: h.close || asset.currentPrice
        })));
      }
    } catch (e) {
      console.error("History fetch error:", e);
    } finally {
      setIsLoadingChart(false);
    }
  }, [asset.symbol, asset.currentPrice, timeRange]);

  const fetchRealTime = React.useCallback(async (showIntrusiveLoading = false) => {
    if (showIntrusiveLoading) setIsLoadingRealData(true);
    // Even if not intrusive, we set isLoadingRealData to true to show the "Syncing" badge
    if (!showIntrusiveLoading) {
      // Small state update to show "Syncing" without triggering the full overlay
      // Our UI uses (isLoadingRealData && !realData) for the overlay, so this is safe
      setIsLoadingRealData(true);
    }

    try {
      const data = await getRealTimeAssetData(asset.symbol, asset.name);
      if (data) {
        setRealData({
          ...data,
          lastUpdated: new Date().toLocaleTimeString()
        });
      }
    } catch (e) {
      console.error("Real-time fetch error:", e);
    } finally {
      setIsLoadingRealData(false);
    }
  }, [asset.symbol, asset.name]);

  // Fetch real data on mount
  useEffect(() => {
    let isMounted = true;
    let pollInterval: any;

    const init = async () => {
      // First fetch is always "intrusive" (shows skeletons/overlays)
      setIsLoadingRealData(true);
      await Promise.all([fetchRealTime(true), fetchHistory()]);
      
      // Setup polling for real-time data every 60 seconds
      if (isMounted) {
        pollInterval = setInterval(() => fetchRealTime(false), 60000);
      }
    };

    init();

    return () => { 
      isMounted = false; 
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchRealTime, fetchHistory]);

  const handleManualRefresh = () => {
    fetchRealTime(true);
    fetchHistory();
  };

  // Fallback price: use real data price if available, else asset.currentPrice
  const displayPrice = realData?.price && realData.price > 0 ? realData.price : asset.currentPrice;

  // Stats derivation using displayPrice
  const totalValue = asset.quantity * displayPrice;
  const totalCost = asset.quantity * asset.avgPrice;
  const totalReturn = totalValue - totalCost;
  const returnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const isProfitable = totalReturn >= 0;

  // SMA period derivation for legend
  const smaPeriod = useMemo(() => {
    const dataLen = liveChartData.length > 0 ? liveChartData.length : timeRange;
    if (dataLen > 100) return 50;
    return Math.max(5, Math.floor(dataLen / 5));
  }, [liveChartData.length, timeRange]);

  // Chart Data - still simulated for history shape if live fails, but anchored to real price
  const chartData = useMemo(() => {
    let data: any[];
    if (liveChartData.length > 0) {
      data = [...liveChartData];
      
      // Append real-time price as the latest point if it's newer than history
      if (realData?.price) {
        const lastHistoryDate = new Date(data[data.length - 1].date);
        const lastUpdatedDate = realData.lastUpdated ? new Date() : null; // Use current time for the "now" point
        
        if (!lastUpdatedDate || lastUpdatedDate.getTime() > lastHistoryDate.getTime() + 60000) {
           data.push({
             date: new Date().toISOString(),
             price: realData.price
           });
        }
      }
    } else {
      data = generateHistory(displayPrice, timeRange);
    }
    
    if (showSMA) data = calculateSMA(data, 20);
    if (showEMA) data = calculateEMA(data, 20);
    if (showRSI) data = calculateRSI(data, 14);
    if (showMACD) data = calculateMACD(data);
    if (showBB) data = calculateBollingerBands(data);

    return data;
  }, [displayPrice, timeRange, liveChartData, realData, showSMA, showEMA, showRSI, showMACD, showBB]);

  const trendLineData = useMemo(() => {
    if (!showTrend || chartData.length === 0) return null;
    
    const n = chartData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    chartData.forEach((point, i) => {
      sumX += i;
      sumY += point.price;
      sumXY += i * point.price;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return [
      { date: chartData[0].date, trend: intercept },
      { date: chartData[n - 1].date, trend: slope * (n - 1) + intercept }
    ];
  }, [chartData, showTrend]);

  const isZoomed = useMemo(() => {
    return zoomState.left !== null || zoomState.right !== null;
  }, [zoomState.left, zoomState.right]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeAsset(asset, realData);
      setAiAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="animate-fade-in-up pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                {asset.symbol}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter
                  ${asset.type === 'Stock' || asset.type === 'Ações' ? 'border border-blue-500/30 text-blue-400 bg-blue-500/5' : 
                    asset.type === 'ETF' ? 'border border-violet-500/30 text-violet-400 bg-violet-500/5' : 
                    asset.type === 'Commodity' || asset.type === 'Ouro' ? 'border border-amber-500/30 text-amber-400 bg-amber-500/5' : 
                    asset.type === 'Crypto' || asset.type === 'Cripto' ? 'border border-orange-500/30 text-orange-400 bg-orange-500/5' :
                    'border border-slate-500/30 text-slate-400 bg-slate-500/5'}`}>
                  {t(asset.type)}
                </span>
                <button 
                  onClick={() => handleCopy(asset.symbol, 'ticker')}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-1"
                  title="Copy Ticker"
                >
                  {copiedField === 'ticker' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </h1>

              {asset.isin && (
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3">
                  {asset.isin}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter border border-slate-500/30 text-slate-400 bg-slate-500/5">
                    ISIN
                  </span>
                  <button 
                    onClick={() => handleCopy(asset.isin!, 'isin')}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy ISIN"
                  >
                    {copiedField === 'isin' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </h2>
              )}

              {asset.wkn && (
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3">
                  {asset.wkn}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter border border-slate-500/30 text-slate-400 bg-slate-500/5">
                    WKN
                  </span>
                  <button 
                    onClick={() => handleCopy(asset.wkn!, 'wkn')}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy WKN"
                  >
                    {copiedField === 'wkn' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </h2>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{asset.name}</p>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {asset.quantity} {t('shares')}
                </span>
                <span className="text-slate-400">@</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  €{asset.avgPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-left md:text-right">
          <div className="flex items-center gap-3 md:justify-end mb-1">
            {isLoadingRealData && !realData ? (
              <div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-slate-900 dark:text-white">€{displayPrice.toFixed(2)}</p>
            )}
            {!isLoadingRealData && (
              <button 
                onClick={handleManualRefresh}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all hover:rotate-180 duration-500"
                title={t('Refresh Data')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {isLoadingRealData && realData && (
               <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold">
                 <Loader2 className="w-2.5 h-2.5 animate-spin" />
                 {t('Syncing...')}
               </div>
            )}
            {realData?.lastUpdated && !isLoadingRealData && (
              <div className="flex flex-col items-end">
                {realData.sourceTitle && (
                  <a 
                    href={realData.sourceUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1 mt-1"
                    title={`Data provided by ${realData.sourceTitle}`}
                  >
                    {realData.sourceTitle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter opacity-70 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {t('Updated at')} {realData.lastUpdated}
                </span>
              </div>
            )}
          </div>
          <p className={`text-sm font-bold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isProfitable ? '+€' : '-€'}{Math.abs(totalReturn).toLocaleString(undefined, {minimumFractionDigits: 2})} ({returnPercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart Card */}
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 p-6 transition-colors overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                {t('Performance')}
                <span className="text-[10px] font-normal normal-case px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-cyan-400 border border-blue-100 dark:border-blue-800/50">{t('Live Data')}</span>
              </h3>
              <div className="flex flex-wrap gap-1.5 items-center bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                {[1, 7, 30, 90, 365, 1825, 3650].map(days => (
                  <button
                    key={days}
                    onClick={() => setTimeRange(days)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${timeRange === days ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    {days === 1 ? '1D' : days === 7 ? '1W' : days === 30 ? '1M' : days === 365 ? '1Y' : days === 1825 ? '5Y' : days === 3650 ? 'MAX' : `${days/30}M`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800/50">
               {/* Advanced Technical Toggles */}
               <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-400/50 transition-colors">
                 <input type="checkbox" checked={showSMA} onChange={e => setShowSMA(e.target.checked)} className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-700" />
                 <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">SMA 20</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-400/50 transition-colors">
                 <input type="checkbox" checked={showEMA} onChange={e => setShowEMA(e.target.checked)} className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700" />
                 <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">EMA 20</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-violet-400/50 transition-colors">
                 <input type="checkbox" checked={showBB} onChange={e => setShowBB(e.target.checked)} className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 dark:bg-slate-700" />
                 <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Bollinger</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-purple-400/50 transition-colors">
                 <input type="checkbox" checked={showRSI} onChange={e => setShowRSI(e.target.checked)} className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 dark:bg-slate-700" />
                 <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">RSI</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-emerald-400/50 transition-colors">
                 <input type="checkbox" checked={showTrend} onChange={e => setShowTrend(e.target.checked)} className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-700" />
                 <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Trend</span>
               </label>
               
               <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
               
               <button
                 onClick={() => setShowMACD(!showMACD)}
                 className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-2 border ${showMACD ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500/50 text-orange-600' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-500'}`}
               >
                 <Zap className="w-3 h-3" />
                 MACD
               </button>

               {isZoomed && (
                 <button
                   onClick={resetZoom}
                   className="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors border border-rose-500/30 text-rose-500 hover:bg-rose-500/5 flex items-center gap-1.5 uppercase tracking-wider"
                 >
                   <RefreshCw className="w-3 h-3" />
                   {t('Reset Zoom')}
                 </button>
               )}
            </div>

            <div className="h-[450px] w-full relative">
              <AnimatePresence>
                {isLoadingChart && liveChartData.length <= 1 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-blue-500/10"
                  >
                    <div className="relative">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                      <div className="absolute inset-0 blur-lg bg-blue-500/20 rounded-full animate-pulse"></div>
                    </div>
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]"
                    >
                      {t('Loading Markets')}...
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <TechnicalAnalysisChart 
                data={chartData}
                height={450}
                darkMode={darkMode}
                timeRange={timeRange}
                showSMA={showSMA}
                showEMA={showEMA}
                showBB={showBB}
                showMACD={showMACD}
                showRSI={showRSI}
                showTrend={showTrend}
                zoomState={zoomState}
                setZoomState={setZoomState}
                trendLineData={trendLineData}
              />
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 p-6 transition-colors relative overflow-hidden">
             <AnimatePresence>
               {isLoadingRealData && !realData && (
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-20 flex items-center justify-center backdrop-blur-md"
                  >
                   <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">{t('Assembling Data')}...</span>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
            <div className="flex justify-between items-start mb-4">
               <h3 className="text-slate-800 dark:text-white font-bold text-lg">{t('About')} {asset.name}</h3>
               {isLoadingRealData ? (
                 <div className="flex items-center gap-2">
                   <span className="bg-slate-100 dark:bg-slate-800 animate-pulse text-slate-400 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide">
                     {t('Syncing...')}
                   </span>
                   <button 
                     disabled
                     className="p-1 rounded-lg text-slate-400 opacity-50"
                   >
                     <Loader2 className="w-4 h-4 animate-spin" />
                   </button>
                 </div>
               ) : realData && (
                 <div className="flex flex-col items-end gap-1">
                   <div className="flex items-center gap-2">
                     <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide">
                       {t('Live Data')}
                     </span>
                     <button 
                       onClick={handleManualRefresh}
                       className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all hover:rotate-180 duration-500"
                       title={t('Refresh Data')}
                     >
                       <RefreshCw className="w-4 h-4" />
                     </button>
                   </div>
                   {realData.lastUpdated && (
                     <span className="text-[10px] text-slate-400 flex items-center gap-1">
                       <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       {realData.lastUpdated}
                     </span>
                   )}
                 </div>
               )}
            </div>
            <div className="relative">
              {isLoadingRealData && !realData?.description ? (
                <div className="space-y-2 mb-8">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-4/6 animate-pulse"></div>
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8 text-sm">
                  {realData?.description || `${asset.name} (${asset.symbol}) is a prominent investment asset operating within the ${asset.type} sector. It provides investors with targeted exposure to underlying market dynamics and represents a significant component of modern diversified portfolios. Exploring its historical performance and relative valuation offers insight into broader economic trends and potential risk-adjusted returns for long-term allocation.`}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-x divide-y divide-slate-100 dark:divide-slate-800 font-sans">
               <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col justify-between">
                 <div>
                   <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 opacity-60 font-bold flex items-center gap-1">
                     <TrendingUp className="w-2.5 h-2.5" />
                     {t('Market Cap')}
                   </p>
                   {isLoadingRealData && !realData?.marketCap ? <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{realData?.marketCap || (asset.type === 'Crypto' ? '€895.4B' : '€1.24T')}</p>}
                 </div>
               </div>
               <div className="p-4 bg-transparent flex flex-col justify-between">
                 <div>
                   <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 opacity-60 font-bold flex items-center gap-1">
                     <Target className="w-2.5 h-2.5" />
                     {t('P/E Ratio')}
                   </p>
                   {isLoadingRealData && !realData?.peRatio ? <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{realData?.peRatio || (asset.type === 'Crypto' ? 'N/A' : '24.5')}</p>}
                 </div>
               </div>
               <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col justify-between">
                 <div>
                   <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 opacity-60 font-bold flex items-center gap-1">
                     <TrendingDown className="w-2.5 h-2.5" />
                     {t('Div Yield')}
                   </p>
                   {isLoadingRealData && !realData?.dividendYield ? <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{realData?.dividendYield || (asset.type === 'Crypto' ? 'N/A' : '1.85%')}</p>}
                 </div>
               </div>
               <div className="p-4 bg-transparent flex flex-col justify-between">
                 <div>
                   <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 opacity-60 font-bold flex items-center gap-1">
                     <Zap className="w-2.5 h-2.5" />
                     {t('Volume')}
                   </p>
                   {isLoadingRealData && !realData?.volume ? <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{realData?.volume || '14.2M'}</p>}
                 </div>
               </div>
               <div className="p-4 bg-transparent border-t border-slate-100 dark:border-slate-800">
                 <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 opacity-60 font-bold">{t('52W High')}</p>
                 {isLoadingRealData && !realData?.high52 ? <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : <p className="text-sm font-mono font-bold text-emerald-500">{realData?.high52 ? `€${realData.high52.toLocaleString()}` : `€${(asset.currentPrice * 1.15).toFixed(2)}`}</p>}
               </div>
               <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 border-l border-slate-100 dark:border-slate-800">
                 <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 opacity-60 font-bold">{t('52W Low')}</p>
                 {isLoadingRealData && !realData?.low52 ? <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : <p className="text-sm font-mono font-bold text-rose-500">{realData?.low52 ? `€${realData.low52.toLocaleString()}` : `€${(asset.currentPrice * 0.85).toFixed(2)}`}</p>}
               </div>
               
               {/* ETF Specific Row */}
               {(asset.type === 'ETF' || asset.type === 'ETF UCITS') && (
                 <>
                   <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 ring-1 ring-blue-500/10">
                     <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-2 opacity-70 font-bold">TER (p.a.)</p>
                     {isLoadingRealData && realData?.ter === undefined ? <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : (
                       <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                         {realData?.ter !== undefined ? `${realData.ter}%` : (asset.ter !== undefined ? `${asset.ter}%` : '---')}
                       </p>
                     )}
                   </div>
                   <div className="p-4 bg-transparent ring-1 ring-blue-500/10">
                     <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-2 opacity-70 font-bold">{t('Fund Size')}</p>
                     {isLoadingRealData && !realData?.fundSize ? <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : (
                       <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                         {realData?.fundSize || asset.fundSize || '---'}
                       </p>
                     )}
                   </div>
                   <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 ring-1 ring-blue-500/10">
                     <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-2 opacity-70 font-bold">{t('Replication')}</p>
                     {isLoadingRealData && !realData?.replication ? <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : (
                       <p className="text-sm font-bold text-slate-900 dark:text-white">
                         {realData?.replication || asset.replication || '---'}
                       </p>
                     )}
                   </div>
                   <div className="p-4 bg-transparent ring-1 ring-blue-500/10">
                     <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-2 opacity-70 font-bold">{t('Distribution Policy')}</p>
                     {isLoadingRealData && !realData?.distribution ? <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> : (
                       <p className="text-sm font-bold text-slate-900 dark:text-white">
                         {realData?.distribution || asset.distribution || '---'}
                       </p>
                     )}
                   </div>
                 </>
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Holdings Stats & AI */}
        <div className="space-y-8">
           {/* Your Position Card */}
           <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 p-6 transition-colors">
             <h3 className="text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wider mb-6">{t('Your Position')}</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">{t('Shares Owned')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{asset.quantity}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">{t('Avg Cost')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">€{asset.avgPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">{t('Total Value')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">€{totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                {asset.allocation !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">{t('% Target Allocation')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{asset.allocation}%</span>
                  </div>
                )}
                {asset.targetInvestment !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">{t('Target Investment')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">€{asset.targetInvestment.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 dark:text-slate-400">{t('Total Return')}</span>
                  <span className={`font-bold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isProfitable ? '+€' : '-€'}{Math.abs(totalReturn).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </span>
                </div>
             </div>
           </div>

           {/* AI Analysis Card */}
           <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/30 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-500/40 p-6 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 translate-x-4 -translate-y-4">
                 <Brain className="w-40 h-40 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="relative z-10">
                <h3 className="text-indigo-900 dark:text-indigo-100 font-bold text-lg mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  {t('AI Insight')}
                </h3>
                
                {!aiAnalysis ? (
                  <div className="text-center py-6">
                    <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">{t('Get real-time AI-powered analysis for')} <span className="font-bold text-indigo-600 dark:text-indigo-400">{asset.symbol}</span>, {t('including price targets and investment rating.')}</p>
                    <button 
                      onClick={handleAIAnalysis}
                      disabled={isAnalyzing}
                      className="group relative w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-3 overflow-hidden active:scale-[0.98]"
                    >
                      {isAnalyzing ? (
                         <Loader2 className="animate-spin h-5 w-5 text-white" />
                      ) : (
                        <Zap className="w-5 h-5 fill-indigo-400 text-indigo-400 transition-transform group-hover:scale-125" />
                      )}
                      <span className="relative z-10">{isAnalyzing ? t('Analyzing...') : t('Generate Analysis')}</span>
                      {isAnalyzing && (
                        <motion.div 
                          layoutId="loading-bar"
                          className="absolute bottom-0 left-0 h-1 bg-white/30"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-500 dark:text-indigo-200/80 uppercase tracking-wider">{t('Rating')}</span>
                      <span className={`px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm ${aiAnalysis.rating === 'Buy' ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : aiAnalysis.rating === 'Sell' ? 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                        {aiAnalysis.rating}
                      </span>
                    </div>
    <div>
                      <p className="text-sm font-bold text-slate-500 dark:text-indigo-200/80 uppercase mb-1">{t('Target Price')}</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-indigo-50">{aiAnalysis.priceTarget}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 dark:text-indigo-200/80 uppercase mb-1">{t('Summary')}</p>
                      <p className="text-sm text-slate-700 dark:text-indigo-100/90 leading-relaxed">{aiAnalysis.summary}</p>
                    </div>
                    <div className="pt-2 border-t border-indigo-100 dark:border-indigo-500/30">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">{t('Bull Case')}</p>
                      <p className="text-xs text-slate-600 dark:text-indigo-200/80">{aiAnalysis.bullishCase}</p>
                    </div>
                    <div>
                       <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">{t('Bear Case')}</p>
                       <p className="text-xs text-slate-600 dark:text-indigo-200/80">{aiAnalysis.bearishCase}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
         </div>
      </div>
    </div>
  );
};