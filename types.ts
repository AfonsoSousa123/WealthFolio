export enum AssetType {
  STOCK = 'Stock',
  ETF = 'ETF',
  COMMODITY = 'Commodity',
  CRYPTO = 'Crypto',
  CASH = 'Cash',
  BOND = 'Bond'
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType | string;
  quantity: number;
  avgPrice: number;
  currentPrice: number; // In a real app, this would be fetched live
  currency: string;
  alertHigh?: number;
  alertLow?: number;
  allocation?: number; // % de Alocação
  targetInvestment?: number; // € a investir
  targetInvestmentPerPerson?: number; // € a investir cada
  isin?: string; // International Securities Identification Number
  wkn?: string; // Wertpapierkennnummer
  ter?: number; // Total Expense Ratio (%)
  fundSize?: string; // Fund Size (e.g. "€2.5B")
  replication?: string; // Replication method (e.g. "Physical")
  distribution?: string; // Accumulating/Distributing
}

export interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
}

export interface AIAnalysisResult {
  riskScore: number;
  riskAssessment: string;
  suggestions: string[];
  diversificationStatus: string;
}

export interface AIAssetAnalysisResult {
  summary: string;
  bullishCase: string;
  bearishCase: string;
  rating: 'Buy' | 'Hold' | 'Sell';
  priceTarget: string;
}

export interface RealTimeAssetData {
  price: number;
  currency: string;
  marketCap: string;
  peRatio: string;
  dividendYield: string;
  high52: number;
  low52: number;
  volume: string;
  description: string;
  lastUpdated: string;
  sourceUrl?: string;
  sourceTitle?: string;
  ter?: number;
  fundSize?: string;
  replication?: string;
  distribution?: string;
}

// Global declaration for the SheetJS library loaded via CDN
declare global {
  interface Window {
    XLSX: any;
  }
}