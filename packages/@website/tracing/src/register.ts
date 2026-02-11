import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const sdk = new NodeSDK({
  // Only export traces when OTLP endpoint is configured (production).
  // Instrumentations still create real spans locally so the Pino mixin
  // can read trace_id from the active context.
  ...(otlpEndpoint ? { traceExporter: new OTLPTraceExporter() } : {}),
  instrumentations: [
    new HttpInstrumentation(),
    new FastifyInstrumentation(),
    new PrismaInstrumentation(),
  ],
});

sdk.start();
