'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col text-white
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ backgroundColor: '#11430F' }}
    >
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Landlord</h1>
          <p className="mt-0.5 text-xs" style={{ color: '#a8d5a8' }}>Rental Management</p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-white/60 transition-colors hover:text-white md:hidden"
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
              className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors"
              style={{
                backgroundColor: active ? 'rgba(228,243,134,0.18)' : 'transparent',
                color: active ? '#e4f386' : 'rgba(255,255,255,0.75)',
                fontWeight: active ? '600' : '400',
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/account"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors"
          style={{
            backgroundColor: pathname.startsWith('/account') ? 'rgba(228,243,134,0.18)' : 'transparent',
            color: pathname.startsWith('/account') ? '#e4f386' : 'rgba(255,255,255,0.75)',
            fontWeight: pathname.startsWith('/account') ? '600' : '400',
          }}
        >
          <span className="text-base">👤</span>
          <span>My Account</span>
        </Link>

        {session?.user?.role === 'ADMIN' && (
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors"
            style={{
              backgroundColor: pathname.startsWith('/admin') ? 'rgba(228,243,134,0.18)' : 'transparent',
              color: pathname.startsWith('/admin') ? '#e4f386' : 'rgba(255,255,255,0.75)',
              fontWeight: pathname.startsWith('/admin') ? '600' : '400',
            }}
          >
            <span className="text-base">🛡</span>
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(228,243,134,0.2)', color: '#e4f386' }}>
            {user?.image ? <img src={user.image} alt={user.name ?? ''} className="h-8 w-8 rounded-full object-cover" /> : initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? 'Landlord'}</p>
            <p className="truncate text-xs" style={{ color: '#a8d5a8' }}>{user?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
