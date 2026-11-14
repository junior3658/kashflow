import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ReceiveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveMoneyModal: React.FC<ReceiveMoneyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'paypal' | 'shwary' | 'qr'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shwaryPhone, setShwaryPhone] = useState('');
  const [shwaryAmount, setShwaryAmount] = useState('100');
  const [shwaryResult, setShwaryResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleShwaryCollection = async () => {
    setIsProcessing(true);
    setShwaryResult(null);
    try {
      const response = await fetch('/api/v1/payments/shwary/encashment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(shwaryAmount),
          currency: 'CDF',
          phone: shwaryPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Shwary collection request failed.');
      setShwaryResult(data);
    } catch (error: any) {
      setShwaryResult({ error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl text-neutral-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-tight">Receive & Deposit Funds</span>
            <span className="text-[10px] font-mono font-bold text-neutral-800 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              Provider integrations
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl my-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('paypal')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'paypal' ? 'bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
            }`}
          >
            PayPal Sandbox
          </button>
          <button
            onClick={() => setActiveTab('shwary')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'shwary' ? 'bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
            }`}
          >
            Shwary Mobile Money
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'qr' ? 'bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
            }`}
          >
            Payment Link / QR · Soon
          </button>
        </div>

        {/* PAYPAL CHECKOUT STATUS */}
        {activeTab === 'paypal' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold mb-1">PayPal checkout is currently disabled</div>
              KASHFLOW does not yet connect to PayPal OAuth, Orders, Capture, signed webhooks or reconciliation. Adding Client ID and Secret alone will not enable payments.
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              No PayPal order has been created and no wallet has been credited. This section will be enabled only after the real Sandbox flow and server-side verification have been tested.
            </p>
          </div>
        )}

        {/* SHWARY COLLECTION TAB */}
        {activeTab === 'shwary' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
              <span className="font-bold text-neutral-900 dark:text-white block mb-1">Shwary Mobile Money Collection</span>
              Initiate a documented DRC collection request. The customer must approve the prompt on their phone.
              A request accepted by the API is not yet a confirmed payment.
            </div>

            {!shwaryResult?.requestId && (
              <>
                <div>
                  <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Customer phone number</label>
                  <input
                    type="tel"
                    value={shwaryPhone}
                    onChange={(event) => setShwaryPhone(event.target.value)}
                    placeholder="+243XXXXXXXXX"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Amount (whole CDF)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={shwaryAmount}
                    onChange={(event) => setShwaryAmount(event.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white font-mono"
                  />
                </div>
                <button
                  onClick={handleShwaryCollection}
                  disabled={isProcessing || !shwaryPhone.trim() || Number(shwaryAmount) <= 0 || !Number.isInteger(Number(shwaryAmount))}
                  className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Sending request to Shwary...' : 'Initiate Mobile Money Collection'}
                </button>
              </>
            )}

            {shwaryResult?.requestId && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 space-y-2">
                <div className="font-bold text-amber-900 dark:text-amber-200">Request accepted — confirmation pending</div>
                <div className="text-amber-800 dark:text-amber-300">KASHFLOW reference: <span className="font-mono">{shwaryResult.requestId}</span></div>
                <p className="text-amber-800 dark:text-amber-300">{shwaryResult.message}</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">KASHFLOW has not credited your wallet. Wait for verified provider confirmation.</p>
                <button
                  onClick={() => setShwaryResult(null)}
                  className="w-full py-2 rounded-lg border border-amber-400 dark:border-amber-700 font-semibold"
                >
                  Start another request
                </button>
              </div>
            )}

            {shwaryResult?.error && (
              <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-red-700 dark:text-red-300">
                {shwaryResult.error}
              </div>
            )}
          </div>
        )}

        {/* PAYMENT LINK AND QR STATUS */}
        {activeTab === 'qr' && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
            <div className="font-bold text-sm">Payment links and QR codes are not enabled</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              The hosted payment page and verified checkout flow have not been implemented. KASHFLOW will not generate a placeholder URL that could be mistaken for a working payment link.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
