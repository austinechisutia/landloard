'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatsCard from '@/components/StatsCard';

interface Stats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  totalPayments: number;
  totalRentPaid: number;
  thisMonthRent: number;
  totalPendingRent: number;
}

function fmt(n: number | undefined | null) {
  return `KSh ${(n ?? 0).toLocaleString()}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get<Stats>('/dashboard')
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading dashboard…</div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
  );
  if (!stats) return null;

  const now = new Date();
  const monthLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your rental properties</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatsCard title="Total Units"    value={stats.totalUnits}     color="blue"   />
        <StatsCard title="Occupied"       value={stats.occupiedUnits}  color="green"  />
        <StatsCard title="Vacant"         value={stats.vacantUnits}    color="yellow" />
        <StatsCard title="Total Tenants"  value={stats.totalTenants}   color="blue"   />
        <StatsCard title="Total Payments" value={stats.totalPayments}  color="blue"   />

        <StatsCard
          title="Rent Collected"
          value={fmt(stats.totalRentPaid)}
          sub={`${monthLabel}: ${fmt(stats.thisMonthRent)}`}
          color="green"
        />

        <StatsCard
          title="Pending Rent"
          value={fmt(stats.totalPendingRent)}
          sub="Outstanding balance across all pending payments"
          color="red"
        />
      </div>
    </div>
  );
}
