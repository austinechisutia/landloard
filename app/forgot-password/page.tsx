'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#f5f0e8] pt-28 text-[#171717]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(228,243,134,0.55),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(17,67,15,0.14),_transparent_32%),linear-gradient(135deg,_#f8f5ef_0%,_#efe6d6_100%)]" />
      <div className="absolute inset-x-0 top-16 mx-auto h-72 w-72 rounded-full bg-white/30 blur-3xl" />

      <div className="relative mx-auto max-w-md px-4">
        <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <h1 className="mb-2 text-xl font-semibold text-[#11430F]">Forgot your password?</h1>
          <p className="mb-6 text-sm text-gray-500">Enter your email and we&apos;ll send you a reset link.</p>

          {submitted ? (
            <div className="space-y-4">
              <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                If an account with that email exists, we&apos;ve sent a reset link. Check your inbox — it expires in 1 hour.
              </p>
              <Link href="/login" className="block w-full rounded-2xl bg-[#11430F] px-4 py-3 text-center text-sm font-semibold text-[#e4f386] transition hover:opacity-90">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#11430F] focus:ring-2 focus:ring-[#e4f386]"
              />
              <button type="submit" disabled={isLoading} className="w-full rounded-2xl bg-[#11430F] px-4 py-3 text-sm font-semibold text-[#e4f386] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <p className="text-center text-sm text-gray-500">
                Remember it? <Link href="/login" className="font-medium text-[#11430F] hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
