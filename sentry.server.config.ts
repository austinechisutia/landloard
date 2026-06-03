import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Don't send 4xx errors to Sentry — those are user errors, not bugs.
  beforeSend(event) {
    const status = event.contexts?.response?.status_code as number | undefined;
    if (status && status >= 400 && status < 500) return null;
    return event;
  },
});
