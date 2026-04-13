'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import {
  AUTH_NAME_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from '@/lib/auth-utils';

interface AuthPageFormProps {
  callbackUrl: string;
  oauthError?: string;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: 'Google sign-in failed. Please try again.',
  OAuthSignin: 'Could not start Google sign-in. Please try again.',
  OAuthCreateAccount: 'Could not create account with Google. Please try again.',
  OAuthAccountNotLinked: 'This email is already registered with a password. Please sign in with your email instead.',
  Callback: 'Authentication callback failed. Please try again.',
  Default: 'An authentication error occurred. Please try again.',
};

function resolveOAuthError(code?: string) {
  if (!code) return '';
  return OAUTH_ERROR_MESSAGES[code] ?? OAUTH_ERROR_MESSAGES.Default;
}

export default function AuthPageForm({ callbackUrl, oauthError }: AuthPageFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'success';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(resolveOAuthError(oauthError));
  const [isLoading, setIsLoading] = useState(false);

  function switchMode(nextMode: 'signin' | 'signup') {
    setMode(nextMode);
    setPassword('');
    setError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload.error ?? 'Registration failed. Please try again.');
          return;
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.url && !result.error) {
        router.replace(result.url ?? callbackUrl);
        router.refresh();
        return;
      }

      setError(result?.error ?? 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#11430F]">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
        <Link href="/" className="rounded-full border border-[#11430F]/30 px-3 py-1 text-xs font-medium text-[#11430F] transition hover:bg-[#11430F]/5">
          Home
        </Link>
      </div>

      {resetSuccess && (
        <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Password updated successfully. Sign in with your new password.
        </div>
      )}

      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={isLoading}
        onClick={() => signIn('google', { callbackUrl })}
        className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M17.64 9.2045c0-.638-.057-1.252-.164-1.8409H9v3.4813h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087C16.6582 14.0127 17.64 11.8054 17.64 9.2045z" fill="#4285F4" />
          <path d="M9 18c2.43 0 4.4673-.8063 5.9564-2.1818l-2.9087-2.2581c-.806.54-1.8368.8591-3.0477.8591-2.3441 0-4.3277-1.5832-5.036-3.7109H.9574v2.3318C2.4382 15.9836 5.4818 18 9 18z" fill="#34A853" />
          <path d="M3.964 10.71C3.7845 10.17 3.6818 9.5936 3.6818 9s.1027-1.17.2822-1.71V4.9582H.9574A9.0037 9.0037 0 000 9c0 1.4509.3477 2.8227.9574 4.0418L3.964 10.71z" fill="#FBBC05" />
          <path d="M9 3.5791c1.3214 0 2.5077.4545 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0164.9574 4.9582L3.964 7.29C4.6723 5.1623 6.6559 3.5791 9 3.5791z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs uppercase tracking-[0.3em] text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={AUTH_NAME_MAX_LENGTH}
            autoComplete="name"
            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#11430F] focus:ring-2 focus:ring-[#e4f386]"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#11430F] focus:ring-2 focus:ring-[#e4f386]"
        />
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#11430F] focus:ring-2 focus:ring-[#e4f386]"
          />
          {mode === 'signin' && (
            <div className="mt-1.5 text-right">
              <Link href="/forgot-password" className="text-xs text-[#11430F]/70 underline-offset-2 hover:underline">
                Forgot password?
              </Link>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-[#11430F] px-4 py-3 text-sm font-semibold text-[#e4f386] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? mode === 'signin' ? 'Signing in…' : 'Creating account…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        {mode === 'signin' ? (
          <>
            Don&apos;t have an account? <button type="button" onClick={() => switchMode('signup')} className="font-medium text-[#11430F] hover:underline">Sign up</button>
          </>
        ) : (
          <>
            Already have an account? <button type="button" onClick={() => switchMode('signin')} className="font-medium text-[#11430F] hover:underline">Sign in</button>
          </>
        )}
      </p>
    </div>
  );
}
