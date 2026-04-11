'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/api';

const navItems = [
  { href: '/dashboard',          label: 'Dashboard', icon: '▦' },
  { href: '/dashboard/houses',   label: 'Houses',    icon: '⌂' },
  { href: '/dashboard/tenants',  label: 'Tenants',   icon: '👥' },
  { href: '/dashboard/payments', label: 'Payments',  icon: '💳' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-indigo-900 text-white flex flex-col min-h-screen shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-indigo-700">
        <h1 className="text-xl font-bold tracking-tight">Landloard</h1>
        <p className="text-indigo-300 text-xs mt-0.5">Rental Management</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-indigo-700 text-white font-medium'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-indigo-700">
        <button
          onClick={() => auth.logout()}
          className="w-full px-4 py-2.5 text-sm text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-lg text-left transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
