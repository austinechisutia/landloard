import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'Landlord — Rental Management',
  description: 'Admin dashboard for managing houses, tenants, and rent payments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#f5f0e8] text-gray-900 antialiased">
        <SessionProvider>
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
