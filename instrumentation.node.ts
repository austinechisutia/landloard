import { trace } from '@opentelemetry/api';
import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

const ROUTE_SPAN = 'AppRouteRouteHandlers.runHandler';

class ApiTimingProcessor implements SpanProcessor {
  onStart(_span: Span, _ctx: Context): void {}

  onEnd(span: ReadableSpan): void {
    if (span.attributes['next.span_type'] !== ROUTE_SPAN) return;

    const route = span.attributes['next.route'] ?? '?';
    const method = span.attributes['http.method'] ?? '';
    const status = span.attributes['http.status_code'];
    const [sec, ns] = span.duration;
    const ms = (sec * 1000 + ns / 1_000_000).toFixed(1);
    const statusStr = status != null ? ` → ${status}` : '';

    console.log(`[latency] ${method} ${route}${statusStr}: ${ms}ms`);
  }

  shutdown(): Promise<void> { return Promise.resolve(); }
  forceFlush(): Promise<void> { return Promise.resolve(); }
}

// Inject into the existing global OTEL provider (set up by Sentry).
// Uses the same internal pattern as @sentry/node-core's otlpIntegration.
const globalProvider = trace.getTracerProvider();
const delegate =
  'getDelegate' in globalProvider
    ? (globalProvider as unknown as { getDelegate(): unknown }).getDelegate()
    : globalProvider;

const activeProcessor = (delegate as Record<string, unknown>)?._activeSpanProcessor as
  | { _spanProcessors?: unknown[] }
  | undefined;

if (activeProcessor?._spanProcessors) {
  activeProcessor._spanProcessors.push(new ApiTimingProcessor());
} else {
  console.warn('[latency] Could not inject timing processor — Sentry OTEL provider not ready');
}
