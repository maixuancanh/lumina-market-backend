import OpenAI from 'openai';
import { StrategyLogic, StrategyCondition, StrategyAction } from '../models/Strategy';
import dotenv from 'dotenv';

dotenv.config();

export class AIStrategyService {
  private openai: OpenAI | null = null;
  private readonly isMockMode: boolean;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.isMockMode = !apiKey || process.env.MOCK_MODE === 'true';

    if (!this.isMockMode && apiKey) {
      // Configure for Ollama cloud
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.ollama.com/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        dangerouslyAllowBrowser: true,
      });
    }
  }

  /**
   * Converts a natural language description of a strategy into a structured JSON logic
   * Example: "If volume of SOL-USDC increases by 20% in 1 hour and APY > 10%, zap in 50% of capital."
   */
  async parseNaturalLanguageToStrategy(prompt: string): Promise<StrategyLogic> {
    console.log(`[AIStrategyService] Parsing strategy prompt: ${prompt}`);

    if (this.isMockMode) {
      return this.generateMockLogic(prompt);
    }

    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Check your API key.');
    }

    const systemPrompt = `
      You are an expert DeFi Quantitative Strategist. Your task is to convert natural language descriptions of Liquidity Provision (LP) strategies into a precise JSON format.

      The output must be a valid JSON object conforming to the following schema:
      {
        "conditions": [
          {
            "metric": "volume" | "apy" | "tvl" | "price_volatility",
            "operator": "greater_than" | "less_than" | "increased_by_percent" | "decreased_by_percent",
            "value": number,
            "timeframe": "1h" | "24h" | "7d"
          }
        ],
        "actions": [
          {
            "type": "zap_in" | "zap_out",
            "amount_percent": number,
            "target_pool": string (optional)
          }
        ],
        "frequency": "realtime" | "hourly" | "daily"
      }

      Rules:
      1. "increases by X%" should map to "increased_by_percent".
      2. "decreases by X%" should map to "decreased_by_percent".
      3. "above X%" or "greater than X" should map to "greater_than".
      4. If no timeframe is mentioned, default to "24h".
      5. If no frequency is mentioned, default to "realtime".
      6. Return ONLY the JSON object. Do not include markdown formatting, explanations, or any other text.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'llama3.1:8b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('AI returned empty response');
      }

      const logic: StrategyLogic = JSON.parse(content);
      return logic;
    } catch (error) {
      console.error('[AIStrategyService] Error parsing with AI:', error);
      throw new Error(`AI Strategy Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mock implementation for demonstration purposes when API keys are missing.
   */
  private generateMockLogic(prompt: string): StrategyLogic {
    console.log('[AIStrategyService] Using mock logic generator');

    const promptLower = prompt.toLowerCase();

    const conditions: StrategyCondition[] = [];
    const actions: StrategyAction[] = [];

    if (promptLower.includes('volume')) {
      conditions.push({
        metric: 'volume',
        operator: promptLower.includes('increase') ? 'increased_by_percent' : 'greater_than',
        value: promptLower.match(/\d+%/)?.[0]?.replace('%', '') ? parseInt(promptLower.match(/\d+%/)?.[0]!.replace('%', '')!) : 20,
        timeframe: promptLower.includes('1h') ? '1h' : '24h',
      });
    }

    if (promptLower.includes('apy')) {
      conditions.push({
        metric: 'apy',
        operator: 'greater_than',
        value: (() => {
          const match = promptLower.match(/\d+%/)?.[0]?.replace('%', '');
          return match ? parseInt(match) : 10;
        })(),
        timeframe: '24h',
      });
    }

    if (promptLower.includes('zap in') || promptLower.includes('nạp')) {
      actions.push({
        type: 'zap_in',
        amount_percent: (() => {
          const match = promptLower.match(/\d+%/)?.[0]?.replace('%', '');
          return match ? parseInt(match) : 50;
        })(),
      });
    } else if (promptLower.includes('zap out') || promptLower.includes('rút')) {
      actions.push({
        type: 'zap_out',
        amount_percent: (() => {
          const match = promptLower.match(/\d+%/)?.[0]?.replace('%', '');
          return match ? parseInt(match) : 100;
        })(),
      });
    }

    // Fallback if no patterns matched
    if (actions.length === 0) {
      actions.push({ type: 'zap_in', amount_percent: 100 });
    }

    return {
      conditions,
      actions,
      frequency: 'realtime',
    };
  }
}
