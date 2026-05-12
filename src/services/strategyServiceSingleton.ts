import { StrategyService } from './strategyService';

// Singleton instance to ensure all controllers use the same StrategyService
export const strategyServiceInstance = new StrategyService();
