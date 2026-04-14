import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#171717] overflow-x-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#e4f386]/30 blur-[120px]" />
        <div className="absolute top-1/2 -right-60 h-[500px] w-[500px] rounded-full bg-[#11430F]/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-[#e4f386]/20 blur-[90px]" />
      </div>

      {/* ── HERO ── */}
      <section className="relative mx-auto max-w-6xl px-4 pt-36 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#11430F]/15 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#11430F]/70 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#11430F]/50" />
          Rental Management Platform
        </div>

        <h1 className="mt-6 font-serif text-5xl leading-tight text-[#11430F] sm:text-6xl md:text-7xl lg:text-8xl">
          Run your rentals<br />
          <span className="relative inline-block">
            effortlessly.
            <span
              className="absolute -bottom-1 left-0 h-1 w-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #e4f386, #11430F40)' }}
            />
          </span>
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-[#11430F]/65 sm:text-lg">
          Landlord keeps your properties, tenants, and payments in one clean
          dashboard — so you spend less time on admin and more time on what matters.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#11430F]/30 transition hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #11430F 0%, #1e6b1a 100%)' }}
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#11430F]/30 transition hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #11430F 0%, #1e6b1a 100%)' }}
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-[#11430F]/25 bg-white/60 px-8 py-3.5 text-sm font-semibold text-[#11430F] backdrop-blur-sm transition hover:bg-white/90"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Hero visual */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-[#11430F]/10 bg-white/70 p-1.5 shadow-2xl shadow-[#11430F]/10 backdrop-blur-md">
            <div className="rounded-xl bg-[#11430F]/[0.03] p-6">
              {/* Mock dashboard strip */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                <div className="ml-3 h-4 w-40 rounded-full bg-[#11430F]/8" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total Units',    value: '24',        accent: '#e4f386' },
                  { label: 'Occupied',       value: '20',        accent: '#bbf7d0' },
                  { label: 'Vacant',         value: '4',         accent: '#fef08a' },
                  { label: 'Rent Collected', value: 'KSh 96k',   accent: '#bfdbfe' },
                ].map(card => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-white/80 bg-white/80 p-4 text-left shadow-sm"
                  >
                    <div
                      className="mb-2 inline-block rounded-lg px-2 py-0.5 text-xs font-bold"
                      style={{ background: card.accent, color: '#11430F' }}
                    >
                      {card.value}
                    </div>
                    <p className="text-xs text-[#11430F]/55">{card.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {['Unit A1 · Occupied', 'Unit B2 · Occupied', 'Unit C3 · Vacant'].map(u => (
                  <div key={u} className="rounded-lg border border-[#11430F]/8 bg-white/60 px-3 py-2 text-xs text-[#11430F]/60">
                    {u}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Glow under card */}
          <div className="absolute inset-x-8 -bottom-6 h-12 rounded-full bg-[#11430F]/15 blur-xl" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative mx-auto max-w-6xl px-4 py-24">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#11430F]/50">Everything you need</p>
          <h2 className="mt-2 font-serif text-4xl text-[#11430F] sm:text-5xl">One platform, full control</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: '🏘️',
              title: 'Property & Units',
              desc: 'Organise properties by house type, track vacancy status, and manage deposit settings per unit.',
            },
            {
              icon: '👥',
              title: 'Tenant Profiles',
              desc: 'Store tenant details, emergency contacts, household info, and move-in dates — all in one place.',
            },
            {
              icon: '💳',
              title: 'Rent & Payments',
              desc: 'Record rent and deposits, track balances, and get a full ledger history for every tenant.',
            },
            {
              icon: '⚙️',
              title: 'Service Charges',
              desc: 'Attach fixed or per-unit service charges (water, garbage, etc.) directly to payments.',
            },
            {
              icon: '📊',
              title: 'Live Dashboard',
              desc: 'See your total rent collected, pending balances, occupied units, and more at a glance.',
            },
            {
              icon: '🔒',
              title: 'Secure & Private',
              desc: 'Your data is yours. Each account is fully isolated — no one else sees your properties.',
            },
          ].map(f => (
            <div
              key={f.title}
              className="group rounded-3xl border border-white/70 bg-white/55 p-7 backdrop-blur-sm transition hover:bg-white/80 hover:shadow-lg hover:shadow-[#11430F]/5"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#11430F]/6 text-2xl">
                {f.icon}
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-[#11430F]">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[#11430F]/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative mx-auto max-w-6xl px-4 py-24">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#11430F]/50">Get started in minutes</p>
          <h2 className="mt-2 font-serif text-4xl text-[#11430F] sm:text-5xl">How it works</h2>
        </div>

        <div className="relative grid gap-8 sm:grid-cols-3">
          {/* connecting line desktop */}
          <div className="absolute top-8 left-[16.66%] right-[16.66%] hidden h-px bg-gradient-to-r from-transparent via-[#11430F]/15 to-transparent sm:block" />

          {[
            { step: '01', title: 'Create an account', desc: 'Sign up in seconds with your email or Google account.' },
            { step: '02', title: 'Add your properties', desc: 'Set up house types, units, and their rent amounts.' },
            { step: '03', title: 'Manage with ease', desc: 'Add tenants, record payments, and track everything live.' },
          ].map(s => (
            <div key={s.step} className="relative flex flex-col items-center text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#11430F]/15 bg-white text-xl font-bold text-[#11430F] shadow-sm"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {s.step}
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-[#11430F]">{s.title}</h3>
              <p className="max-w-xs text-sm leading-relaxed text-[#11430F]/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl p-12 text-center text-white shadow-2xl shadow-[#11430F]/25"
          style={{ background: 'linear-gradient(135deg, #11430F 0%, #1c5e19 60%, #11430F 100%)' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(228,243,134,0.2),_transparent_55%)]" />
          <div className="relative">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl">Ready to simplify your rentals?</h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/70">
              Join other landlords who manage their properties without spreadsheets or paperwork.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {session ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[#e4f386] px-8 py-3.5 text-sm font-semibold text-[#11430F] transition hover:bg-[#ecf89f] active:scale-95"
                >
                  Open Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full bg-[#e4f386] px-8 py-3.5 text-sm font-semibold text-[#11430F] transition hover:bg-[#ecf89f] active:scale-95"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-full border border-white/25 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#11430F]/10 bg-white/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <span className="text-lg font-bold text-[#11430F]">Landlord</span>
          <p className="text-xs text-[#11430F]/45">© {new Date().getFullYear()} Landlord. Rental Management Platform.</p>
          <nav className="flex items-center gap-5 text-xs text-[#11430F]/55">
            <Link href="/login" className="transition hover:text-[#11430F]">Sign In</Link>
            <Link href="/login" className="transition hover:text-[#11430F]">Register</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
