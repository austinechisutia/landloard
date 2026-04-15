'use client';

import { useState } from 'react';
import Link from 'next/link';

interface VerifyEmailActionsProps {
  email?: string;
}

export default function VerifyEmailActions({ email = '' }: VerifyEmailActionsProps) {
  const [address, setAddress] = useState(email);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? 'We could not send the verification email. Please try again.');
        return;
      }

      setSuccess('If that account exists and is not verified yet, a new verification email is on the way.');
    } catch {
      setError('We could not send the verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}
      <input
        type="email"
        placeholder="Email address"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        required
        autoComplete="email"
        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#11430F] focus:ring-2 focus:ring-[#e4f386]"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-[#11430F] px-4 py-3 text-sm font-semibold text-[#e4f386] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Sending…' : 'Resend Verification Email'}
      </button>
      <Link href="/login" className="block text-center text-sm font-medium text-[#11430F] hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
