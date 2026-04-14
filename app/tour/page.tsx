import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const TOUR_STEPS = [
  {
    title: 'Start with your portfolio',
    description:
      'Create a property, group units by type, and immediately see which spaces are occupied or vacant.',
    points: ['Add buildings and units', 'Set rent amounts per unit', 'Track occupancy at a glance'],
  },
  {
    title: 'Keep tenant records organized',
    description:
      'Store contact details, move-in dates, and household information so nothing gets lost in notebooks or spreadsheets.',
    points: ['Capture tenant profiles', 'Keep emergency contacts handy', 'Review lease status quickly'],
  },
  {
    title: 'Follow every payment',
    description:
      'Record rent, deposits, and service charges in one place and keep a clean ledger for each tenant.',
    points: ['Log rent and deposit payments', 'Track pending balances', 'Review payment history anytime'],
  },
];

const HIGHLIGHTS = [
  { label: 'Properties', value: '4 live properties' },
  { label: 'Units', value: '24 units tracked' },
  { label: 'Occupied', value: '20 currently occupied' },
  { label: 'Collected', value: 'KSh 96,000 this month' },
];

const ACTIVITY = [
  { title: 'New tenant added', detail: 'Asha Wanjiku moved into Unit B2', time: '2 hours ago' },
  { title: 'Rent recorded', detail: 'April payment posted for Unit A4', time: 'Today' },
  { title: 'Balance flagged', detail: 'Unit C3 still has KSh 4,500 pending', time: 'This week' },
];

export default async function TourPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f0e8] pt-28 text-[#171717]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-0 h-[420px] w-[420px] rounded-full bg-[#e4f386]/40 blur-[110px]" />
        <div className="absolute right-0 top-1/3 h-[420px] w-[420px] rounded-full bg-[#11430F]/10 blur-[100px]" />
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#11430F]/60">
              Product tour
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#11430F] md:text-6xl">
              See how Landlord works before you sign in.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#11430F]/65">
              This guided preview shows the main flow: setting up units, managing tenants,
              and keeping rent records tidy. It uses sample data only, so visitors can look
              around without needing an account first.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={session ? '/dashboard' : '/login'}
                className="rounded-full bg-[#11430F] px-7 py-3 text-sm font-semibold text-[#e4f386] transition hover:opacity-90"
              >
                {session ? 'Open your dashboard' : 'Create your account'}
              </Link>
              {!session && (
                <Link
                  href="/login"
                  className="rounded-full border border-[#11430F]/20 bg-white/70 px-7 py-3 text-sm font-semibold text-[#11430F] transition hover:bg-white"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#11430F]/10 bg-white/80 p-6 shadow-2xl shadow-[#11430F]/10 backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-300" />
              <div className="ml-3 h-4 w-40 rounded-full bg-[#11430F]/8" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {HIGHLIGHTS.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#11430F]/8 bg-[#f8f5ef] p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-[#11430F]/45">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-[#11430F]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#11430F]/8 bg-[#11430F] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Recent activity</p>
              <div className="mt-4 space-y-3">
                {ACTIVITY.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/8 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="text-xs text-white/60">{item.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/70">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#11430F]/55">Walkthrough</p>
          <h2 className="mt-3 font-serif text-4xl text-[#11430F] md:text-5xl">Three quick stops in the tour</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {TOUR_STEPS.map((step, index) => (
            <article
              key={step.title}
              className="rounded-[2rem] border border-white/70 bg-white/70 p-7 shadow-lg shadow-[#11430F]/5 backdrop-blur-sm"
            >
              <div className="inline-flex rounded-full bg-[#e4f386] px-3 py-1 text-xs font-semibold text-[#11430F]">
                Step {index + 1}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#11430F]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#11430F]/65">{step.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-[#11430F]/80">
                {step.points.map((point) => (
                  <li key={point} className="rounded-2xl bg-[#11430F]/4 px-4 py-3">
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-[2rem] bg-[#11430F] px-6 py-10 text-center text-white shadow-2xl shadow-[#11430F]/25 md:px-10">
          <h2 className="font-serif text-3xl md:text-4xl">Like what you see?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/75">
            The tour is public, but your real workspace stays private. Sign in or create an
            account when you are ready to start managing your own rentals.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={session ? '/dashboard' : '/login'}
              className="rounded-full bg-[#e4f386] px-7 py-3 text-sm font-semibold text-[#11430F] transition hover:bg-[#edf8a8]"
            >
              {session ? 'Go to dashboard' : 'Get started'}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
