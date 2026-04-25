import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, Area, 
  ReferenceLine, Brush, ReferenceArea 
} from 'recharts';
import { Asset } from '../types';
import { useTranslation } from 'react-i18next';

import { getLiveHistory } from '../services/financeService';

interface ChartsProps {
  assets: Asset[];
  darkMode: boolean;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

// Helper to generate mock historical data
export const generateHistory = (currentPrice: number, days: number, volatility: number = 0.02) => {
  const data = [];
  let price = currentPrice;
  const today = new Date();
  
  // Decide resolution
  let iterations = days;
  let intervalHours = 24;
  
  if (days <= 1) {
    iterations = 24;
    intervalHours = 1;
  } else if (days <= 7) {
    iterations = days * 6; // 4-hourly for a week
    intervalHours = 4;
  }

  // Adjust volatility for time interval (Volatility scales with sqrt of time)
  const stepVolatility = intervalHours === 24 ? volatility : volatility / Math.sqrt(24 / intervalHours);
  
  // Generate backwards from current price
  for (let i = 0; i < iterations; i++) {
    const date = new Date(today);
    date.setHours(date.getHours() - (i * intervalHours));
    
    data.unshift({
      date: date.toISOString(),
      price: Number(price.toFixed(2)),
      originalPrice: price // Keep distinct for calculation
    });

    // Random walk
    const change = (Math.random() - 0.5) * (price * stepVolatility * 2); 
    price = price - change;
    if (price < 1) price = 1; // Prevent negative/zero
  }
  return data;
};

// Technical Indicator Calculations
export const calculateSMA = (data: any[], period: number) => {
  return data.map((item, index, arr) => {
    if (index < period - 1) return { ...item, [`sma${period}`]: null };
    const slice = arr.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.price, 0);
    const smaVal = Number((sum / period).toFixed(2));
    return { 
      ...item, 
      [`sma${period}`]: smaVal,
      sma: smaVal // Add generic 'sma' key for easier consumption
    };
  });
};

export const calculateEMA = (data: any[], period: number) => {
  const k = 2 / (period + 1);
  let ema = data[0].price;
  
  return data.map((item, index) => {
    if (index === 0) return { ...item, [`ema${period}`]: ema };
    ema = item.price * k + ema * (1 - k);
    return { ...item, [`ema${period}`]: Number(ema.toFixed(2)) };
  });
};

export const calculateMACD = (data: any[]) => {
  // 1. Calculate 12 and 26 EMA
  let enrichedData = calculateEMA(data, 12);
  enrichedData = calculateEMA(enrichedData, 26);
  
  // 2. Calculate MACD Line
  enrichedData = enrichedData.map(item => ({
    ...item,
    macdLine: item.ema12 !== null && item.ema26 !== null ? Number((item.ema12 - item.ema26).toFixed(2)) : null
  }));
  
  // 3. Calculate Signal Line (9-period EMA of MACD Line)
  const k = 2 / (9 + 1);
  let signalLine = enrichedData.find(item => item.macdLine !== null)?.macdLine || 0;
  
  return enrichedData.map((item, index) => {
    if (item.macdLine === null) return { ...item, macdSignal: null, macdHist: null };
    signalLine = item.macdLine * k + signalLine * (1 - k);
    const hist = item.macdLine - signalLine;
    return { 
      ...item, 
      macdSignal: Number(signalLine.toFixed(2)),
      macdHist: Number(hist.toFixed(2))
    };
  });
};

export const calculateBollingerBands = (data: any[], period: number = 20, stdDev: number = 2) => {
  return data.map((item, index, arr) => {
    if (index < period - 1) return { ...item, bbUpper: null, bbLower: null, bbMiddle: null };
    
    const slice = arr.slice(index - period + 1, index + 1);
    const prices = slice.map(d => d.price);
    const mean = prices.reduce((a, b) => a + b) / period;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    
    return {
      ...item,
      bbMiddle: Number(mean.toFixed(2)),
      bbUpper: Number((mean + stdDev * sd).toFixed(2)),
      bbLower: Number((mean - stdDev * sd).toFixed(2))
    };
  });
};

export const calculateRSI = (data: any[], period: number = 14) => {
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].price - data[i - 1].price;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;

  const result = data.map((item, index) => {
    if (index <= period) return { ...item, rsi: null };
    
    const change = item.price - data[index - 1].price;
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
    
    if (avgLoss === 0) return { ...item, rsi: 100 };
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return { ...item, rsi: Number(rsi.toFixed(2)) };
  });

  return result;
};

// Technical Analysis Data Generation Component
export const TechnicalAnalysisChart: React.FC<{
  data: any[];
  height: number | string;
  darkMode: boolean;
  timeRange: number;
  showSMA?: boolean;
  showEMA?: boolean;
  showBB?: boolean;
  showMACD?: boolean;
  showRSI?: boolean;
  showTrend?: boolean;
  zoomState: any;
  setZoomState: (zoom: any) => void;
  refLines?: number[];
  setRefLines?: (lines: number[]) => void;
  isDrawMode?: boolean;
  setIsDrawMode?: (mode: boolean) => void;
  trendLineData?: any[] | null;
}> = ({ 
  data: analysisData, 
  height, 
  darkMode, 
  timeRange, 
  showSMA, 
  showEMA, 
  showBB, 
  showMACD, 
  showRSI, 
  showTrend,
  zoomState,
  setZoomState,
  refLines = [],
  setRefLines,
  isDrawMode,
  setIsDrawMode,
  trendLineData
}) => {
  const { t } = useTranslation();

  const handleChartClick = (e: any) => {
    if (isDrawMode && setRefLines && e && e.activePayload && e.activePayload[0]) {
      const price = e.activePayload[0].payload.price;
      setRefLines([...refLines, price]);
      if (setIsDrawMode) setIsDrawMode(false);
    }
  };

  const zoom = () => {
    let { refAreaLeft, refAreaRight } = zoomState;
    if (refAreaLeft === refAreaRight || refAreaRight === null) {
      setZoomState({ ...zoomState, refAreaLeft: null, refAreaRight: null });
      return;
    }
    if (refAreaLeft !== null && refAreaRight !== null) {
      if (refAreaLeft > refAreaRight) [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];
      setZoomState({ ...zoomState, refAreaLeft: null, refAreaRight: null, left: refAreaLeft, right: refAreaRight });
    }
  };

  return (
    <div className={`transition-all duration-300 ${showRSI || showMACD ? 'h-[600px]' : (typeof height === 'number' ? `${height}px` : height)} flex flex-col relative`}>
      <div className={`${showRSI && showMACD ? 'h-[50%]' : (showRSI || showMACD) ? 'h-[65%]' : 'h-full'} w-full flex-grow`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <ComposedChart 
            data={analysisData} 
            syncId="techChart"
            onClick={handleChartClick}
            onMouseDown={(e) => !isDrawMode && e && setZoomState({ ...zoomState, refAreaLeft: e.activeLabel || null })}
            onMouseMove={(e) => !isDrawMode && zoomState.refAreaLeft && e && setZoomState({ ...zoomState, refAreaRight: e.activeLabel || null })}
            onMouseUp={zoom}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            style={{ cursor: isDrawMode ? 'crosshair' : 'default' }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={darkMode ? 0.4 : 0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
            <XAxis 
              dataKey="date" 
              domain={[zoomState.left || 'auto', zoomState.right || 'auto']}
              allowDataOverflow
              tick={{fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 500}} 
              tickFormatter={(val) => {
                const d = new Date(val);
                if (timeRange <= 7) {
                  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                }
                return `${d.getMonth()+1}/${d.getDate()}`;
              }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              domain={[zoomState.bottom, zoomState.top]} 
              allowDataOverflow
              tick={{fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 500}} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `€${val}`}
              dx={-10}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const dateObj = new Date(label);
                  const formattedLabel = isNaN(dateObj.getTime()) ? label : 
                    timeRange <= 7 
                      ? dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                      : dateObj.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });

                  return (
                    <div style={{
                      borderRadius: '12px',
                      border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                      backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      backdropFilter: 'blur(12px)',
                      padding: '12px 16px'
                    }} className="min-w-[160px] animate-in fade-in zoom-in duration-150">
                      <p style={{
                        color: darkMode ? '#94a3b8' : '#64748b',
                        marginBottom: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }} className="border-b border-slate-200/50 dark:border-slate-700/50 pb-2 mb-2">{formattedLabel}</p>
                      <div className="space-y-1.5">
                        {payload.map((entry: any, index: number) => {
                          if (entry.dataKey === 'bbUpper' || entry.dataKey === 'bbLower') return null;
                          if (!showSMA && entry.dataKey === 'sma') return null;
                          if (!showSMA && entry.dataKey === 'sma20') return null;
                          if (!showEMA && entry.dataKey === 'ema') return null;
                          if (!showEMA && entry.dataKey === 'ema20') return null;
                          return (
                            <div key={index} className="flex items-center justify-between gap-4" style={{ color: darkMode ? '#f8fafc' : '#0f172a', fontWeight: 600, fontSize: '13px', paddingTop: '4px' }}>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                                <span className="font-medium" style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>{entry.name}:</span>
                              </div>
                              <span>
                                {typeof entry.value === 'number' ? 
                                  (entry.name === 'RSI' || entry.name === 'Histogram' ? entry.value.toFixed(2) : `€${entry.value.toFixed(2)}`) 
                                  : entry.value}
                              </span>
                            </div>
                          );
                        })}
                        {showBB && payload.some(p => p.dataKey === 'bbUpper') && (
                          <div className="flex items-center justify-between gap-4 pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">BB Range:</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              €{payload.find(p => p.dataKey === 'bbLower')?.value?.toFixed(2)} - €{payload.find(p => p.dataKey === 'bbUpper')?.value?.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" name="Price" activeDot={{ r: 6 }} />
            {showBB && (
              <>
                <Line type="monotone" dataKey="bbUpper" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={false} name="BB Upper" />
                <Line type="monotone" dataKey="bbLower" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={false} name="BB Lower" />
                <Area type="monotone" dataKey="bbUpper" stroke="none" fill="#94a3b8" fillOpacity={0.1} />
              </>
            )}
            {showSMA && <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={2} dot={false} name="SMA (20)" />}
            {showEMA && <Line type="monotone" dataKey="ema20" stroke="#8b5cf6" strokeWidth={2} dot={false} name="EMA (20)" />}
            
            {showTrend && trendLineData && (
              <Line 
                data={trendLineData} 
                type="monotone" 
                dataKey="trend" 
                stroke="#10b981" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                dot={false} 
                name="Trend"
                isAnimationActive={false}
              />
            )}
            {refLines.map((y, i) => (
              <ReferenceLine key={i} y={y} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: `€${y.toFixed(2)}`, fill: '#ef4444', fontSize: 10 }} />
            ))}
            {zoomState.refAreaLeft && zoomState.refAreaRight && (
              <ReferenceArea {...({ x1: zoomState.refAreaLeft, x2: zoomState.refAreaRight, fill: "#3b82f6", fillOpacity: 0.1 } as any)} />
            )}
            {(!showRSI && !showMACD) && <Brush dataKey="date" height={30} stroke="#3b82f6" fill={darkMode ? '#1e293b' : '#f8fafc'} tickFormatter={() => ''} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showRSI && (
        <div className={`${showMACD ? 'h-[25%]' : 'h-[35%]'} w-full mt-2`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <ComposedChart data={analysisData} syncId="techChart" margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
              <XAxis dataKey="date" domain={[zoomState.left || 'auto', zoomState.right || 'auto']} allowDataOverflow hide />
              <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 500}} axisLine={false} tickLine={false} ticks={[30, 70]} />
              <RechartsTooltip />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="RSI" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {showMACD && (
        <div className={`${showRSI ? 'h-[25%]' : 'h-[35%]'} w-full mt-2`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <ComposedChart data={analysisData} syncId="techChart" margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
              <XAxis dataKey="date" domain={[zoomState.left || 'auto', zoomState.right || 'auto']} allowDataOverflow hide />
              <YAxis tick={{fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 500}} axisLine={false} tickLine={false} />
              <Bar dataKey="macdHist" fill="#10b981" name="Histogram" />
              <Line type="monotone" dataKey="macdLine" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MACD" />
              <Line type="monotone" dataKey="macdSignal" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Signal" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const Charts: React.FC<ChartsProps> = ({ assets, darkMode }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('analysis');
  
  // Analysis State
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [timeRange, setTimeRange] = useState<number>(1); // Days
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [refLines, setRefLines] = useState<number[]>([]);
  
  // Zoom State
  const [zoomState, setZoomState] = useState<{
    left: string | number | null;
    right: string | number | null;
    refAreaLeft: string | number | null;
    refAreaRight: string | number | null;
    top: number | string;
    bottom: number | string;
  }>({
    left: null,
    right: null,
    refAreaLeft: null,
    refAreaRight: null,
    top: 'auto',
    bottom: 'auto',
  });

  const [liveDataStore, setLiveDataStore] = useState<Record<string, any[]>>({});
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      const asset = assets.find(a => a.id === selectedAssetId);
      if (!asset) return;
      
      const cacheKey = `${asset.symbol}_${timeRange}`;
      if (liveDataStore[cacheKey]) return; // already fetched

      let rangeOpt = '5y';
      let intervalOpt = '1d';

      if (timeRange === 1) {
        rangeOpt = '1d';
        intervalOpt = '15m'; // 15m for single day to have enough points
      } else if (timeRange === 7) {
        rangeOpt = '7d';
        intervalOpt = '1h';  // 1h for 1 week
      } else if (timeRange === 30) {
        rangeOpt = '1mo';
        intervalOpt = '1d';
      } else if (timeRange === 90) {
        rangeOpt = '3mo';
        intervalOpt = '1d';
      } else if (timeRange === 365) {
        rangeOpt = '1y';
        intervalOpt = '1d';
      } else if (timeRange === 1825) {
        rangeOpt = '5y';
        intervalOpt = '1d';
      } else if (timeRange === 3650) {
        rangeOpt = 'max';
        intervalOpt = '1wk';
      }

      setIsLoadingChart(true);
      try {
        const response = await getLiveHistory(asset.symbol, rangeOpt, intervalOpt);
        if (response && response.history) {
          const formatted = response.history.map((h: any) => ({
            date: h.date,
            price: h.close || asset.currentPrice
          }));
          setLiveDataStore(prev => ({ ...prev, [cacheKey]: formatted }));
        }
      } catch (err) {
        console.error("Failed to fetch chart", err);
      } finally {
        setIsLoadingChart(false);
      }
    };
    fetchHistory();
  }, [selectedAssetId, assets, timeRange]);

  // Derived Data
  const allocationData = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(asset => {
      const val = asset.quantity * asset.currentPrice;
      map.set(asset.type, (map.get(asset.type) || 0) + val);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const topAssetsData = useMemo(() => {
    return [...assets]
      .sort((a, b) => (b.quantity * b.currentPrice) - (a.quantity * a.currentPrice))
      .slice(0, 5)
      .map(a => ({
        name: a.symbol,
        value: a.quantity * a.currentPrice
      }));
  }, [assets]);

  // Technical Analysis Data Generation
  const analysisData = useMemo(() => {
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return [];

    const cacheKey = `${asset.symbol}_${timeRange}`;
    let baseData = liveDataStore[cacheKey] || [];
    if (baseData.length === 0) {
      if (liveDataStore[`${asset.symbol}_365`]) {
          baseData = liveDataStore[`${asset.symbol}_365`].slice(-timeRange);
      } else {
          baseData = generateHistory(asset.currentPrice, timeRange);
      }
    }
    
    // Create new array to avoid mutating cached data
    let data = [...baseData];

    // Calculate Indicators
    if (showSMA) {
      data = calculateSMA(data, 20); // 20-period SMA
    }
    if (showEMA) {
      data = calculateEMA(data, 20); // 20-period EMA
    }
    if (showRSI) {
      data = calculateRSI(data);
    }
    if (showMACD) {
      data = calculateMACD(data);
    }
    if (showBB) {
      data = calculateBollingerBands(data);
    }

    return data;
  }, [selectedAssetId, timeRange, showSMA, showEMA, showRSI, showMACD, showBB, assets]);

  // Zoom handlers
  const zoom = () => {
    let { refAreaLeft, refAreaRight } = zoomState;

    if (refAreaLeft === refAreaRight || refAreaRight === null) {
      setZoomState((prev) => ({
        ...prev,
        refAreaLeft: null,
        refAreaRight: null,
      }));
      return;
    }

    // xAxis domain
    if (refAreaLeft !== null && refAreaRight !== null) {
      if (refAreaLeft > refAreaRight) [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];

      setZoomState((prev) => ({
        ...prev,
        refAreaLeft: null,
        refAreaRight: null,
        left: refAreaLeft,
        right: refAreaRight,
      }));
    }
  };

  const zoomOut = () => {
    setZoomState({
      left: null,
      right: null,
      refAreaLeft: null,
      refAreaRight: null,
      top: 'auto',
      bottom: 'auto',
    });
  };

  // Handle chart click for drawing tool
  const handleChartClick = (e: any) => {
    if (isDrawMode && e && e.activePayload && e.activePayload[0]) {
      const price = e.activePayload[0].payload.price;
      setRefLines([...refLines, price]);
      setIsDrawMode(false); // Turn off after drawing one line
    }
  };

  // Calculate Trend Line (Simple Linear Regression)
  const trendLineData = useMemo(() => {
    if (!showTrend || analysisData.length === 0) return null;
    
    const n = analysisData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    analysisData.forEach((point, i) => {
      sumX += i;
      sumY += point.price;
      sumXY += i * point.price;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return [
      { date: analysisData[0].date, trend: intercept },
      { date: analysisData[n - 1].date, trend: slope * (n - 1) + intercept }
    ];
  }, [analysisData, showTrend]);


  if (assets.length === 0) return null;

  return (
    <div className="mb-10 animate-fade-in-up">
      {/* Tab Controls */}
      <div className="flex justify-center mb-6">
        <div className="bg-white dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 inline-flex shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'overview' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t('Portfolio Overview')}
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'analysis' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t('Technical Analysis')}
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 p-6 h-96 transition-colors">
            <h3 className="text-slate-800 dark:text-white font-bold mb-6 text-sm uppercase tracking-wider">{t('Asset Allocation')}</h3>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke={darkMode ? '#0f172a' : '#fff'}
                  strokeWidth={2}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => `€${value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`} 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: darkMode ? '1px solid #1e293b' : 'none',
                    backgroundColor: darkMode ? '#0f172a' : '#fff',
                    color: darkMode ? '#fff' : '#000',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  itemStyle={{ color: darkMode ? '#e2e8f0' : '#1e293b', fontWeight: 500 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 p-6 h-96 transition-colors">
            <h3 className="text-slate-800 dark:text-white font-bold mb-6 text-sm uppercase tracking-wider">{t('Top 5 Holdings')}</h3>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={topAssetsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={60} 
                  tick={{fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 500}} 
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip 
                   formatter={(value: number) => `€${value.toLocaleString()}`}
                   cursor={{fill: darkMode ? '#1e293b' : '#f8fafc', opacity: 0.5}}
                   contentStyle={{ 
                    borderRadius: '12px', 
                    border: darkMode ? '1px solid #1e293b' : 'none',
                    backgroundColor: darkMode ? '#0f172a' : '#fff',
                    color: darkMode ? '#fff' : '#000',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  itemStyle={{ color: darkMode ? '#e2e8f0' : '#1e293b', fontWeight: 500 }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                  {topAssetsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 p-6 transition-colors">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 gap-6">
            <div className="w-full lg:w-auto">
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('Select Asset')}</label>
               <select 
                 className="w-full lg:w-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                 value={selectedAssetId}
                 onChange={(e) => {
                   setSelectedAssetId(e.target.value);
                   setRefLines([]); // Clear lines on asset change
                 }}
               >
                 {assets.map(a => (
                   <option key={a.id} value={a.id}>{a.symbol} - {a.name}</option>
                 ))}
               </select>
            </div>

            <div className="flex flex-wrap gap-2">
               {[1, 7, 30, 90, 365, 1825, 3650].map(days => (
                 <button
                   key={days}
                   onClick={() => setTimeRange(days)}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${timeRange === days ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                 >
                   {days === 1 ? '1D' : days === 7 ? '1W' : days === 30 ? '1M' : days === 90 ? '3M' : days === 365 ? '1Y' : days === 1825 ? '5Y' : 'MAX'}
                 </button>
               ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={showSMA} onChange={e => setShowSMA(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700" />
               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">SMA (20)</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={showEMA} onChange={e => setShowEMA(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700" />
               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">EMA (20)</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={showBB} onChange={e => setShowBB(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700" />
               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Bollinger Bands</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={showRSI} onChange={e => setShowRSI(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700" />
               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">RSI</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={showMACD} onChange={e => setShowMACD(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700" />
               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">MACD</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={showTrend} onChange={e => setShowTrend(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700" />
               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('Trend Line')}</span>
             </label>
             
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
             
             <button
                onClick={() => setIsDrawMode(!isDrawMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isDrawMode ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               {isDrawMode ? t('Click Chart to Add Line') : t('Add Support Line')}
             </button>
             {(refLines.length > 0 || zoomState.left !== null) && (
               <div className="flex gap-2">
                 {refLines.length > 0 && (
                   <button onClick={() => setRefLines([])} className="text-xs text-rose-500 hover:text-rose-600 font-medium underline decoration-dashed">
                     {t('Clear Lines')}
                   </button>
                 )}
                 {zoomState.left !== null && (
                   <button onClick={zoomOut} className="text-xs text-blue-500 hover:text-blue-600 font-medium underline decoration-dashed transition-colors">
                     {t('Reset Zoom')}
                   </button>
                 )}
               </div>
             )}
          </div>

          <div className="relative">
            {isLoadingChart && analysisData.length <= 1 && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <TechnicalAnalysisChart 
              data={analysisData}
              height={384}
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
              refLines={refLines}
              setRefLines={setRefLines}
              isDrawMode={isDrawMode}
              setIsDrawMode={setIsDrawMode}
              trendLineData={trendLineData}
            />
          </div>
        </div>
      )}
    </div>
  );
};