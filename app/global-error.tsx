'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-[#f5f0e8]">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-xl font-bold text-[#11430F]">Something went wrong</h2>
          <p className="text-sm text-gray-500">
            An unexpected error occurred. The team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-2 px-4 py-2 bg-[#11430F] text-[#e4f386] rounded-lg text-sm font-medium hover:bg-[#11430F]/90 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
