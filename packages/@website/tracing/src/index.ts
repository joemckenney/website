import { trace } from "@opentelemetry/api";

export {
  context,
  propagation,
  type Span,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

/**
 * Pino mixin that injects trace_id and span_id from the active OTel span.
 * Use as the `mixin` option when creating the Pino/Fastify logger.
 *
 * This is more reliable than @opentelemetry/instrumentation-pino because
 * it doesn't depend on ESM loader hooks (which conflict with tsx).
 */
export function tracingMixin(): Record<string, string> {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
  };
}
