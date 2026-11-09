import React from 'react';
import { ShieldCheck, Download, CheckCircle2, RefreshCw } from 'lucide-react';

export const ReconciliationView: React.FC = () => {
  const records = [
    {
      rail: 'PayPal Sandbox Rail',
      internalLedgerAccount: '1050 PayPal Transit',
      internalBalance: '$12,840.50',
      providerReportedBalance: '$12,840.50',
      variance: '$0.00',
      status: 'RECONCILED',
      lastSynced: '2 mins ago',
    },
    {
      rail: 'Shwary Mobile Money Rails',
      internalLedgerAccount: '1060 Shwary Transit',
      internalBalance: '$34,500.00',
      providerReportedBalance: '$34,500.00',
      variance: '$0.00',
      status: 'RECONCILED',
      lastSynced: 'Just now',
    },
    {
      rail: 'Commercial Treasury',
      internalLedgerAccount: '1010 Available Cash USD',
      internalBalance: '$84,250.00',
      providerReportedBalance: '$84,250.00',
      variance: '$0.00',
      status: 'RECONCILED',
      lastSynced: '5 mins ago',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Ledger & Rail Reconciliation</h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Automated double-entry reconciliation comparing KASHFLOW posted balances with external payment provider statements.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting Reconciliation CSV...')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      <div className="rounded-3xl bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Provider Rail</th>
                <th className="py-3 px-4">Ledger Account</th>
                <th className="py-3 px-4">Internal Balance</th>
                <th className="py-3 px-4">Provider Statement</th>
                <th className="py-3 px-4">Variance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {records.map((r) => (
                <tr key={r.rail} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">{r.rail}</td>
                  <td className="py-3.5 px-4 font-mono text-neutral-500 dark:text-neutral-400 text-[11px]">{r.internalLedgerAccount}</td>
                  <td className="py-3.5 px-4 font-mono text-neutral-900 dark:text-white font-bold tabular-nums">{r.internalBalance}</td>
                  <td className="py-3.5 px-4 font-mono text-neutral-900 dark:text-white font-bold tabular-nums">{r.providerReportedBalance}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{r.variance}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{r.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
