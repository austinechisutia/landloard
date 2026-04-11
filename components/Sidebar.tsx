'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/',             label: 'Dashboard',   icon: '▦' },
  { href: '/house-types',  label: 'House Types', icon: '⌂' },
  { href: '/units',        label: 'Units',       icon: '◫' },
  { href: '/tenants',      label: 'Tenants',     icon: '👥' },
  { href: '/payments',     label: 'Payments',    icon: '💳' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-indigo-900 text-white flex flex-col min-h-screen shrink-0">
      <div className="px-6 py-5 border-b border-indigo-700">
        <h1 className="text-xl font-bold tracking-tight">Landloard</h1>
        <p className="text-indigo-300 text-xs mt-0.5">Rental Management</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const active =
            item.href === '/'
              ? pathname === '/'
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
    </aside>
  );
}
