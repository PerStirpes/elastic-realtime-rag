import { NextRequest, NextResponse } from "next/server"
import {
    trace,
    context,
    propagation,
    SpanKind,
    SpanStatusCode,
    Attributes,
    Span,
    SpanAttributeValue,
    Context,
    metrics,
} from "@opentelemetry/api"
import { performance } from "perf_hooks"
import {
    ATTR_GEN_AI_OPERATION_NAME,
    ATTR_GEN_AI_SYSTEM,
    ATTR_GEN_AI_USAGE_INPUT_TOKENS,
    ATTR_GEN_AI_USAGE_OUTPUT_TOKENS,
    ATTR_GEN_AI_TOKEN_TYPE,
    ATTR_GEN_AI_RESPONSE_MODEL,
    ATTR_GEN_AI_TOOL_CALLED,
    ATTR_GEN_AI_TOOL_NAME,
    ATTR_GEN_AI_TOTAL_TOKENS,
    ATTR_GEN_AI_INPUT_TEXT_TOKENS,
    ATTR_GEN_AI_INPUT_AUDIO_TOKENS,
    ATTR_GEN_AI_OUTPUT_TEXT_TOKENS,
    ATTR_GEN_AI_OUTPUT_AUDIO_TOKENS,
    ATTR_GEN_AI_CACHED_TOKENS,
    ATTR_GEN_AI_CACHED_TEXT_TOKENS,
    ATTR_GEN_AI_CACHED_AUDIO_TOKENS,
    ATTR_GEN_AI_CONVERSATION_ID,
    ATTR_GEN_AI_TRANSCRIPT_ROLE,
    METRIC_GEN_AI_CLIENT_TOKEN_USAGE,
    METRIC_GEN_AI_CLIENT_OPERATION_DURATION,
    ATTR_GEN_AI_TRANSCRIPT_SOURCE,
    ATTR_GEN_AI_CONTENT_INDEX,
    ATTR_GEN_AI_CONTENT_TYPES,
    ATTR_GEN_AI_EVENT_ID,
    ATTR_GEN_AI_HAS_AUDIO_CONTENT,
    ATTR_GEN_AI_HAS_TRANSCRIPT,
    ATTR_GEN_AI_ITEM_ID,
    ATTR_GEN_AI_MAX_OUTPUT_TOKENS,
    ATTR_GEN_AI_MODALITIES,
    ATTR_GEN_AI_OUTPUT_AUDIO_FORMAT,
    ATTR_GEN_AI_OUTPUT_ITEM_ID,
    ATTR_GEN_AI_OUTPUT_ITEM_ROLE,
    ATTR_GEN_AI_OUTPUT_ITEM_STATUS,
    ATTR_GEN_AI_OUTPUT_ITEM_TYPE,
    ATTR_GEN_AI_RESPONSE_ID,
    ATTR_GEN_AI_RESPONSE_STATUS,
    ATTR_GEN_AI_TEMPERATURE,
    ATTR_GEN_AI_TOOL_RESULT_COUNT,
    ATTR_GEN_AI_TOOL_SUCCESS,
    ATTR_GEN_AI_TRANSCRIPT_FULL,
    ATTR_GEN_AI_TRANSCRIPT_LENGTH,
    ATTR_GEN_AI_TRANSCRIPT_PREVIEW,
    ATTR_GEN_AI_TRANSCRIPT_TIMESTAMP,
    ATTR_GEN_AI_VOICE,
} from "@/app/lib/semconv"

// Debug mode configuration
const DEBUG_MODE = process.env.DEBUG_TELEMETRY === "true"

// Debug logger implementation
function debug(...args: any[]) {
    if (DEBUG_MODE) {
        console.log("[telemetry-debug]", ...args)
    }
}

// Sampling configuration (process a percentage of events)
const SAMPLING_RATE = parseFloat(process.env.TELEMETRY_SAMPLING_RATE || "1.0") // Default to 100%

// Get a tracer instance
const tracer = trace.getTracer("gen_ai-realtime-server")

// Create a meter instance for metrics
const meter = metrics.getMeter("gen_ai-realtime-server")

// Create histogram metrics
const genAiTokenUsage = meter.createHistogram(METRIC_GEN_AI_CLIENT_TOKEN_USAGE, {
    description: "Measures number of input and output tokens used",
    unit: "{token}",
    advice: {
        explicitBucketBoundaries: [
            1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864,
        ],
    },
})

const genAiOperationDuration = meter.createHistogram(METRIC_GEN_AI_CLIENT_OPERATION_DURATION, {
    description: "GenAI operation duration",
    unit: "s",
    advice: {
        explicitBucketBoundaries: [
            0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56, 5.12, 10.24, 20.48, 40.96, 81.92,
        ],
    },
})

/**
 * Helper function to safely set span attributes based on eventData
 */
function setAttributeIfExists(span: Span, attributeName: string, value: unknown): void {
    if (value !== undefined && value !== null) {
        span.setAttribute(attributeName, value as SpanAttributeValue)
    }
}

/**
 * Helper function to handle array attributes
 */
function setArrayAttribute(span: Span, attributeName: string, value: unknown): void {
    if (!value) return

    if (Array.isArray(value)) {
        span.setAttribute(attributeName, value.join(","))
    } else {
        span.setAttribute(attributeName, String(value))
    }
}

/**
 * Process token usage data
 */
function processTokenUsage(span: Span, eventData: Record<string, any>): void {
    console.log("Processing token usage with:", JSON.stringify(eventData, null, 2))

    // If we have usage data in the response, use that
    if (eventData.response?.usage) {
        const usage = eventData.response.usage
        eventData.totalTokens = usage.total_tokens
        eventData.inputTokens = usage.input_tokens
        eventData.outputTokens = usage.output_tokens
        eventData.input_token_details = usage.input_token_details
        eventData.output_token_details = usage.output_token_details
    } else if (eventData.usage) {
        const usage = eventData.usage
        eventData.totalTokens = usage.total_tokens
        eventData.inputTokens = usage.input_tokens
        eventData.outputTokens = usage.output_tokens
        eventData.input_token_details = usage.input_token_details
        eventData.output_token_details = usage.output_token_details
    }

    // Basic token counts
    setAttributeIfExists(span, ATTR_GEN_AI_TOTAL_TOKENS, eventData.totalTokens)
    setAttributeIfExists(span, ATTR_GEN_AI_USAGE_INPUT_TOKENS, eventData.inputTokens)
    setAttributeIfExists(span, ATTR_GEN_AI_USAGE_OUTPUT_TOKENS, eventData.outputTokens)
    setAttributeIfExists(span, ATTR_GEN_AI_RESPONSE_MODEL, eventData.model)

    // Process input token details if available
    if (eventData.inputTokenDetails || eventData.input_token_details) {
        const inputDetails = eventData.inputTokenDetails || eventData.input_token_details
        console.log("Processing input token details:", JSON.stringify(inputDetails, null, 2))

        if (inputDetails) {
            setAttributeIfExists(span, ATTR_GEN_AI_INPUT_TEXT_TOKENS, inputDetails.text_tokens)
            setAttributeIfExists(span, ATTR_GEN_AI_INPUT_AUDIO_TOKENS, inputDetails.audio_tokens)

            // Process cached tokens if available
            if (inputDetails.cached_tokens) {
                console.log("Setting cached tokens:", inputDetails.cached_tokens)
                setAttributeIfExists(span, ATTR_GEN_AI_CACHED_TOKENS, inputDetails.cached_tokens)

                if (inputDetails.cached_tokens_details) {
                    console.log(
                        "Setting cached tokens details:",
                        JSON.stringify(inputDetails.cached_tokens_details, null, 2),
                    )
                    setAttributeIfExists(
                        span,
                        ATTR_GEN_AI_CACHED_TEXT_TOKENS,
                        inputDetails.cached_tokens_details.text_tokens,
                    )
                    setAttributeIfExists(
                        span,
                        ATTR_GEN_AI_CACHED_AUDIO_TOKENS,
                        inputDetails.cached_tokens_details.audio_tokens,
                    )
                }
            }
        }
    } else {
        // Fall back to flat properties if details object isn't available
        setAttributeIfExists(span, ATTR_GEN_AI_INPUT_TEXT_TOKENS, eventData.inputTextTokens)
        setAttributeIfExists(span, ATTR_GEN_AI_INPUT_AUDIO_TOKENS, eventData.inputAudioTokens)
    }

    // Process output token details if available
    if (eventData.outputTokenDetails || eventData.output_token_details) {
        const outputDetails = eventData.outputTokenDetails || eventData.output_token_details
        if (outputDetails) {
            setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_TEXT_TOKENS, outputDetails.text_tokens)
            setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_AUDIO_TOKENS, outputDetails.audio_tokens)
        }
    } else {
        // Fall back to flat properties if details object isn't available
        setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_TEXT_TOKENS, eventData.outputTextTokens)
        setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_AUDIO_TOKENS, eventData.outputAudioTokens)
    }

    // Record token usage metrics
    const commonAttrs: Attributes = {
        [ATTR_GEN_AI_OPERATION_NAME]: "realtime",
        [ATTR_GEN_AI_SYSTEM]: "openai",
    }

    if (eventData.model) {
        commonAttrs[ATTR_GEN_AI_RESPONSE_MODEL] = eventData.model
    }

    // Record input tokens
    if (eventData.inputTokens) {
        genAiTokenUsage.record(eventData.inputTokens, {
            ...commonAttrs,
            [ATTR_GEN_AI_TOKEN_TYPE]: "input",
        })
    }

    // Record output tokens
    if (eventData.outputTokens) {
        genAiTokenUsage.record(eventData.outputTokens, {
            ...commonAttrs,
            [ATTR_GEN_AI_TOKEN_TYPE]: "output",
        })
    }

    // Record total tokens
    if (eventData.totalTokens) {
        genAiTokenUsage.record(eventData.totalTokens, {
            ...commonAttrs,
            [ATTR_GEN_AI_TOKEN_TYPE]: "total",
        })
    }

    // Record cached tokens if available
    const inputDetails = eventData.inputTokenDetails || eventData.input_token_details
    if (inputDetails && inputDetails.cached_tokens) {
        genAiTokenUsage.record(inputDetails.cached_tokens, {
            ...commonAttrs,
            [ATTR_GEN_AI_TOKEN_TYPE]: "cached",
        })
    }
}

/**
 * Process tool call data
 */
function processToolCall(span: Span, eventData: Record<string, any>): void {
    span.setAttribute(ATTR_GEN_AI_TOOL_CALLED, true)
    setAttributeIfExists(span, ATTR_GEN_AI_TOOL_NAME, eventData.toolName)
    setAttributeIfExists(span, ATTR_GEN_AI_TOOL_SUCCESS, eventData.success)
    setAttributeIfExists(span, ATTR_GEN_AI_TOOL_RESULT_COUNT, eventData.resultCount)

    if (eventData.error) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: eventData.error,
        })
    }
}

/**
 * Process API fetch data
 */
function processRealtimeFetch(span: Span, eventData: Record<string, any>): void {
    setAttributeIfExists(span, "http.url", eventData.url)
    setAttributeIfExists(span, "http.method", eventData.method)
    setAttributeIfExists(span, "http.status_code", eventData.statusCode)

    if (eventData.error) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: eventData.error,
        })
    }
}

/**
 * Process response details data
 */
function processResponseDetails(span: Span, eventData: Record<string, any>): void {
    // Response metadata
    setAttributeIfExists(span, ATTR_GEN_AI_RESPONSE_ID, eventData.responseId)
    setAttributeIfExists(span, ATTR_GEN_AI_RESPONSE_STATUS, eventData.responseStatus)
    setAttributeIfExists(span, ATTR_GEN_AI_CONVERSATION_ID, eventData.conversationId)
    setAttributeIfExists(span, ATTR_GEN_AI_VOICE, eventData.voice)
    setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_AUDIO_FORMAT, eventData.outputAudioFormat)
    setAttributeIfExists(span, ATTR_GEN_AI_TEMPERATURE, eventData.temperature)
    setAttributeIfExists(span, ATTR_GEN_AI_MAX_OUTPUT_TOKENS, eventData.maxOutputTokens)
    setArrayAttribute(span, ATTR_GEN_AI_MODALITIES, eventData.modalities)

    // Output item details
    setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_ITEM_ID, eventData.outputItemId)
    setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_ITEM_TYPE, eventData.outputItemType)
    setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_ITEM_STATUS, eventData.outputItemStatus)
    setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_ITEM_ROLE, eventData.outputItemRole)

    // Content details
    setAttributeIfExists(span, ATTR_GEN_AI_HAS_AUDIO_CONTENT, eventData.hasAudioContent)
    setArrayAttribute(span, ATTR_GEN_AI_CONTENT_TYPES, eventData.contentTypes)

    // Transcript information
    setAttributeIfExists(span, ATTR_GEN_AI_HAS_TRANSCRIPT, eventData.hasTranscript) // REMOVE
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_LENGTH, eventData.transcriptLength)
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_PREVIEW, eventData.transcriptPreview) //REMOVE
}

/**
 * Process full transcript data
 */
function processFullTranscript(span: Span, eventData: Record<string, any>): void {
    setAttributeIfExists(span, ATTR_GEN_AI_RESPONSE_ID, eventData.responseId)
    setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_ITEM_ID, eventData.outputItemId)
    setAttributeIfExists(span, ATTR_GEN_AI_OUTPUT_ITEM_ROLE, eventData.role) //REMOVE
    setAttributeIfExists(span, ATTR_GEN_AI_RESPONSE_STATUS, eventData.status)
    setAttributeIfExists(span, ATTR_GEN_AI_CONVERSATION_ID, eventData.conversationId)
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_FULL, eventData.transcript)
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_TIMESTAMP, eventData.timestamp)
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_SOURCE, eventData.transcriptSource)
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_ROLE, eventData.role)
}

/**
 * Process user transcript data
 */
function processUserTranscript(span: Span, eventData: Record<string, any>): void {
    setAttributeIfExists(span, ATTR_GEN_AI_EVENT_ID, eventData.eventId)
    setAttributeIfExists(span, ATTR_GEN_AI_ITEM_ID, eventData.itemId)
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_TIMESTAMP, eventData.timestamp)
    setAttributeIfExists(span, ATTR_GEN_AI_CONTENT_INDEX, eventData.contentIndex)
    setAttributeIfExists(span, ATTR_GEN_AI_TRANSCRIPT_FULL, eventData.transcript)

    // Always mark these as from user
    span.setAttribute(ATTR_GEN_AI_TRANSCRIPT_SOURCE, "user") //REMOVE
    span.setAttribute(ATTR_GEN_AI_TRANSCRIPT_ROLE, "user")
}

/**
 * Process additional custom attributes
 */
function processCustomAttributes(span: Span, attributes: Record<string, any>): void {
    if (!attributes) return

    for (const [key, value] of Object.entries(attributes)) {
        setAttributeIfExists(span, key, value)
    }
}

/**
 * API endpoint to record OpenAI realtime telemetry from client-side events
 * This allows us to leverage server-side OpenTelemetry instrumentation
 * for events that occur in the browser
 */
/**
 * Batch processor for handling multiple telemetry events efficiently
 */
class BatchTelemetryProcessor {
    private events: Array<{ eventType: string; eventData: Record<string, any> }> = []
    private startTime: number
    private parentContext: Context

    constructor(parentContext: Context) {
        this.startTime = performance.now()
        this.parentContext = parentContext
    }

    /**
     * Add an event to the batch
     */
    addEvent(eventType: string, eventData: Record<string, any>) {
        this.events.push({ eventType, eventData })
    }

    /**
     * Process all events in the batch
     */
    process(): void {
        debug(`Processing batch of ${this.events.length} events`)

        // Create a parent span for the batch
        const batchSpan = tracer.startSpan(
            `gen_ai.realtime.batch`,
            {
                kind: SpanKind.SERVER,
                attributes: {
                    [ATTR_GEN_AI_OPERATION_NAME]: "realtime_batch",
                    [ATTR_GEN_AI_SYSTEM]: "openai",
                    "batch.size": this.events.length,
                },
            },
            this.parentContext,
        )

        const batchCtx = trace.setSpan(context.active(), batchSpan)

        // Process each event
        context.with(batchCtx, () => {
            this.events.forEach(({ eventType, eventData }) => {
                this.processEvent(eventType, eventData, batchCtx)
            })
        })

        // Record batch processing duration
        const durationSec = (performance.now() - this.startTime) / 1000
        genAiOperationDuration.record(durationSec, {
            [ATTR_GEN_AI_OPERATION_NAME]: "realtime_batch",
            [ATTR_GEN_AI_SYSTEM]: "openai",
            "batch.size": this.events.length,
        })

        batchSpan.end()
    }

    /**
     * Process a single event
     */
    private processEvent(eventType: string, eventData: Record<string, any>, parentCtx: Context): void {
        // Apply sampling if configured
        if (Math.random() > SAMPLING_RATE) {
            debug(`Sampling out event: ${eventType}`)
            return
        }

        const eventStartTime = performance.now()

        // Common attributes for all spans
        const commonAttrs: Attributes = {
            [ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [ATTR_GEN_AI_SYSTEM]: "openai",
            "telemetry.source": "client",
            "batch.processing": true,
        }

        // Create span based on event type
        const span = tracer.startSpan(
            `gen_ai.realtime.${eventType}`,
            {
                kind: SpanKind.SERVER,
                attributes: commonAttrs,
            },
            parentCtx,
        )

        // Create context with span
        const ctx: Context = trace.setSpan(context.active(), span)

        // Process event data using context
        context.with(ctx, () => {
            console.log(`context.with Processing event: ${eventType}`, eventData)

            // Process event data based on type
            switch (eventType) {
                case "token_usage":
                    processTokenUsage(span, eventData)
                    break

                case "tool_call":
                    processToolCall(span, eventData)
                    break

                case "realtime_fetch":
                    processRealtimeFetch(span, eventData)
                    break

                case "response_details":
                    processResponseDetails(span, eventData)
                    break

                case "full_transcript":
                    processFullTranscript(span, eventData)
                    break

                case "user_transcript":
                    processUserTranscript(span, eventData)
                    break

                default:
                    debug(`Unknown event type: ${eventType}`)
            }

            // Process any additional custom attributes
            processCustomAttributes(span, eventData.attributes)

            // Record processing duration
            span.setAttribute("processing.duration_ms", performance.now() - eventStartTime)
        })

        // Record operation duration metric
        const durationSec = (performance.now() - eventStartTime) / 1000
        genAiOperationDuration.record(durationSec, {
            [ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [ATTR_GEN_AI_SYSTEM]: "openai",
            event_type: eventType,
            ...(eventData.model ? { [ATTR_GEN_AI_RESPONSE_MODEL]: eventData.model } : {}),
        })

        // End the span
        span.end()
    }
}

/**
 * Validate required fields in event data
 */
function validateEventData(eventType: string, eventData: any): string | null {
    if (!eventData) {
        return "Missing eventData"
    }

    // If we receive an event with type property, extract it as the eventType
    if (eventData.type === "response.done" && eventType !== "response.done") {
        debug(`Converting event type from ${eventType} to response.done`)
        return validateEventData("response.done", eventData)
    }

    switch (eventType) {
        case "token_usage":
            debug("Validating token_usage event:", JSON.stringify(eventData, null, 2))
            // Check if we have basic token counts OR usage data in nested structure
            if (
                !eventData.totalTokens &&
                !eventData.inputTokens &&
                !eventData.outputTokens &&
                !(eventData.usage || eventData.response?.usage)
            ) {
                return "Token usage events require at least one token count or usage object"
            }

            // If data comes from response.done event with nested usage, extract it
            if (eventData.response?.usage && !eventData.totalTokens) {
                const usage = eventData.response.usage
                eventData.totalTokens = usage.total_tokens
                eventData.inputTokens = usage.input_tokens
                eventData.outputTokens = usage.output_tokens
                eventData.input_token_details = usage.input_token_details
                eventData.output_token_details = usage.output_token_details
            } else if (eventData.usage && !eventData.totalTokens) {
                const usage = eventData.usage
                eventData.totalTokens = usage.total_tokens
                eventData.inputTokens = usage.input_tokens
                eventData.outputTokens = usage.output_tokens
                eventData.input_token_details = usage.input_token_details
                eventData.output_token_details = usage.output_token_details
            }
            break

        case "tool_call":
            if (!eventData.toolName) {
                return "Tool call events require toolName"
            }
            break

        case "realtime_fetch":
            if (!eventData.url) {
                return "Realtime fetch events require url"
            }
            break

        case "full_transcript":
        case "user_transcript":
            if (!eventData.transcript) {
                return "Transcript events require transcript content"
            }
            break

        case "response.done":
            console.log("validateEventData", eventType, eventData)
            // Extract response data if this is a response.done event
            if (eventData.response) {
                // Extract token usage
                if (eventData.response.usage) {
                    const usage = eventData.response.usage
                    eventData.totalTokens = usage.total_tokens
                    eventData.inputTokens = usage.input_tokens
                    eventData.outputTokens = usage.output_tokens
                    eventData.input_token_details = usage.input_token_details
                    eventData.output_token_details = usage.output_token_details
                }

                // Extract response metadata
                eventData.responseId = eventData.response.id
                eventData.responseStatus = eventData.response.status
                eventData.conversationId = eventData.response.conversation_id
                eventData.model = eventData.response.model
                eventData.voice = eventData.response.voice
                eventData.outputAudioFormat = eventData.response.output_audio_format
                eventData.temperature = eventData.response.temperature
                eventData.maxOutputTokens = eventData.response.max_output_tokens
                eventData.modalities = eventData.response.modalities

                // Get the first output item if available
                if (eventData.response.output && eventData.response.output.length > 0) {
                    const output = eventData.response.output[0]
                    eventData.outputItemId = output.id
                    eventData.outputItemType = output.type
                    eventData.outputItemStatus = output.status
                    eventData.outputItemRole = output.role

                    // Extract transcript if available
                    if (output.content && output.content.length > 0 && output.content[0].transcript) {
                        eventData.transcript = output.content[0].transcript
                        eventData.hasTranscript = true
                    }
                }
            }
            break
    }

    return null
}

/**
 * Extract distributed tracing context from headers
 */
function extractTraceContext(req: NextRequest): Context {
    const carrier: Record<string, string> = {}

    // Extract tracing headers
    req.headers.forEach((value, key) => {
        if (
            key.toLowerCase().startsWith("traceparent") ||
            key.toLowerCase().startsWith("tracestate") ||
            key.toLowerCase().startsWith("baggage")
        ) {
            carrier[key] = value
        }
    })

    // Extract the context
    return propagation.extract(context.active(), carrier)
}

/**
 * API endpoint to record OpenAI realtime telemetry from client-side events
 * This allows us to leverage server-side OpenTelemetry instrumentation
 * for events that occur in the browser
 */
export async function POST(req: NextRequest) {
    const startTime = performance.now()

    try {
        // Extract distributed tracing context if available
        const parentContext = extractTraceContext(req)

        // Parse the request body
        const data = await req.json()

        // Handle batch or single event
        if (Array.isArray(data)) {
            debug(`Received batch of ${data.length} events`)

            // Validate batch structure
            if (data.length === 0) {
                throw new Error("Empty batch received")
            }

            const batchProcessor = new BatchTelemetryProcessor(parentContext)

            // Add each valid event to the batch
            for (const item of data) {
                const { eventType, eventData } = item

                if (!eventType) {
                    debug("Skipping item with missing eventType")
                    continue
                }

                const validationError = validateEventData(eventType, eventData)
                if (validationError) {
                    debug(`Skipping invalid event (${eventType}): ${validationError}`)
                    continue
                }

                batchProcessor.addEvent(eventType, eventData)
            }

            // Process the batch
            batchProcessor.process()

            return NextResponse.json({
                success: true,
                message: `Processed batch of ${data.length} telemetry events`,
            })
        } else {
            // Handle single event
            const { eventType, eventData } = data

            if (!eventType) {
                throw new Error("Missing required eventType parameter")
            }

            // Validate event data
            const validationError = validateEventData(eventType, eventData)
            if (validationError) {
                throw new Error(`Invalid event data: ${validationError}`)
            }

            // Apply sampling if configured
            if (Math.random() > SAMPLING_RATE) {
                debug(`Sampling out event: ${eventType}`)
                return NextResponse.json({
                    success: true,
                    message: `Event sampled out (sampling rate: ${SAMPLING_RATE})`,
                })
            }

            debug(`Processing single event: ${eventType}`)

            // Common attributes for all spans
            const commonAttrs: Attributes = {
                [ATTR_GEN_AI_OPERATION_NAME]: "realtime",
                [ATTR_GEN_AI_SYSTEM]: "openai",
                "telemetry.source": "client",
            }

            // Create span based on event type
            const span = tracer.startSpan(
                `gen_ai.realtime.${eventType}`,
                {
                    kind: SpanKind.SERVER,
                    attributes: commonAttrs,
                },
                parentContext,
            )

            // Create context with span
            const ctx: Context = trace.setSpan(context.active(), span)

            // Process event data using context
            context.with(ctx, () => {
                // Process event data based on type
                switch (eventType) {
                    case "token_usage":
                        processTokenUsage(span, eventData)
                        break

                    case "tool_call":
                        processToolCall(span, eventData)
                        break

                    case "realtime_fetch":
                        processRealtimeFetch(span, eventData)
                        break

                    case "response_details":
                        processResponseDetails(span, eventData)
                        break

                    case "full_transcript":
                        processFullTranscript(span, eventData)
                        break

                    case "user_transcript":
                        processUserTranscript(span, eventData)
                        break

                    case "response.done":
                        // Process token usage first
                        processTokenUsage(span, eventData)
                        // Then process response details
                        processResponseDetails(span, eventData)
                        break

                    default:
                        debug(`Unknown event type: ${eventType}`)
                }

                // Process any additional custom attributes
                processCustomAttributes(span, eventData.attributes)

                // Record processing duration
                span.setAttribute("processing.duration_ms", performance.now() - startTime)
            })

            // Record operation duration metric
            const durationSec = (performance.now() - startTime) / 1000
            genAiOperationDuration.record(durationSec, {
                [ATTR_GEN_AI_OPERATION_NAME]: "realtime",
                [ATTR_GEN_AI_SYSTEM]: "openai",
                event_type: eventType,
                ...(eventData.model ? { [ATTR_GEN_AI_RESPONSE_MODEL]: eventData.model } : {}),
            })

            // End the span
            span.end()

            return NextResponse.json({
                success: true,
                message: `Telemetry recorded for ${eventType}`,
            })
        }
    } catch (error) {
        debug("Error processing telemetry:", error)

        const endTime = performance.now()
        const durationSec = (endTime - startTime) / 1000

        // Create error span if needed
        const errorSpan = tracer.startSpan("gen_ai.realtime.error", {
            kind: SpanKind.SERVER,
            attributes: {
                [ATTR_GEN_AI_OPERATION_NAME]: "realtime_error",
                [ATTR_GEN_AI_SYSTEM]: "openai",
                "error.type": error instanceof Error ? error.constructor.name : "UnknownError",
                "error.message": error instanceof Error ? error.message : String(error),
                "processing.duration_ms": endTime - startTime,
            },
        })

        errorSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
        })

        // Record error in metrics
        genAiOperationDuration.record(durationSec, {
            [ATTR_GEN_AI_OPERATION_NAME]: "realtime_error",
            [ATTR_GEN_AI_SYSTEM]: "openai",
            "error.type": error instanceof Error ? error.constructor.name : "UnknownError",
        })

        // Log the error using the logger API (similar to instrumentation.ts)
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorType = error instanceof Error ? error.constructor.name : "UnknownError"

        // End the span
        errorSpan.end()

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                errorType,
            },
            { status: 500 },
        )
    }
}
