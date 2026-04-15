'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PUBLIC_ROUTES = ['/', '/login', '/tour', '/verify-email', '/forgot-password', '/reset-password'];

export default function Navbar() {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );

  if (!isPublicRoute) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#11430F]/10 bg-white backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-[#11430F]">
          Landlord
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/tour" className="text-sm font-medium text-[#11430F]/80 transition hover:text-[#11430F]">
            Tour
          </Link>
          <Link href="/login" className="rounded-full border border-[#11430F]/30 px-4 py-1.5 text-sm font-medium text-[#11430F] transition hover:bg-[#11430F]/5">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
