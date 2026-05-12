import { StrategyLogic } from '../models/Strategy';
import dotenv from 'dotenv';

dotenv.config();

export class OllamaService {
  private apiKey: string;
  private baseURL: string;
  private readonly isMockMode: boolean;

  constructor() {
    this.apiKey = process.env.OLLAMA_API_KEY || '';
    this.baseURL = 'https://ollama.com';
    this.isMockMode = !this.apiKey || process.env.MOCK_MODE === 'true';
  }

  /**
   * Converts a natural language description of a strategy into a structured JSON logic
   * Using Ollama Cloud API
   */
  async parseNaturalLanguageToStrategy(prompt: string): Promise<StrategyLogic> {
    console.log(`[OllamaService] Parsing strategy prompt: ${prompt}`);

    if (this.isMockMode) {
      return this.generateMockLogic(prompt);
    }

    if (!this.apiKey) {
      throw new Error('Ollama API key not configured. Check your OLLAMA_API_KEY.');
    }

    const systemPrompt = `
      You are an expert DeFi Quantitative Strategist. Your task is to convert natural language descriptions of Liquidity Provision (LP) strategies into a precise JSON format.

      The output must be a valid JSON object conforming to following schema:
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
      6. Return ONLY JSON object. Do not include markdown formatting, explanations, or any other text.
    `;

    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3:12b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.message?.content;
      
      if (!content) {
        throw new Error('Ollama returned empty response');
      }

      // Handle markdown JSON format from Ollama
      let jsonContent = content;
      if (content.includes('```json')) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        }
      } else if (content.includes('```')) {
        const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        }
      }

      const logic: StrategyLogic = JSON.parse(jsonContent);
      return logic;
    } catch (error) {
      console.error('[OllamaService] Error parsing with AI:', error);
      throw new Error(`Ollama Strategy Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mock implementation for demonstration purposes when API keys are missing.
   */
  private generateMockLogic(prompt: string): StrategyLogic {
    console.log('[OllamaService] Using mock logic generator');

    const promptLower = prompt.toLowerCase();
    
    // Extract conditions
    let conditions = [];
    if (promptLower.includes('volume') && promptLower.includes('increase')) {
      const match = promptLower.match(/(\d+)%/);
      const value = match ? parseInt(match[1]) : 25;
      conditions.push({
        metric: 'volume' as const,
        operator: 'increased_by_percent' as const,
        value: value,
        timeframe: '1h' as const
      });
    } else if (promptLower.includes('apy') && promptLower.includes('above')) {
      const match = promptLower.match(/(\d+)%/);
      const value = match ? parseInt(match[1]) : 15;
      conditions.push({
        metric: 'apy' as const,
        operator: 'greater_than' as const,
        value: value,
        timeframe: '24h' as const
      });
    }

    // Extract actions
    let actions = [];
    if (promptLower.includes('zap in')) {
      const match = promptLower.match(/(\d+)%/);
      const amount = match ? parseInt(match[1]) : 100;
      actions.push({
        type: 'zap_in' as const,
        amount_percent: amount,
        target_pool: '5hbf9JP8k5zdrZp9pokPypFQoBse5mGCmW6nqodurGcd'
      });
    } else if (promptLower.includes('zap out')) {
      const match = promptLower.match(/(\d+)%/);
      const amount = match ? parseInt(match[1]) : 100;
      actions.push({
        type: 'zap_out' as const,
        amount_percent: amount,
        target_pool: '5hbf9JP8k5zdrZp9pokPypFQoBse5mGCmW6nqodurGcd'
      });
    }

    // Default frequency
    const frequency = promptLower.includes('realtime') || promptLower.includes('real time') ? 'realtime' : 
                    promptLower.includes('hourly') ? 'hourly' : 'daily';

    return {
      conditions: conditions.length > 0 ? conditions : [{
        metric: 'volume' as const,
        operator: 'increased_by_percent' as const,
        value: 25,
        timeframe: '1h' as const
      }],
      actions: actions.length > 0 ? actions : [{
        type: 'zap_in' as const,
        amount_percent: 100,
        target_pool: '5hbf9JP8k5zdrZp9pokPypFQoBse5mGCmW6nqodurGcd'
      }],
      frequency: frequency as 'realtime' | 'hourly' | 'daily'
    };
  }
}
