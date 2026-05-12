import { Request, Response } from 'express';
import { strategyServiceInstance } from '../services/strategyServiceSingleton';
import { LPAgentService } from '../services/lpAgentService';
import { ZapRequest } from '../models/Strategy';

const strategyService = strategyServiceInstance;
const lpAgentService = new LPAgentService();

export class ExecutionController {
  /**
   * Trigger the AI Agent to evaluate and execute a strategy for a user
   * Endpoint: POST /api/execution/run
   */
  async runStrategy(req: Request, res: Response) {
    try {
      const { strategyId, userAddress } = req.body;

      if (!strategyId || !userAddress) {
        return res.status(400).json({
          error: 'Missing required parameters: strategyId and userAddress',
        });
      }

      // 1. Fetch the strategy
      console.log(`[ExecutionController] Looking for strategy with ID: ${strategyId}`);
      const strategy = await strategyService.getStrategy(strategyId);
      console.log(`[ExecutionController] Found strategy:`, strategy ? strategy.name : 'NULL');
      
      if (!strategy) {
        console.log(`[ExecutionController] Strategy ${strategyId} not found in database`);
        return res.status(404).json({ error: 'Strategy not found' });
      }

      if (!strategy.isActive) {
        return res.status(403).json({ error: 'This strategy is currently inactive' });
      }

      console.log(`[ExecutionController] Running strategy ${strategy.name} for user ${userAddress}`);

      // 2. Gather real-time data needed for the conditions
      // In a real scenario, we would look at which pools the strategy references
      // For this demo, we'll assume a set of primary pools or a default pool
      const targetPool = strategy.logic.actions[0]?.target_pool || 'pool_sol_usdc';
      const poolData = await lpAgentService.getPoolData(targetPool);
      const portfolio = await lpAgentService.getPortfolio(userAddress);

      // 3. Evaluate conditions
      const results = this.evaluateConditions(strategy.logic.conditions, poolData);
      const allConditionsMet = results.every((r) => r.met);

      if (!allConditionsMet) {
        return res.status(200).json({
          status: 'skipped',
          message: 'Strategy conditions not met',
          evaluation: results,
        });
      }

      // 4. Execute actions
      const executionLogs = [];
      for (const action of strategy.logic.actions) {
        const zapRequest: ZapRequest = {
          userAddress: userAddress,
          poolAddress: action.target_pool || targetPool,
          amount: action.amount_percent, // Simplified: using percent as amount for demo
          direction: action.type === 'zap_in' ? 'in' : 'out' as 'in' | 'out',
        };

        const zapResponse = action.type === 'zap_in'
          ? await lpAgentService.zapIn(zapRequest)
          : await lpAgentService.zapOut(zapRequest);

        executionLogs.push({
          action: action.type,
          status: zapResponse.status,
          txId: zapResponse.transactionId,
        });
      }

      return res.status(200).json({
        status: 'executed',
        message: 'Strategy successfully executed',
        executionLogs,
      });
    } catch (error: any) {
      console.error('[ExecutionController] Error running strategy:', error);
      return res.status(500).json({
        error: 'Execution failed',
        message: error.message,
      });
    }
  }

  /**
   * Helper to evaluate if a set of strategy conditions are met based on current pool data
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
          // Simplified: in a real system, we'd compare against historical data
          // For demo, we simulate that it's met if current value is > a certain threshold
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

export default new ExecutionController();
