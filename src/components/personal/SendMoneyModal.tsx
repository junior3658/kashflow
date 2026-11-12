import React, { useState } from 'react';
import { X, Send, ShieldCheck, ArrowRight, UserCheck, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Currency, Wallet } from '../../backend/types';

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onTransferSuccess: () => void;
}

export const SendMoneyModal: React.FC<SendMoneyModalProps> = ({
  isOpen,
  onClose,
  wallets,
  onTransferSuccess,
}) => {
  const [mode, setMode] = useState<'numpad' | 'form'>('numpad');
  const [amountStr, setAmountStr] = useState('250.00');
  const [recipient, setRecipient] = useState('Owen F.');
  const [recipientPhone, setRecipientPhone] = useState('+243 82 444 8888');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [selectedProvider, setSelectedProvider] = useState<'SHWARY' | 'PAYPAL' | 'INTERNAL'>('INTERNAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'input' | 'preview' | 'success'>('input');
  const [draftTx, setDraftTx] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentWallet = wallets.find((w) => w.currency === currency) || wallets[0];
  const availableBalance = currentWallet ? currentWallet.internalAccountingBalance / 100 : 0;
  const numAmount = parseFloat(amountStr) || 0;

  const handleNumpadKey = (key: string) => {
    if (key === 'BACK') {
      setAmountStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (key === '.') {
      if (!amountStr.includes('.')) setAmountStr((prev) => prev + '.');
    } else {
      setAmountStr((prev) => (prev === '0' || prev === '250.00' ? key : prev + key));
    }
  };

  const handlePrepareTransfer = async () => {
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }
    if (numAmount > availableBalance) {
      setErrorMsg(`Amount exceeds available balance (${availableBalance.toFixed(2)} ${currency}).`);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/transfers/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          currency,
          recipientName: recipient,
          recipientAccount: recipientPhone,
          sourceWalletId: currentWallet.id,
          provider: selectedProvider,
          idempotencyKey: `client_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to prepare draft');

      setDraftTx(data.draft);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmExecution = async () => {
    if (!draftTx) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/transfers/${draftTx.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');

      setStep('success');
      onTransferSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl text-neutral-900 dark:text-white">
        
        {/* Header bar */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-tight">Send Money</span>
            <span className="text-[10px] font-mono font-bold text-neutral-800 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              {selectedProvider}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="my-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: INPUT SCREEN (Interactive Numpad) */}
        {step === 'input' && (
          <div className="space-y-4 pt-2">
            {/* Recipient bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                  alt={recipient}
                  className="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                />
                <div>
                  <div className="text-xs font-bold">{recipient}</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{recipientPhone}</div>
                </div>
              </div>

              {/* Mode switch */}
              <button
                onClick={() => setMode(mode === 'numpad' ? 'form' : 'numpad')}
                className="text-[11px] text-neutral-900 dark:text-white font-bold hover:underline cursor-pointer"
              >
                {mode === 'numpad' ? 'Form Mode' : 'Numpad'}
              </button>
            </div>

            {/* Currency selection */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['USD', 'EUR', 'CDF'] as Currency[]).map((cur) => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`py-1.5 rounded-lg border font-mono font-bold transition-colors cursor-pointer ${
                    currency === cur
                      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:text-neutral-950 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>

            {/* Big Amount Display */}
            <div className="text-center py-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="text-4xl font-black font-mono tabular-nums tracking-tight">
                {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''}
                {amountStr}
                <span className="text-sm font-sans font-normal text-neutral-500 dark:text-neutral-400 ml-1">{currency}</span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Available: <span className="font-mono text-neutral-900 dark:text-white font-bold">{availableBalance.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* Numpad Grid */}
            {mode === 'numpad' ? (
              <div className="grid grid-cols-3 gap-2 font-mono text-lg font-bold">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACK'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNumpadKey(key)}
                    className="h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center border border-neutral-200 dark:border-neutral-800 cursor-pointer text-neutral-900 dark:text-white"
                  >
                    {key === 'BACK' ? '⌫' : key}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Recipient Name</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Mobile Money Number / Bank Account</label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* External rails stay disabled until their payout APIs are verified. */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-neutral-700 dark:text-neutral-300">Transfer route</div>
              <button
                onClick={() => setSelectedProvider('INTERNAL')}
                className={`w-full py-2 rounded-xl border text-center ${selectedProvider === 'INTERNAL' ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950' : 'bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-900 dark:border-neutral-800'}`}
              >
                Internal demo transfer
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button disabled title="B2C payout endpoint specification not supplied"
                  className="py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-400 cursor-not-allowed">
                  Shwary payout — pending
                </button>
                <button disabled title="Real PayPal integration is not configured"
                  className="py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-400 cursor-not-allowed">
                  PayPal — pending
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Shwary collection is available in Receive & Deposit. B2C payouts remain disabled until the official payout endpoint is documented.
              </p>
            </div>

            <button
              onClick={handlePrepareTransfer}
              disabled={isSubmitting || numAmount <= 0}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Review Transfer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PREVIEW & CONFIRMATION */}
        {step === 'preview' && draftTx && (
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">Transaction Summary Preview</div>
              <div className="text-3xl font-black font-mono mt-1">
                {(draftTx.amount / 100).toFixed(2)} {draftTx.currency}
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Recipient:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{draftTx.recipientName}</span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Destination Rail:</span>
                <span className="uppercase font-mono font-semibold text-neutral-900 dark:text-white">{draftTx.provider}</span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Transfer Amount:</span>
                <span className="font-mono text-neutral-900 dark:text-white">{(draftTx.amount / 100).toFixed(2)} {draftTx.currency}</span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Calculated Rail Fee:</span>
                <span className="font-mono text-neutral-900 dark:text-white">{(draftTx.fee / 100).toFixed(2)} {draftTx.currency}</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between font-extrabold text-neutral-900 dark:text-white">
                <span>Total Settlement Debit:</span>
                <span className="font-mono">
                  {((draftTx.amount + draftTx.fee) / 100).toFixed(2)} {draftTx.currency}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-[11px] text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-neutral-900 dark:text-white mt-0.5" />
              <span>
                This is an internal demonstration transfer only. It updates local demo data and does not dispatch money through Shwary, PayPal, a bank or a mobile-money operator.
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleConfirmExecution}
                disabled={isSubmitting}
                className="flex-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Posting Ledger...' : 'Confirm & Settle'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-900 dark:text-white">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">Demo Transfer Recorded</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                This local demonstration did not move real funds. No external provider was called.
              </p>
            </div>

            <div className="rounded-xl bg-neutral-100 dark:bg-neutral-900 p-3 text-xs font-mono text-neutral-700 dark:text-neutral-300">
              Transaction ID: {draftTx?.id}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
