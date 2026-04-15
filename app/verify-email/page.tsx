import Link from 'next/link';
import VerifyEmailActions from '@/components/auth/VerifyEmailActions';
import { verifyEmailToken } from '@/lib/email-verification';

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string; email?: string; sent?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token, email, sent } = await searchParams;

  let state: 'missing' | 'invalid' | 'expired' | 'success' | 'pending' = 'pending';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (token && normalizedEmail) {
    const result = await verifyEmailToken(normalizedEmail, token);
    state = result.ok ? 'success' : result.reason;
  } else if (normalizedEmail) {
    state = 'pending';
  } else {
    state = 'missing';
  }

  return (
    <main className="relative min-h-screen bg-[#f5f0e8] pt-28 text-[#171717]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(228,243,134,0.55),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(17,67,15,0.14),_transparent_32%),linear-gradient(135deg,_#f8f5ef_0%,_#efe6d6_100%)]" />
      <div className="absolute inset-x-0 top-16 mx-auto h-72 w-72 rounded-full bg-white/30 blur-3xl" />

      <div className="relative mx-auto max-w-md px-4 pb-16">
        <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <h1 className="mb-2 text-xl font-semibold text-[#11430F]">Verify your email</h1>

          {state === 'success' && (
            <>
              <p className="mb-6 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                Your email has been verified. You can now sign in to your account.
              </p>
              <Link href="/login?verified=success" className="block w-full rounded-2xl bg-[#11430F] px-4 py-3 text-center text-sm font-semibold text-[#e4f386] transition hover:opacity-90">
                Continue to sign in
              </Link>
            </>
          )}

          {state === 'pending' && (
            <>
              {sent === '0' ? (
                <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Your account was created, but we could not send the verification email right away. Request a new verification email below.
                </p>
              ) : (
                <p className="mb-4 text-sm text-gray-500">
                  We sent a verification link to <span className="font-medium text-[#11430F]">{normalizedEmail}</span>. Open that email and click the link to activate your account.
                </p>
              )}
              <VerifyEmailActions email={normalizedEmail} />
            </>
          )}

          {state === 'expired' && (
            <>
              <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This verification link has expired. Request a fresh one below.
              </p>
              <VerifyEmailActions email={normalizedEmail} />
            </>
          )}

          {state === 'invalid' && (
            <>
              <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                This verification link is invalid. Request a new email and try again.
              </p>
              <VerifyEmailActions email={normalizedEmail} />
            </>
          )}

          {state === 'missing' && (
            <>
              <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                This verification link is missing required details.
              </p>
              <VerifyEmailActions />
            </>
          )}

          <p className="mt-5 text-center text-sm text-gray-500">
            Already verified? <Link href="/login" className="font-medium text-[#11430F] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
