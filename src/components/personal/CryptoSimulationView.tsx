import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CryptoAsset, CryptoPosition } from '../../backend/types';

export const CryptoSimulationView: React.FC = () => {
  const [markets, setMarkets] = useState<CryptoAsset[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ETH' | 'USDT'>('BTC');
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeAmountUsd, setTradeAmountUsd] = useState('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/v1/crypto/markets'),
        fetch('/api/v1/crypto/portfolio'),
      ]);
      const mData = await mRes.json();
      const pData = await pRes.json();
      setMarkets(mData.markets);
      setPortfolio(pData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecuteTrade = async () => {
    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/crypto/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedAsset,
          side: tradeSide,
          amountUsd: parseFloat(tradeAmountUsd) || 500,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trade failed');

      setSuccessMsg(`Simulated ${tradeSide} of $${tradeAmountUsd} ${selectedAsset} completed!`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Crypto Simulation Desk</h2>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
            SIMULATION ONLY
          </span>
        </div>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Virtual digital assets sandbox for liquidity modeling and portfolio testing. Real custody is strictly isolated.
        </p>
      </div>

      {/* Mandatory Regulatory / Simulation Notice Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-neutral-950 dark:text-white">Strict Financial Segregation:</strong> Cryptocurrency assets shown on this desk
          are purely simulated for market risk analysis. KASHFLOW does not provide unlicensed retail crypto custody.
          Real fiat money from your bank or mobile money wallets is never converted into unverified crypto tokens.
        </p>
      </div>

      {/* Portfolio Overview Strip */}
      {portfolio && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-semibold">Simulated Portfolio Value</span>
            <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono mt-1">
              ${portfolio.totalPortfolioValueUsd?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-semibold">Total Unrealized PnL</span>
            <div className="text-2xl font-black font-mono mt-1 text-neutral-950 dark:text-white">
              {portfolio.totalPnlUsd >= 0 ? '+' : ''}${portfolio.totalPnlUsd?.toFixed(2)}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-semibold">Return on Simulation</span>
            <div className="text-2xl font-black font-mono mt-1 text-neutral-950 dark:text-white">
              +{portfolio.overallPnlPercent}%
            </div>
          </div>
        </div>
      )}

      {/* Live Market Cards & Simulated Trade Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Market Rates List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Live Benchmark Feeds</h3>
          <div className="space-y-3">
            {markets.map((m) => (
              <div
                key={m.symbol}
                onClick={() => setSelectedAsset(m.symbol)}
                className={`p-4 rounded-2xl bg-white dark:bg-neutral-900 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                  selectedAsset === m.symbol
                    ? 'border-blue-600 ring-2 ring-blue-500/20 dark:border-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{m.name}</span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{m.symbol}</span>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    24h High: ${m.high24h.toLocaleString()} · Low: ${m.low24h.toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-neutral-950 dark:text-white font-mono tabular-nums">
                    ${m.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-mono font-bold flex items-center justify-end gap-0.5 text-blue-600 dark:text-blue-400">
                    {m.change24h >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span>{m.change24h}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Execution Terminal (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Simulated Order Terminal</h3>

          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl text-xs font-bold">
            <button
              onClick={() => setTradeSide('BUY')}
              className={`py-2 rounded-lg transition-colors cursor-pointer ${
                tradeSide === 'BUY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              Simulate Buy
            </button>
            <button
              onClick={() => setTradeSide('SELL')}
              className={`py-2 rounded-lg transition-colors cursor-pointer ${
                tradeSide === 'SELL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              Simulate Sell
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Asset</label>
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-black font-mono">
                {selectedAsset}
              </div>
            </div>

            <div>
              <label className="text-neutral-600 dark:text-neutral-400 block mb-1 font-medium">Notional Order Amount (USD)</label>
              <input
                type="number"
                value={tradeAmountUsd}
                onChange={(e) => setTradeAmountUsd(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleExecuteTrade}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Executing Simulation...' : `Submit Simulated ${tradeSide}`}
          </button>

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
