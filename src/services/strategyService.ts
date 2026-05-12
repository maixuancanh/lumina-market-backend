import { Strategy, StrategyLogic, RiskLevel, ProfitPoint } from '../models/Strategy';
import { LPAgentService } from './lpAgentService';

export class StrategyService {
  // In-memory store for the prototype. In production, this would be PostgreSQL.
  private strategies: Map<string, Strategy> = new Map();
  private lpAgentService: LPAgentService;
  private isSeeded = false;

  constructor() {
    this.lpAgentService = new LPAgentService();
    // Don't await in constructor - strategies will be seeded asynchronously
    this.seedStrategies().catch(err => {
      console.error('[StrategyService] Error seeding strategies:', err);
    });
  }

  private async seedStrategies() {
    console.log('[StrategyService] Seeding sample strategies for demo...');

    const strategy1 = await this.createStrategy({
      name: 'Solana Stable Growth',
      description: 'A conservative strategy focusing on high APY pools with low volatility. Ideal for long-term holders.',
      creatorAddress: '0xAlphaStrategist',
      riskLevel: 'Low',
      logic: {
        conditions: [{ metric: 'apy', operator: 'greater_than', value: 8, timeframe: '24h' }],
        actions: [{ type: 'zap_in', amount_percent: 100, target_pool: '5hbf9JP8k5zdrZp9pokPypFQoBse5mGCmW6nqodurGcd' }],
        frequency: 'daily',
      }
    });
    console.log(`[StrategyService] Created strategy 1 with ID: ${strategy1.id}`);

    const strategy2 = await this.createStrategy({
      name: 'Aggressive Volatility Hunter',
      description: 'Captures massive fees during high-volume spikes. High risk, high reward.',
      creatorAddress: '0xDegeneratePro',
      riskLevel: 'High',
      logic: {
        conditions: [{ metric: 'volume', operator: 'increased_by_percent', value: 50, timeframe: '1h' }],
        actions: [{ type: 'zap_in', amount_percent: 100, target_pool: '5hbf9JP8k5zdrZp9pokPypFQoBse5mGCmW6nqodurGcd' }],
        frequency: 'realtime',
      }
    });
    console.log(`[StrategyService] Created strategy 2 with ID: ${strategy2.id}`);

    const strategy3 = await this.createStrategy({
      name: 'Delta Neutral Guard',
      description: 'Protects capital by exiting pools quickly when price volatility spikes.',
      creatorAddress: '0xRiskManager',
      riskLevel: 'Medium',
      logic: {
        conditions: [{ metric: 'price_volatility', operator: 'greater_than', value: 5, timeframe: '1h' }],
        actions: [{ type: 'zap_out', amount_percent: 100, target_pool: '5hbf9JP8k5zdrZp9pokPypFQoBse5mGCmW6nqodurGcd' }],
        frequency: 'realtime',
      }
    });
    console.log(`[StrategyService] Created strategy 3 with ID: ${strategy3.id}`);
    console.log(`[StrategyService] Total strategies in database: ${this.strategies.size}`);
    this.isSeeded = true;
    console.log(`[StrategyService] Seeding completed successfully`);
  }

  /**
   * Creates a new strategy in the marketplace
   */
  async createStrategy(data: Partial<Strategy>): Promise<Strategy> {
    const id = `strat_${Math.random().toString(36).substr(2, 9)}`;

    const newStrategy: Strategy = {
      id,
      name: data.name || 'Untitled Strategy',
      description: data.description || '',
      creatorAddress: data.creatorAddress || '0x0000',
      nftAddress: data.nftAddress,
      logic: data.logic!,
      riskLevel: data.riskLevel || 'Medium',
      performance: {
        totalProfitPercent: 0,
        maxDrawdownPercent: 0,
        history: [],
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.strategies.set(id, newStrategy);

    // Calculate initial backtest performance to provide "Proof of Profit"
    await this.runBacktest(id);

    return newStrategy;
  }

  /**
   * Retrieves a specific strategy by its ID
   */
  async getStrategy(id: string): Promise<Strategy | null> {
    // Wait for seeding to complete if not done yet
    if (!this.isSeeded) {
      console.log(`[StrategyService] Waiting for seeding to complete...`);
      let attempts = 0;
      while (!this.isSeeded && attempts < 50) { // Wait up to 5 seconds
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!this.isSeeded) {
        console.log(`[StrategyService] Seeding timeout - strategies not available`);
        return null;
      }
    }
    
    console.log(`[StrategyService] Looking for strategy ID: ${id}`);
    console.log(`[StrategyService] Available strategies:`, Array.from(this.strategies.keys()));
    console.log(`[StrategyService] Is seeded: ${this.isSeeded}, Total strategies: ${this.strategies.size}`);
    const strategy = this.strategies.get(id) || null;
    console.log(`[StrategyService] Strategy found:`, strategy ? strategy.name : 'NULL');
    return strategy;
  }

  /**
   * Lists all strategies currently available in the marketplace
   */
  async listStrategies(): Promise<Strategy[]> {
    return Array.from(this.strategies.values());
  }

  /**
   * Simulates historical performance of a strategy (Proof of Profit)
   * This uses the LPAgentService to simulate what would have happened
   */
  async runBacktest(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    console.log(`[StrategyService] Running backtest for strategy ${strategyId}...`);

    // Mock simulation of the last 30 days
    const history: ProfitPoint[] = [];
    let currentPnL = 0;
    let maxDrawdown = 0;
    let peak = 0;

    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Simulate a daily PnL based on risk level
      const volatility = strategy.riskLevel === 'High' ? 2.0 : strategy.riskLevel === 'Medium' ? 0.8 : 0.3;
      const dailyChange = (Math.random() - 0.4) * volatility; // Slight upward bias

      currentPnL += dailyChange;

      if (currentPnL > peak) peak = currentPnL;
      const drawdown = peak - currentPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      history.push({
        timestamp: date,
        pnl: currentPnL,
      });
    }

    strategy.performance = {
      totalProfitPercent: currentPnL,
      maxDrawdownPercent: maxDrawdown,
      history: history,
    };

    this.strategies.set(strategyId, strategy);
  }

  /**
   * Updates an existing strategy
   */
  async updateStrategy(id: string, data: Partial<Strategy>): Promise<Strategy> {
    const strategy = this.strategies.get(id);
    if (!strategy) throw new Error('Strategy not found');

    const updated = { ...strategy, ...data, updatedAt: new Date() };
    this.strategies.set(id, updated);

    // Re-run backtest if logic changed
    if (data.logic) {
      await this.runBacktest(id);
    }

    return updated;
  }

  /**
   * Deactivates a strategy (e.g., if the NFT is burned or strategy is outdated)
   */
  async toggleStrategyStatus(id: string, status: boolean): Promise<void> {
    const strategy = this.strategies.get(id);
    if (!strategy) throw new Error('Strategy not found');

    strategy.isActive = status;
    this.strategies.set(id, strategy);
  }
}
