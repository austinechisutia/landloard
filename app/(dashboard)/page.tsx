'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatsCard from '@/components/StatsCard';

interface Stats {
  total_houses: number;
  occupied_houses: number;
  vacant_houses: number;
  total_rent_paid_this_month: number;
  total_pending_rent: number;
  overdue_tenants: {
    id: number;
    tenant_name: string;
    unit_number: string;
    balance: number;
    due_date: string;
  }[];
}

function fmt(n: number) {
  return `KSh ${n.toLocaleString()}`;
}

export default function DashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get<Stats>('/payments/stats')
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading dashboard…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        {error}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your rental properties</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatsCard title="Total Houses"   value={stats.total_houses}   color="blue"   />
        <StatsCard title="Occupied"       value={stats.occupied_houses} color="green"  />
        <StatsCard title="Vacant"         value={stats.vacant_houses}   color="yellow" />
        <StatsCard
          title="Rent Collected This Month"
          value={fmt(stats.total_rent_paid_this_month)}
          color="green"
        />
        <StatsCard
          title="Total Pending Rent"
          value={fmt(stats.total_pending_rent)}
          color="red"
        />
      </div>

      {/* Overdue table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Overdue Payments</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tenants with unpaid rent past due date</p>
          </div>
          {stats.overdue_tenants.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {stats.overdue_tenants.length} overdue
            </span>
          )}
        </div>

        {stats.overdue_tenants.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No overdue payments. All tenants are up to date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Tenant</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Due Date</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.overdue_tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{t.tenant_name}</td>
                    <td className="px-6 py-3.5 text-gray-600">{t.unit_number}</td>
                    <td className="px-6 py-3.5 text-red-600">
                      {new Date(t.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-red-600">
                      {fmt(parseFloat(String(t.balance)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
