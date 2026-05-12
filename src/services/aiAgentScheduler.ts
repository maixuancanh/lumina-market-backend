import { StrategyService } from './strategyService';
import { LPAgentService } from './lpAgentService';
import { strategyServiceInstance } from './strategyServiceSingleton';

export class AIAgentScheduler {
  private strategyService: StrategyService;
  private lpAgentService: LPAgentService;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.strategyService = strategyServiceInstance;
    this.lpAgentService = new LPAgentService();
  }

  /**
   * Start the AI Agent to run 24/7
   * Checks all active strategies every 30 seconds
   */
  start() {
    if (this.isRunning) {
      console.log('[AIAgentScheduler] AI Agent is already running');
      return;
    }

    console.log('[AIAgentScheduler] 🤖 Starting AI Agent 24/7 monitoring...');
    this.isRunning = true;

    // Run immediately on start
    this.runAllActiveStrategies();

    // Then run every 30 seconds
    this.intervalId = setInterval(() => {
      this.runAllActiveStrategies();
    }, 30000); // 30 seconds

    console.log('[AIAgentScheduler] ✅ AI Agent started - checking strategies every 30 seconds');
  }

  /**
   * Stop the AI Agent
   */
  stop() {
    if (!this.isRunning) {
      console.log('[AIAgentScheduler] AI Agent is not running');
      return;
    }

    console.log('[AIAgentScheduler] 🛑 Stopping AI Agent...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[AIAgentScheduler] ✅ AI Agent stopped');
  }

  /**
   * Get current status of AI Agent
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.intervalId ? 'Active' : 'Inactive',
      lastCheck: new Date().toISOString(),
    };
  }

  /**
   * Run all active strategies and execute actions if conditions are met
   */
  private async runAllActiveStrategies() {
    try {
      console.log(`[AIAgentScheduler] 🔍 Checking strategies at ${new Date().toISOString()}`);
      
      const strategies = await this.strategyService.listStrategies();
      const activeStrategies = strategies.filter(s => s.isActive);

      console.log(`[AIAgentScheduler] Found ${activeStrategies.length} active strategies`);

      for (const strategy of activeStrategies) {
        await this.evaluateAndExecuteStrategy(strategy);
      }

      console.log(`[AIAgentScheduler] ✅ Strategy check completed at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[AIAgentScheduler] ❌ Error in strategy evaluation:', error);
    }
  }

  /**
   * Evaluate a single strategy and execute actions if conditions are met
   */
  private async evaluateAndExecuteStrategy(strategy: any) {
    try {
      console.log(`[AIAgentScheduler] 📊 Evaluating strategy: ${strategy.name}`);

      // Get pool data for strategy conditions
      const targetPool = strategy.logic.actions[0]?.target_pool || 'pool_sol_usdc';
      const poolData = await this.lpAgentService.getPoolData(targetPool);

      // Evaluate conditions
      const results = this.evaluateConditions(strategy.logic.conditions, poolData);
      const allConditionsMet = results.every((r: any) => r.met);

      console.log(`[AIAgentScheduler] Strategy "${strategy.name}" conditions met: ${allConditionsMet}`);

      if (allConditionsMet) {
        console.log(`[AIAgentScheduler] 🚀 Executing strategy: ${strategy.name}`);
        
        // Execute actions
        const executionLogs = [];
        for (const action of strategy.logic.actions) {
          const mockUserAddress = 'AI_Agent_User'; // AI Agent uses mock user for demo
          
          const zapRequest = {
            userAddress: mockUserAddress,
            poolAddress: action.target_pool || targetPool,
            amount: action.amount_percent,
            direction: action.type === 'zap_in' ? 'in' as const : 'out' as const,
          };

          const zapResponse = action.type === 'zap_in'
            ? await this.lpAgentService.zapIn(zapRequest)
            : await this.lpAgentService.zapOut(zapRequest);

          executionLogs.push({
            action: action.type,
            status: zapResponse.status,
            txId: zapResponse.transactionId,
            timestamp: new Date().toISOString(),
          });

          console.log(`[AIAgentScheduler] ✅ Executed ${action.type}: ${zapResponse.transactionId}`);
        }

        // Store execution log (in real app, this would go to database)
        console.log(`[AIAgentScheduler] 📝 Strategy "${strategy.name}" executed successfully:`, executionLogs);
      } else {
        console.log(`[AIAgentScheduler] ⏳ Strategy "${strategy.name}" conditions not met, skipping`);
      }
    } catch (error) {
      console.error(`[AIAgentScheduler] ❌ Error evaluating strategy "${strategy.name}":`, error);
    }
  }

  /**
   * Evaluate strategy conditions based on pool data
   */
  private evaluateConditions(conditions: any[], poolData: any) {
    return conditions.map((cond) => {
      let met = false;
      const currentVal = poolData[cond.metric];

      switch (cond.operator) {
        case 'greater_than':
          met = currentVal > cond.value;
          break;
        case 'less_than':
          met = currentVal < cond.value;
          break;
        case 'increased_by_percent':
          met = currentVal > (cond.value * 1.2);
          break;
        case 'decreased_by_percent':
          met = currentVal < (cond.value * 0.8);
          break;
      }

      return {
        metric: cond.metric,
        expected: cond.value,
        actual: currentVal,
        met,
      };
    });
  }
}
