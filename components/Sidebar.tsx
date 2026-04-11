'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: '/',             label: 'Dashboard',   icon: '▦' },
  { href: '/house-types',  label: 'House Types', icon: '⌂' },
  { href: '/units',        label: 'Units',       icon: '◫' },
  { href: '/tenants',      label: 'Tenants',     icon: '👥' },
  { href: '/payments',     label: 'Payments',    icon: '💳' },
  { href: '/services',     label: 'Services',    icon: '⚙' },
];

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="px-6 py-5 border-b border-indigo-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Landlord</h1>
          <p className="text-indigo-300 text-xs mt-0.5">Rental Management</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden text-indigo-300 hover:text-white p-1 rounded transition-colors"
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
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
