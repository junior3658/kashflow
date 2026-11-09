/**
 * KASH Financial Assistant Agent
 * Conversational financial guide: explains operations, guides users, drafts transactions,
 * and formats rich cards for interactive confirmation.
 * HARD INVARIANT: Never fabricates transaction statuses; sensitive actions MUST be confirmed through backend.
 */

import { LLMProvider } from './llm-provider';
import { PROMPTS } from './prompts';
import { PermittedAITools } from './tools';
import { AIIntentExtraction, AIMessage, Currency } from '../types';

export class FinancialAssistantAgent {
  static async handleConversation(params: {
    userId: string;
    orgId?: string;
    userInput: string;
    nlpIntent: AIIntentExtraction;
    conversationHistory: AIMessage[];
  }): Promise<{
    message: string;
    actionDraft?: any;
    richCard?: any;
  }> {
    const { userId, userInput, nlpIntent } = params;

    // Handle Transfer Preparation
    if (nlpIntent.intent === 'transfer_request' && nlpIntent.entities.amount) {
      const amount = nlpIntent.entities.amount;
      const currency = nlpIntent.entities.currency || 'USD';
      const recipient = nlpIntent.entities.recipient || 'Supplier / Counterparty';

      // Pick source wallet
      const balances = PermittedAITools.getWalletBalances(userId);
      const matchedWallet =
        balances.personalWallets.find((w) => w.currency === currency) || balances.personalWallets[0];

      // Formulate non-executable draft via backend tool
      const draft = PermittedAITools.createTransferDraft({
        userId,
        amount,
        currency,
        recipientName: recipient,
        sourceWalletId: matchedWallet ? matchedWallet.id : 'wlt_personal_usd',
        provider: currency === 'CDF' ? 'SHWARY' : 'SHWARY',
      });

      const message =
        `I have prepared a draft transfer of ${amount.toFixed(2)} ${currency} to ${recipient}.\n\n` +
        `• Source Wallet: ${matchedWallet ? matchedWallet.name : 'Primary Wallet'}\n` +
        `• Estimated Provider Fee: ${draft.fee.toFixed(2)} ${currency}\n` +
        `• Total Settlement Debit: ${draft.totalDebit.toFixed(2)} ${currency}\n\n` +
        `Please review the transfer details below and click Confirm to execute through the secure banking rail.`;

      return {
        message,
        actionDraft: {
          draftId: draft.draftId,
          type: 'TRANSFER',
          amount: draft.amount,
          currency: draft.currency,
          recipient: draft.recipient,
          destination: 'Mobile Money (Shwary)',
          fee: draft.fee,
          total: draft.totalDebit,
        },
        richCard: {
          type: 'TRANSACTION_PREVIEW',
          data: {
            draftId: draft.draftId,
            amount: draft.amount,
            currency: draft.currency,
            recipient: draft.recipient,
            fee: draft.fee,
            total: draft.totalDebit,
            provider: draft.provider,
          },
        },
      };
    }

    // Handle Currency Conversion Inquiry
    if (nlpIntent.intent === 'currency_conversion') {
      const from: Currency = nlpIntent.entities.currency || 'USD';
      const to: Currency = from === 'USD' ? 'EUR' : 'USD';
      const quote = PermittedAITools.getExchangeRate(from, to);

      const message =
        `Live Mid-Market Exchange Quote:\n` +
        `• Pair: ${from} → ${to}\n` +
        `• Indicative Rate: 1 ${from} = ${quote.rate} ${to}\n` +
        `• Inverse Rate: 1 ${to} = ${quote.inverseRate} ${from}\n` +
        `• Platform Spread: ${quote.spreadPercent}%\n\n` +
        `You can execute instantaneous conversion between your KASHFLOW wallets directly in the Currency Exchange tab.`;

      return {
        message,
        richCard: {
          type: 'EXCHANGE_QUOTE',
          data: {
            from,
            to,
            rate: quote.rate,
            inverseRate: quote.inverseRate,
            spreadPercent: quote.spreadPercent,
          },
        },
      };
    }

    // Standard conversational response
    const contextPrompt = `User question: "${userInput}"\n\nProvide a helpful, precise financial assistant response according to your system prompt.`;
    const response = await LLMProvider.generate(contextPrompt, {
      model: 'gemini-3.8-flash',
      systemInstruction: PROMPTS.FINANCIAL_ASSISTANT,
      temperature: 0.3,
    });

    return {
      message: response.text,
    };
  }
}
