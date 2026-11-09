import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ArrowLeftRight,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { AIMessage } from '../../backend/types';

interface KashAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onActionConfirmed?: () => void;
  embedded?: boolean;
}

export const KashAIChat: React.FC<KashAIChatProps> = ({
  isOpen,
  onClose,
  onActionConfirmed,
  embedded = false,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/v1/ai/history');
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen || embedded) {
      fetchHistory();
    }
  }, [isOpen, embedded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text || isLoading) return;

    // Add optimistic user message
    const tempUserMsg: AIMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get AI response');

      setMessages((prev) => [...prev, data.message]);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        content: `Error contacting KASH AI: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDraft = async (draftId: string) => {
    setConfirmingDraftId(draftId);
    try {
      const res = await fetch(`/api/v1/transfers/${draftId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Confirmation failed');

      const confirmSuccessMsg: AIMessage = {
        id: `ack_${Date.now()}`,
        sender: 'assistant',
        content: `Transfer ${draftId} confirmed and settled. Ledger entries have been posted atomically.`,
        timestamp: new Date().toISOString(),
        metadata: {
          richCard: {
            type: 'STATUS_CARD',
            data: {
              status: 'SUCCEEDED',
              txId: draftId,
              message: 'Dispatched to verified rail.',
            },
          },
        },
      };
      setMessages((prev) => [...prev, confirmSuccessMsg]);
      onActionConfirmed?.();
    } catch (err: any) {
      alert('Confirmation failed: ' + err.message);
    } finally {
      setConfirmingDraftId(null);
    }
  };

  const suggestedQuestions = [
    'Send 100 USD to my supplier',
    'What is my verified balance summary?',
    'What are the USD to CDF exchange rates?',
    'Analyze my cash flow this week',
  ];

  if (!isOpen && !embedded) return null;

  const containerClasses = embedded
    ? 'w-full h-[650px] rounded-3xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col overflow-hidden text-neutral-900 dark:text-white'
    : 'fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 text-neutral-900 dark:text-white';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-extrabold flex items-center gap-1.5">
              KASH AI
              <span className="text-[10px] font-mono font-bold text-neutral-800 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-800 px-1.5 py-0.2 rounded border border-neutral-200 dark:border-neutral-700">
                MULTI-AGENT COPILOT
              </span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Orchestrator · NLP · Financial Intelligence
            </div>
          </div>
        </div>

        {!embedded && (
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggested chips strip */}
      <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-neutral-500 dark:text-neutral-400 shrink-0 font-medium">Try:</span>
        {suggestedQuestions.map((q) => (
          <button
            key={q}
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white whitespace-nowrap border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer shrink-0 shadow-2xs font-medium"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                  isUser
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-br-none shadow-xs font-medium'
                    : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 rounded-bl-none shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* RICH CARD 1: TRANSACTION PREVIEW (Monochrome Black & White) */}
                {msg.metadata?.richCard?.type === 'TRANSACTION_PREVIEW' && (
                  <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider pb-1 border-b border-neutral-100 dark:border-neutral-800">
                      <span className="text-neutral-900 dark:text-white">Transaction Draft Preview</span>
                      <span className="text-neutral-600 dark:text-neutral-400 font-mono">Pending Confirmation</span>
                    </div>

                    <div className="space-y-1 text-neutral-700 dark:text-neutral-300">
                      <div className="flex justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Recipient:</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{msg.metadata.richCard.data.recipient}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Amount:</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          {msg.metadata.richCard.data.amount} {msg.metadata.richCard.data.currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Provider Fee:</span>
                        <span className="font-mono">
                          {msg.metadata.richCard.data.fee} {msg.metadata.richCard.data.currency}
                        </span>
                      </div>
                      <div className="flex justify-between font-black text-neutral-950 dark:text-white pt-1 border-t border-neutral-100 dark:border-neutral-800">
                        <span>Total Settlement:</span>
                        <span className="font-mono">
                          {msg.metadata.richCard.data.total} {msg.metadata.richCard.data.currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmDraft(msg.metadata!.richCard!.data.draftId)}
                        disabled={confirmingDraftId === msg.metadata.richCard.data.draftId}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {confirmingDraftId === msg.metadata.richCard.data.draftId
                            ? 'Posting to Ledger...'
                            : 'Confirm & Execute'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* RICH CARD 2: EXCHANGE QUOTE */}
                {msg.metadata?.richCard?.type === 'EXCHANGE_QUOTE' && (
                  <div className="mt-3 p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] space-y-1 font-mono shadow-xs">
                    <div className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                      Verified Currency Quote
                    </div>
                    <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                      <span>Rate:</span>
                      <span className="font-bold text-neutral-950 dark:text-white">1 {msg.metadata.richCard.data.from} = {msg.metadata.richCard.data.rate} {msg.metadata.richCard.data.to}</span>
                    </div>
                    <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                      <span>Platform Spread:</span>
                      <span>{msg.metadata.richCard.data.spreadPercent}%</span>
                    </div>
                  </div>
                )}

                {/* RICH CARD 3: STATUS CARD */}
                {msg.metadata?.richCard?.type === 'STATUS_CARD' && (
                  <div className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{msg.metadata.richCard.data.message}</span>
                  </div>
                )}
              </div>

              {/* Agent Metadata Badge */}
              {!isUser && msg.metadata?.agentUsed && (
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono px-1">
                  <span>Agent: {msg.metadata.agentUsed}</span>
                  <span>·</span>
                  <span>Model: {msg.metadata.model || 'gemini-3.8-flash'}</span>
                  {msg.metadata.tokensUsed && <span>· {msg.metadata.tokensUsed} tokens</span>}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs py-2">
            <RefreshCw className="w-4 h-4 animate-spin text-neutral-900 dark:text-white" />
            <span>KASH AI is analyzing financial rails...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about payments, transfers, conversions, or cash flow..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
