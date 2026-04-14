import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import AuthPageForm from '@/components/auth/AuthPageForm';
import { authOptions } from '@/lib/auth';
import { getSafeCallbackPath } from '@/lib/auth-utils';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl: rawCallbackUrl, error } = await searchParams;
  const callbackUrl = getSafeCallbackPath(rawCallbackUrl);
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <main className="relative min-h-screen bg-white pt-28 text-[#171717]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(228,243,134,0.25),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(17,67,15,0.06),_transparent_40%)]" />
      <div className="absolute inset-x-0 top-16 mx-auto h-72 w-72 rounded-full bg-[#e4f386]/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#11430F]/70">Rental Management</p>
              <h1 className="mt-3 font-serif text-5xl text-[#11430F] md:text-7xl">Landlord</h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: '🏠', title: 'Manage Units', desc: 'Track occupancy and house types' },
                { icon: '👥', title: 'Tenant Hub', desc: 'Profiles, leases, and contacts' },
                { icon: '💳', title: 'Payments', desc: 'Rent schedules and ledger history' },
              ].map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-white/60 bg-white/55 p-4 backdrop-blur-sm">
                  <div className="text-2xl">{feature.icon}</div>
                  <p className="mt-2 text-sm font-semibold text-[#11430F]">{feature.title}</p>
                  <p className="mt-0.5 text-xs text-[#11430F]/60">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <Suspense
            fallback={
              <div className="animate-pulse rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
                <div className="mb-4 h-6 w-32 rounded-lg bg-gray-200" />
                <div className="mb-6 h-12 rounded-2xl bg-gray-200" />
                <div className="mb-3 h-11 rounded-2xl bg-gray-200" />
                <div className="mb-3 h-11 rounded-2xl bg-gray-200" />
                <div className="h-11 rounded-2xl bg-gray-200" />
              </div>
            }
          >
            <AuthPageForm callbackUrl={callbackUrl} oauthError={error} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
