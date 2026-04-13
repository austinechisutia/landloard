'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export default function Navbar() {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!isAuthRoute) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#11430F]/10 bg-white/80 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-[#11430F]">
          Landlord
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="rounded-full border border-[#11430F]/30 px-4 py-1.5 text-sm font-medium text-[#11430F] transition hover:bg-[#11430F]/5">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
