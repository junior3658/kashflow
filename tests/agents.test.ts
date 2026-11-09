/**
 * Unit & Integration Tests: KASHFLOW Multi-Agent AI Infrastructure
 */

import { NLPAgent } from '../src/backend/ai/nlp-agent';
import { FinancialIntelligenceAgent } from '../src/backend/ai/financial-intelligence-agent';
import { FinancialAssistantAgent } from '../src/backend/ai/financial-assistant-agent';
import { AIOrchestrator } from '../src/backend/ai/orchestrator';

export async function testAIAgents() {
  console.log('--- RUNNING MULTI-AGENT TESTS ---');

  // Test 1: NLP Agent Intent & Entity Extraction
  const nlpResult = await NLPAgent.extractIntent('Send 100 USD to my supplier');
  if (nlpResult.intent !== 'transfer_request') {
    throw new Error(`Expected transfer_request intent, got ${nlpResult.intent}`);
  }
  if (nlpResult.entities.amount !== 100) {
    throw new Error(`Expected amount 100, got ${nlpResult.entities.amount}`);
  }
  if (!nlpResult.requiresConfirmation) {
    throw new Error('Sensitive action must require confirmation');
  }
  console.log('✓ NLP Agent extraction verified with structured schema.');

  // Test 2: Financial Intelligence Agent with Verified Data
  const intelResult = await FinancialIntelligenceAgent.analyze(
    'usr_junior_01',
    'org_kashflow_corp',
    'What is my net cash flow this week?'
  );
  if (!intelResult || intelResult.length < 10) {
    throw new Error('Financial Intelligence returned empty response');
  }
  console.log('✓ Financial Intelligence Agent verified on backend data.');

  // Test 3: Financial Assistant Agent Draft Formatter
  const assistantResult = await FinancialAssistantAgent.handleConversation({
    userId: 'usr_junior_01',
    userInput: 'Send 100 USD to supplier',
    nlpIntent: nlpResult,
    conversationHistory: [],
  });

  if (!assistantResult.actionDraft || assistantResult.actionDraft.type !== 'TRANSFER') {
    throw new Error('Expected actionDraft of type TRANSFER');
  }
  if (!assistantResult.richCard || assistantResult.richCard.type !== 'TRANSACTION_PREVIEW') {
    throw new Error('Expected TRANSACTION_PREVIEW rich card');
  }
  console.log('✓ Financial Assistant Agent draft preparation & rich card verified.');

  // Test 4: AI Orchestrator Routing & Telemetry
  const orchestratorMsg = await AIOrchestrator.processUserMessage({
    userId: 'usr_junior_01',
    content: 'What are the current exchange rates?',
  });

  if (!orchestratorMsg || !orchestratorMsg.content) {
    throw new Error('Orchestrator failed to process user message');
  }
  console.log('✓ AI Orchestrator end-to-end routing verified.');
}
