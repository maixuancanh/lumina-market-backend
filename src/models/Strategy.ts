export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface StrategyCondition {
  metric: 'volume' | 'apy' | 'tvl' | 'price_volatility';
  operator: 'greater_than' | 'less_than' | 'increased_by_percent' | 'decreased_by_percent';
  value: number;
  timeframe: '1h' | '24h' | '7d';
}

export interface StrategyAction {
  type: 'zap_in' | 'zap_out';
  amount_percent: number;
  target_pool?: string; // The pool address to enter or exit
}

export interface StrategyLogic {
  conditions: StrategyCondition[];
  actions: StrategyAction[];
  frequency: 'realtime' | 'hourly' | 'daily';
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  creatorAddress: string;
  nftAddress?: string;
  logic: StrategyLogic;
  riskLevel: RiskLevel;
  performance: {
    totalProfitPercent: number;
    maxDrawdownPercent: number;
    sharpeRatio?: number;
    history: ProfitPoint[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfitPoint {
  timestamp: Date;
  pnl: number;
}

/**
 * Types for the LP Agent API interactions
 */
export interface PoolData {
  poolAddress: string;
  volume24h: number;
  apy: number;
  tvl: number;
  currentPrice: number;
  volatility30m: number;
}

export interface PortfolioData {
  address: string;
  totalValueUSD: number;
  positions: {
    poolAddress: string;
    amountUSD: number;
    currentApy: number;
  }[];
}

export interface ZapRequest {
  userAddress: string;
  poolAddress: string;
  amount: number; // in USD or token
  direction: 'in' | 'out';
}

export interface ZapResponse {
  transactionId: string;
  status: 'success' | 'failed';
  timestamp: number;
}
