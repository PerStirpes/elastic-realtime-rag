// Don't even brother trying to implement otel comment out this code
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc"
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { OpenAIInstrumentation } from "@elastic/opentelemetry-instrumentation-openai"
import os from "os"

const logRecordProcessor = new BatchLogRecordProcessor(new OTLPLogExporter())

const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
})

const sdk = new NodeSDK({
    logRecordProcessors: [logRecordProcessor],
    metricReader,
    instrumentations: [
        new HttpInstrumentation(),
        new OpenAIInstrumentation({
            captureMessageContent: true,
        }),
    ],
    spanProcessors: [new SimpleSpanProcessor(new OTLPTraceExporter())],
})

async function shutdownSDK() {
    await metricReader.forceFlush()
    try {
        await sdk.shutdown()
    } catch (err) {
        console.warn("Warning: error shutting down OTel SDK", err)
    }
}

process.on("SIGTERM", async () => {
    await shutdownSDK()
    process.exit(128 + os.constants.signals.SIGTERM)
})

process.once("beforeExit", async () => {
    await shutdownSDK()
})
sdk.start()
