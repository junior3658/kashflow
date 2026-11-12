import React, { useState } from 'react';
import { X, Download, ShieldCheck, CheckCircle2, QrCode, Copy, ExternalLink, Smartphone } from 'lucide-react';
import { Currency } from '../../backend/types';

interface ReceiveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentCaptured: () => void;
}

export const ReceiveMoneyModal: React.FC<ReceiveMoneyModalProps> = ({
  isOpen,
  onClose,
  onPaymentCaptured,
}) => {
  const [activeTab, setActiveTab] = useState<'paypal' | 'shwary' | 'qr'>('paypal');
  const [amount, setAmount] = useState('100.00');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [orderCreated, setOrderCreated] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successPayload, setSuccessPayload] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [shwaryPhone, setShwaryPhone] = useState('');
  const [shwaryAmount, setShwaryAmount] = useState('100');
  const [shwaryResult, setShwaryResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleCreatePayPalOrder = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/v1/payments/paypal/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount) || 100,
          currency,
          description: `Customer deposit to KASHFLOW (${currency})`,
        }),
      });

      const data = await res.json();
      setOrderCreated(data);
    } catch (err: any) {
      alert('Failed to initialize PayPal Order: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapturePayPalOrder = async () => {
    if (!orderCreated) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/v1/payments/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderCreated.orderId }),
      });

      const data = await res.json();
      setSuccessPayload(data);
      onPaymentCaptured();
    } catch (err: any) {
      alert('Capture failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

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

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`https://pay.kashflow.io/u/junior?amount=${amount}&currency=${currency}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            onClick={() => { setActiveTab('paypal'); setOrderCreated(null); setSuccessPayload(null); }}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'paypal' ? 'bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
            }`}
          >
            PayPal Sandbox
          </button>
          <button
            onClick={() => { setActiveTab('shwary'); setOrderCreated(null); setSuccessPayload(null); }}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'shwary' ? 'bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
            }`}
          >
            Shwary USSD
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'qr' ? 'bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
            }`}
          >
            Payment Link / QR
          </button>
        </div>

        {/* PAYPAL SANDBOX INTERACTIVE TAB */}
        {activeTab === 'paypal' && (
          <div className="space-y-4">
            {!successPayload ? (
              <>
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
                  <div className="font-bold text-neutral-900 dark:text-white mb-0.5">PayPal integration preview</div>
                  The current PayPal adapter is a local mock. Real Sandbox OAuth, Orders, Capture and webhook verification are not connected yet.
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white font-mono"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {!orderCreated ? (
                  <button
                    onClick={handleCreatePayPalOrder}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isProcessing ? 'Generating Sandbox Order...' : 'Create demo PayPal order'}</span>
                  </button>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono space-y-1">
                      <div className="text-neutral-500 dark:text-neutral-400">Order ID: <span className="text-neutral-900 dark:text-white font-bold">{orderCreated.orderId}</span></div>
                      <div className="text-neutral-500 dark:text-neutral-400">Status: <span className="text-neutral-900 dark:text-white font-semibold">{orderCreated.status}</span></div>
                    </div>

                    <button
                      onClick={handleCapturePayPalOrder}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isProcessing ? 'Processing demo capture...' : 'Run demo capture'}</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-900 dark:text-white">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold">Demo PayPal Flow Completed</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Capture ID: <span className="font-mono text-neutral-900 dark:text-white font-bold">{successPayload.capture?.captureId}</span>
                </p>
                <div className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded-xl font-mono">
                  Demo ledger amount: +${(successPayload.capture?.amount / 100).toFixed(2)} USD
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
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

        {/* PAYMENT LINK & QR TAB */}
        {activeTab === 'qr' && (
          <div className="text-center space-y-4 pt-2">
            <div className="w-36 h-36 mx-auto bg-neutral-100 dark:bg-white rounded-2xl p-2.5 flex items-center justify-center border border-neutral-200 shadow-sm">
              <QrCode className="w-full h-full text-neutral-950" />
            </div>

            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              Share your direct payment link to receive funds into your primary USD wallet.
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Payment Link'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
