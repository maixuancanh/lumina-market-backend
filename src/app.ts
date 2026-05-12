import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AIAgentScheduler } from './services/aiAgentScheduler';

dotenv.config();

const app: Application = express();
const aiAgentScheduler = new AIAgentScheduler();

// Middleware
app.use(cors());
app.use(express.json());

// Basic Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'StratLP Backend is running smoothly',
  });
});

// API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'StratLP Backend API is running smoothly',
    services: {
      aiAgent: aiAgentScheduler.getStatus().isRunning,
      ollama: true,
      lpAgent: true
    }
  });
});

import strategyRoutes from './routes/strategyRoutes';
import executionRoutes from './routes/executionRoutes';

app.use('/api/strategies', strategyRoutes);
app.use('/api/execution', executionRoutes);

// AI Agent Management Endpoints
app.get('/api/ai-agent/status', (req: Request, res: Response) => {
  const status = aiAgentScheduler.getStatus();
  res.status(200).json({
    success: true,
    data: status,
    message: 'AI Agent status retrieved successfully',
  });
});

app.post('/api/ai-agent/start', (req: Request, res: Response) => {
  aiAgentScheduler.start();
  res.status(200).json({
    success: true,
    message: 'AI Agent started successfully',
  });
});

app.post('/api/ai-agent/stop', (req: Request, res: Response) => {
  aiAgentScheduler.stop();
  res.status(200).json({
    success: true,
    message: 'AI Agent stopped successfully',
  });
});

// AI Agent Monitoring Endpoint
app.get('/api/ai-agent/monitoring', (req: Request, res: Response) => {
  const status = aiAgentScheduler.getStatus();
  res.status(200).json({
    success: true,
    data: {
      isMonitoring: status.isRunning,
      lastCheck: status.lastCheck,
      strategiesChecked: 3, // Default number of strategies
      uptime: status.uptime,
      nextCheck: new Date(Date.now() + 60000).toISOString() // Next check in 1 minute
    },
    message: 'AI Agent monitoring status retrieved successfully',
  });
});

// LP Agent API Endpoints
import { LPAgentService } from './services/lpAgentService';
const lpAgentService = new LPAgentService();

app.get('/api/lp-agent/pools', async (req: Request, res: Response) => {
  try {
    // Return sample pool data for demo
    const pools = [
      {
        poolId: '5hbf9JP8k5zdrZp9pokPypFQoBse5mGCmW6nqodurGcd',
        apy: 18.5,
        tvl: 2500000,
        volume24h: 150000,
        currentPrice: 98.50,
        volatility30m: 2.3
      },
      {
        poolId: '2DeF1QHAQMpNXCGjcsm2pWw1V4KknGtwd2wEh2fTriKC',
        apy: 22.8,
        tvl: 1800000,
        volume24h: 120000,
        currentPrice: 145.20,
        volatility30m: 3.1
      }
    ];
    
    res.status(200).json({
      success: true,
      data: pools,
      message: 'LP Agent pools retrieved successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve LP Agent pools',
    });
  }
});

app.get('/api/lp-agent/positions/:owner', async (req: Request, res: Response) => {
  try {
    const { owner } = req.params;
    const portfolio = await lpAgentService.getPortfolio(owner);
    res.status(200).json({
      success: true,
      data: portfolio,
      message: 'LP positions retrieved successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve LP positions',
    });
  }
});

// Start AI Agent automatically when server starts
setTimeout(() => {
  console.log('[App] 🤖 Auto-starting AI Agent...');
  aiAgentScheduler.start();
}, 2000); // Wait 2 seconds for strategies to be seeded

app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

export default app;
