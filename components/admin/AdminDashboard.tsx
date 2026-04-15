'use client';

import StatsCard from '@/components/StatsCard';

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN';
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface AdminStats {
  totalUsers: number;
  loggedInToday: number;
  activeThisWeek: number;
  users: UserRow[];
}

function fmt(date: Date | string | null) {
  if (!date) return 'Never';
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminDashboard({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#11430F]">Admin Dashboard</h1>
        <p className="mt-0.5 text-sm text-[#11430F]/60">User activity and system overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatsCard title="Total Users"       value={stats.totalUsers}     color="blue"   />
        <StatsCard title="Logged In (24 h)"  value={stats.loggedInToday}  color="green"  />
        <StatsCard title="Active (7 days)"   value={stats.activeThisWeek} color="yellow" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#11430F] mb-3">All Users</h2>
        <div className="rounded-xl border border-[#11430F]/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#11430F]/5 text-[#11430F]/70 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#11430F]/8">
                {stats.users.map(u => (
                  <tr key={u.id} className="hover:bg-[#11430F]/3 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#11430F]">
                      {u.name ?? <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={
                          u.role === 'ADMIN'
                            ? { backgroundColor: 'rgba(17,67,15,0.12)', color: '#11430F' }
                            : { backgroundColor: 'rgba(100,100,100,0.1)', color: '#555' }
                        }
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(u.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">No users found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
