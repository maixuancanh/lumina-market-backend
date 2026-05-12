import express from 'express';
import { StrategyController } from '../controllers/strategyController';

const router = express.Router();

/**
 * @route   POST /api/strategies/analyze
 * @desc    Translates natural language strategy description to JSON logic
 * @access  Public
 */
router.post('/analyze', StrategyController.analyzeStrategy);

/**
 * @route   POST /api/strategies
 * @desc    Creates and registers a new strategy in the marketplace
 * @access  Public
 */
router.post('/', StrategyController.createStrategy);

/**
 * @route   GET /api/strategies
 * @desc    Lists all available strategies for the marketplace
 * @access  Public
 */
router.get('/', StrategyController.listStrategies);

/**
 * @route   GET /api/strategies/:id
 * @desc    Gets detailed information and performance for a specific strategy
 * @access  Public
 */
router.get('/:id', StrategyController.getStrategy);

export default router;
