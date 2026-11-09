import React from 'react';
import { Wallet, ShieldCheck, ArrowLeftRight, Send, Download, Layers, Info } from 'lucide-react';
import { Wallet as WalletType, Currency } from '../../backend/types';

interface WalletsViewProps {
  wallets: WalletType[];
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onOpenExchange: () => void;
}

export const WalletsView: React.FC<WalletsViewProps> = ({
  wallets,
  onOpenSend,
  onOpenReceive,
  onOpenExchange,
}) => {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Wallets & Balances</h2>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Strict separation of internal accounting ledger balances, external provider balances, and simulated assets.
        </p>
      </div>

      {/* Audit Invariant Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-neutral-900 dark:text-white">Financial Balance Governance</span>
          <p className="leading-relaxed">
            In KASHFLOW, logical wallets reflect settled double-entry ledger positions. External provider balances
            are confirmed directly via API handshakes. In-flight transactions are held in pending debits until provider settlement.
          </p>
        </div>
      </div>

      {/* Grid of Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => {
          const available = (wallet.internalAccountingBalance - wallet.pendingDebits) / 100;
          const verified = wallet.externalProviderBalance / 100;
          const pending = wallet.pendingDebits / 100;

          return (
            <div
              key={wallet.id}
              className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {wallet.currency} Wallet
                  </span>
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5">{wallet.name}</h3>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
                  {wallet.type}
                </span>
              </div>

              {/* Balance display */}
              <div className="pt-2">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Available Internal Ledger</div>
                <div className="text-3xl font-black text-neutral-950 dark:text-white font-mono tabular-nums tracking-tight mt-0.5">
                  {wallet.currency === 'USD' ? '$' : wallet.currency === 'EUR' ? '€' : ''}
                  {available.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <span className="text-xs font-sans font-normal text-neutral-500 dark:text-neutral-400 ml-1.5">{wallet.currency}</span>
                </div>
              </div>

              {/* Balance Breakdown Matrix */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">External Rail Verified:</span>
                  <span className="font-mono text-neutral-900 dark:text-white font-semibold tabular-nums">
                    {verified.toLocaleString('en-US', { minimumFractionDigits: 2 })} {wallet.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Pending Reservations:</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300 tabular-nums">
                    {pending.toLocaleString('en-US', { minimumFractionDigits: 2 })} {wallet.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Ledger Account:</span>
                  <span className="font-mono text-neutral-500 dark:text-neutral-400">Code 10{wallet.currency === 'USD' ? '10' : wallet.currency === 'EUR' ? '20' : '30'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onOpenSend}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Send
                </button>
                <button
                  onClick={onOpenExchange}
                  className="flex-1 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-semibold border border-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                >
                  Convert
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
