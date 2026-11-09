import React, { useState } from 'react';
import { PieChart, TrendingUp, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'custom'>('month');

  const categories = [
    { name: 'Housing & Facilities', percent: 35, amount: 21000, color: '#2563EB' },
    { name: 'Groceries & Provisions', percent: 15, amount: 9000, color: '#171717' },
    { name: 'Travel & Mobility', percent: 10, amount: 6000, color: '#525252' },
    { name: 'Savings & Reserves', percent: 10, amount: 6000, color: '#3B82F6' },
    { name: 'Software & Cloud Servers', percent: 8, amount: 4800, color: '#737373' },
    { name: 'Operating Logistics', percent: 22, amount: 13200, color: '#A3A3A3' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Spending Analytics</h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Categorized telemetry derived strictly from verified double-entry ledger postings.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          {(['week', 'month', 'year', 'custom'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                timeframe === t ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart Showcase (Clean White Minimalist Finish with Electric Blue Accent) (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
            Aggregated Spending Overview
          </span>

          {/* SVG Donut with blue and monochrome contrast */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#E5E5E5" strokeWidth="12" fill="none" className="dark:stroke-neutral-800" />
              {/* Electric blue slice for largest spend category */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#2563EB"
                strokeWidth="12"
                strokeDasharray="88 251"
                strokeDashoffset="0"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#171717"
                strokeWidth="12"
                strokeDasharray="38 251"
                strokeDashoffset="-88"
                fill="none"
                className="dark:stroke-neutral-200"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#525252"
                strokeWidth="12"
                strokeDasharray="25 251"
                strokeDashoffset="-126"
                fill="none"
                className="dark:stroke-neutral-400"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#3B82F6"
                strokeWidth="12"
                strokeDasharray="25 251"
                strokeDashoffset="-151"
                fill="none"
              />
            </svg>

            {/* Inner Center Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-neutral-950 dark:text-white font-mono">$60,000</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Total Tracked</span>
            </div>
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
            Spend velocity is <span className="font-bold text-blue-600 dark:text-blue-400">8.4% lower</span> than preceding fiscal period.
          </div>
        </div>

        {/* Categories Table (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Expense Distribution</h3>

          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-neutral-500 dark:text-neutral-400">{cat.percent}%</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                      ${cat.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
