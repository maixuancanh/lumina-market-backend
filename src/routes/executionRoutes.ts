import { Router } from 'express';
import ExecutionController from '../controllers/executionController';

const router = Router();

/**
 * Trigger the AI execution agent to evaluate a strategy and execute actions.
 * POST /api/execution/run
 * Body: { strategyId: string, userAddress: string }
 */
router.post('/run', (req, res) => ExecutionController.runStrategy(req, res));

export default router;
