/**
 * KASH Financial Intelligence Agent
 * Purpose: Analyze verified financial data from backend ledger and provider accounts.
 * Capabilities: Cash-flow velocity, spending analysis, anomaly detection, fee leakage comparison.
 * HARD INVARIANT: Must ONLY analyze verified backend data, never invent balances or statuses.
 */

import { LLMProvider } from './llm-provider';
import { PROMPTS } from './prompts';
import { PermittedAITools } from './tools';

export class FinancialIntelligenceAgent {
  static async analyze(userId: string, orgId: string | undefined, query: string): Promise<string> {
    // 1. Fetch strictly verified backend telemetry
    const balances = PermittedAITools.getWalletBalances(userId, orgId);
    const recentTx = PermittedAITools.getTransactions(userId, 15);

    // Compute deterministic financial metrics
    let totalSpentUsd = 0;
    let totalReceivedUsd = 0;
    for (const tx of recentTx) {
      if (tx.status === 'SUCCEEDED') {
        if (tx.type === 'TRANSFER' || tx.type === 'PAYPAL_PAYMENT') {
          if (tx.recipientName && tx.recipientName !== 'Junior Ngwej') {
            totalSpentUsd += tx.amount;
          } else {
            totalReceivedUsd += tx.amount;
          }
        }
      }
    }

    const contextPayload = {
      userVerifiedWallets: balances.personalWallets,
      recentTransactionsCount: recentTx.length,
      recentTransactionsSample: recentTx.slice(0, 5),
      calculatedMetrics: {
        totalSpentLastPeriodUsd: totalSpentUsd,
        totalReceivedLastPeriodUsd: totalReceivedUsd,
        netCashFlowUsd: totalReceivedUsd - totalSpentUsd,
      },
    };

    const prompt = `Verified Backend Data Context:
${JSON.stringify(contextPayload, null, 2)}

User Question: "${query}"

Provide a concise, professional financial intelligence assessment based strictly on the verified data above.`;

    const response = await LLMProvider.generate(prompt, {
      model: 'gemini-3.8-flash',
      systemInstruction: PROMPTS.FINANCIAL_INTELLIGENCE,
      temperature: 0.2,
    });

    return response.text;
  }
}
