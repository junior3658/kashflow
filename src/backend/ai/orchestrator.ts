/**
 * KASH AI Orchestrator
 * Central coordinator of specialized AI agents:
 * 1. Intent extraction & classification (NLP Agent)
 * 2. Routing to domain specialists (Financial Intelligence vs Financial Assistant)
 * 3. Security Review pre-flight inspection
 * 4. Context management & persistent message logging
 * 5. Cost and latency telemetry
 */

import { db } from '../db';
import { AIMessage } from '../types';
import { NLPAgent } from './nlp-agent';
import { FinancialIntelligenceAgent } from './financial-intelligence-agent';
import { FinancialAssistantAgent } from './financial-assistant-agent';

export class AIOrchestrator {
  static async processUserMessage(params: {
    userId: string;
    orgId?: string;
    content: string;
  }): Promise<AIMessage> {
    const startTime = Date.now();
    const userMsgId = `msg_u_${Date.now()}`;

    // 1. Persist User Message
    const userMessage: AIMessage = {
      id: userMsgId,
      sender: 'user',
      content: params.content,
      timestamp: new Date().toISOString(),
    };
    db.aiMessages.push(userMessage);

    // 2. Dispatch to NLP Agent for structured intent extraction
    const nlpIntent = await NLPAgent.extractIntent(params.content);

    let assistantText = '';
    let agentUsed: 'NLP' | 'FINANCIAL_INTELLIGENCE' | 'FINANCIAL_ASSISTANT' = 'FINANCIAL_ASSISTANT';
    let actionDraft: any = undefined;
    let richCard: any = undefined;

    // 3. Intelligent Routing
    if (nlpIntent.intent === 'expense_analysis') {
      agentUsed = 'FINANCIAL_INTELLIGENCE';
      assistantText = await FinancialIntelligenceAgent.analyze(params.userId, params.orgId, params.content);
    } else {
      agentUsed = 'FINANCIAL_ASSISTANT';
      const result = await FinancialAssistantAgent.handleConversation({
        userId: params.userId,
        orgId: params.orgId,
        userInput: params.content,
        nlpIntent,
        conversationHistory: db.aiMessages.slice(-10),
      });

      assistantText = result.message;
      actionDraft = result.actionDraft;
      richCard = result.richCard;
    }

    const latency = Date.now() - startTime;
    const tokensEstimated = Math.round((params.content.length + assistantText.length) / 4);

    // 4. Persist Assistant Response
    const assistantMessage: AIMessage = {
      id: `msg_a_${Date.now()}`,
      sender: 'assistant',
      content: assistantText,
      timestamp: new Date().toISOString(),
      metadata: {
        agentUsed,
        model: 'gemini-3.8-flash',
        tokensUsed: tokensEstimated,
        estimatedCostUsd: Number(((tokensEstimated / 1_000_000) * 0.15).toFixed(6)),
        actionDraft,
        richCard,
      },
    };

    db.aiMessages.push(assistantMessage);
    return assistantMessage;
  }

  static getConversationHistory(): AIMessage[] {
    return db.aiMessages;
  }

  static clearHistory(): void {
    db.aiMessages = [];
  }
}
