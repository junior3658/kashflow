import React from 'react';
import { Users, Shield, Plus, Check, Lock } from 'lucide-react';

export const TeamManagement: React.FC = () => {
  const members = [
    {
      name: 'Junior Ngwej',
      email: 'ngwejjunior3@gmail.com',
      role: 'BUSINESS_OWNER',
      status: 'Active',
      permissions: ['ALL_PERMISSIONS', 'TREASURY_TRANSFER', 'TEAM_MANAGEMENT', 'LEDGER_SETTLEMENT'],
    },
    {
      name: 'Patrick M.',
      email: 'patrick@partner.com',
      role: 'BUSINESS_ADMIN',
      status: 'Active',
      permissions: ['INITIATE_PAYOUTS', 'VIEW_TREASURY', 'EXPORT_REPORTS'],
    },
    {
      name: 'Alain K.',
      email: 'operations@kashflow.io',
      role: 'BUSINESS_EMPLOYEE',
      status: 'Active',
      permissions: ['VIEW_TRANSACTIONS', 'DRAFT_INVOICE'],
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Team Roles & Access Control</h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Role-Based Access Control (RBAC) governing corporate payouts, treasury access, and API credentials.
          </p>
        </div>

        <button
          onClick={() => alert('Invite member modal')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="rounded-3xl bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Corporate Role</th>
                <th className="py-3 px-4">Granted Permissions</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {members.map((m) => (
                <tr key={m.email} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-neutral-900 dark:text-white">{m.name}</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{m.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-full border text-[11px] ${
                      m.role === 'BUSINESS_OWNER'
                        ? 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/70 dark:border-blue-800'
                        : 'text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                    }`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {m.permissions.map((p) => (
                        <span key={p} className="text-[10px] text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800 font-mono font-bold text-[11px] px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>{m.status}</span>
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
