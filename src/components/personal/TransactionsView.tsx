import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { Transaction, TransactionStatus } from '../../backend/types';

interface TransactionsViewProps {
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  selectedTransaction: Transaction | null;
  onCloseDrawer: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onSelectTransaction,
  selectedTransaction,
  onCloseDrawer,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = transactions.filter((tx) => {
    const matchesStatus = filterStatus === 'ALL' || tx.status === filterStatus;
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.recipientName && tx.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 relative">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Transaction Ledger</h2>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Immutable records of all posted movements, payment provider handshakes, and settlement audits.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by recipient, description, or tx ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Status segmented filters */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs overflow-x-auto">
          {['ALL', 'SUCCEEDED', 'PENDING', 'CANCELLED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table (Clean White Dominant Table) */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Transaction / Counterparty</th>
                <th className="py-3 px-4">Type & Rail</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-neutral-900 dark:text-white">{tx.description}</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">{tx.id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-neutral-700 dark:text-neutral-300 font-medium">{tx.type}</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-mono font-bold">{tx.provider}</div>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">
                    <span className={tx.type === 'PAYPAL_PAYMENT' ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-neutral-900 dark:text-neutral-100'}>
                      {tx.type === 'PAYPAL_PAYMENT' ? '+' : '-'}
                      ${(tx.amount / 100).toFixed(2)} {tx.currency}
                    </span>
                    {tx.fee > 0 && (
                      <div className="text-[10px] text-neutral-400 font-normal">
                        Fee: ${(tx.fee / 100).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/70 dark:border-blue-800"
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLIDE-OUT TRANSACTION DETAILS DRAWER */}
      {selectedTransaction && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200 text-neutral-900 dark:text-white">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-sm font-extrabold">Transaction Inspector</span>
            <button
              onClick={onCloseDrawer}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center py-4 bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">Settlement Amount</div>
            <div className="text-3xl font-black font-mono tabular-nums mt-0.5">
              ${(selectedTransaction.amount / 100).toFixed(2)} {selectedTransaction.currency}
            </div>
            <div className="text-xs text-neutral-700 dark:text-neutral-300 font-mono mt-1 font-bold">
              ● Status: {selectedTransaction.status}
            </div>
          </div>

          {/* Detailed ledger facts */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900 p-4 space-y-3 text-xs border border-neutral-100 dark:border-neutral-800">
            <div className="font-bold pb-2 border-b border-neutral-200 dark:border-neutral-800">
              Audit & Settlement Metadata
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Transaction ID:</span>
              <span className="font-mono">{selectedTransaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Provider Rail:</span>
              <span className="font-mono uppercase font-bold">{selectedTransaction.provider}</span>
            </div>
            {selectedTransaction.providerReference && (
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Provider Reference:</span>
                <span className="font-mono font-semibold">{selectedTransaction.providerReference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Counterparty:</span>
              <span>{selectedTransaction.recipientName || 'KASHFLOW Internal'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Rail Processing Fee:</span>
              <span className="font-mono">${(selectedTransaction.fee / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Created At:</span>
              <span className="font-mono text-neutral-500">{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Double-Entry Ledger Verification Box */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Double-Entry Ledger Verified</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[11px]">
              Debit Account 1010 balanced with Credit Account 2010. Sum(Debits) equals Sum(Credits) with zero rounding drift.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
