import React from 'react';

export const AnalyticsView: React.FC = () => (
  <div className="space-y-6 pb-12">
    <div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
        Spending Analytics
      </h2>
      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
        Financial analytics will be enabled after transaction history is persisted and provider statements can be reconciled.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Internal ledger history
        </div>
        <div className="text-lg font-bold text-neutral-900 dark:text-white">Not available</div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          The current financial domain is in-memory and does not yet provide durable, period-based analytics.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Provider reconciliation
        </div>
        <div className="text-lg font-bold text-neutral-900 dark:text-white">Not connected</div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Shwary callback verification, PayPal webhooks and statement reconciliation are not implemented. No provider-derived spending figures are reported.
        </p>
      </div>
    </div>
  </div>
);
