import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';
import { Currency, ExchangeQuote, Wallet } from '../../backend/types';

interface CurrencyExchangeViewProps {
  wallets: Wallet[];
}

export const CurrencyExchangeView: React.FC<CurrencyExchangeViewProps> = ({
  wallets,
}) => {
  const [fromCurrency, setFromCurrency] = useState<Currency>('USD');
  const [toCurrency, setToCurrency] = useState<Currency>('EUR');
  const [amount, setAmount] = useState('200.00');
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchQuote = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;
    setIsQuoting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/exchange/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromCurrency, to: toCurrency, amount: numAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch quote');
      setQuote(data.quote);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsQuoting(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [fromCurrency, toCurrency, amount]);

  const handleInvert = () => {
    const prevFrom = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(prevFrom);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Currency Exchange Desk</h2>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Indicative prototype quotes using local reference rates. No currency conversion or wallet settlement is currently enabled.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Exchange Card (White Dominant with Crisp Hairline Borders) */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center relative">
          {/* Source Currency */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">You Sell</span>
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-black text-neutral-900 dark:text-white font-mono focus:outline-none"
              />
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as Currency)}
                className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold text-sm px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CDF">CDF</option>
              </select>
            </div>
          </div>

          {/* Invert Button in between */}
          <button
            onClick={handleInvert}
            className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 z-10 w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 text-white flex items-center justify-center shadow-md mx-auto cursor-pointer transition-transform hover:scale-105"
            title="Invert currencies"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* Target Currency */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">You Receive (Estimated)</span>
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono">
                {quote ? (quote.toAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '...'}
              </div>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value as Currency)}
                className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold text-sm px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </div>
          </div>
        </div>

        {/* Indicative Quote Breakdown */}
        {quote && (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Indicative Exchange Rate:</span>
              <span className="text-neutral-950 dark:text-white font-mono font-bold">
                1 {fromCurrency} = {quote.rate} {toCurrency}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Conversion Fee (0.25%):</span>
              <span className="text-neutral-950 dark:text-white font-mono">
                {(quote.fee / 100).toFixed(2)} {fromCurrency}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Preview expiry (not a guarantee):</span>
              <span className="text-neutral-900 dark:text-white font-mono font-semibold">
                {new Date(quote.expiresAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        <div className="w-full py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold text-sm text-center border border-neutral-200 dark:border-neutral-700">
          Exchange settlement disabled pending persistent atomic ledger implementation
        </div>

        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          This quote is informational only. It does not reserve funds, create a transaction or credit a wallet.
        </p>
      </div>
    </div>
  );
};
