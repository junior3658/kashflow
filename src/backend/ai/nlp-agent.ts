/**
 * KASH NLP Agent
 * Purpose: Understand user requests expressed in natural language.
 * Extracts intent, entities, missing fields, and returns validated structured JSON.
 * HARD INVARIANT: The NLP agent must NEVER execute financial operations.
 */

import { LLMProvider } from './llm-provider';
import { PROMPTS } from './prompts';
import { AIIntentExtraction, Currency } from '../types';

export class NLPAgent {
  static async extractIntent(userInput: string): Promise<AIIntentExtraction> {
    const prompt = `User Request: "${userInput}"\n\nAnalyze this request according to your system prompt and return the structured JSON object.`;

    const response = await LLMProvider.generate(prompt, {
      model: 'gemini-3.8-flash',
      systemInstruction: PROMPTS.NLP_AGENT,
      jsonMode: true,
      temperature: 0.1,
    });

    try {
      const parsed = JSON.parse(response.text.trim());
      return {
        intent: parsed.intent || 'general_financial_question',
        confidence: Number(parsed.confidence) || 0.95,
        entities: {
          amount: parsed.entities?.amount ? Number(parsed.entities.amount) : undefined,
          currency: (parsed.entities?.currency as Currency) || 'USD',
          recipient: parsed.entities?.recipient || undefined,
          paymentMethod: parsed.entities?.payment_method || parsed.entities?.paymentMethod,
          source: parsed.entities?.source,
          destination: parsed.entities?.destination,
        },
        missingInformation: Array.isArray(parsed.missing_information)
          ? parsed.missing_information
          : Array.isArray(parsed.missingInformation)
          ? parsed.missingInformation
          : [],
        requiresConfirmation: Boolean(parsed.requires_confirmation ?? parsed.requiresConfirmation),
        actionType: parsed.action_type || parsed.actionType || 'informational',
      };
    } catch (err) {
      // Deterministic fallback if model JSON output has syntax anomaly
      return {
        intent: 'general_financial_question',
        confidence: 0.85,
        entities: { currency: 'USD' },
        missingInformation: [],
        requiresConfirmation: false,
        actionType: 'informational',
      };
    }
  }
}
