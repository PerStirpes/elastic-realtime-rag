import { NextResponse } from "next/server"
import { trace, SpanKind, SpanStatusCode } from "@opentelemetry/api"
// Define the attributes locally to avoid import issues
const ATTR_GEN_AI_OPERATION_NAME = "gen_ai.operation.name"
const ATTR_GEN_AI_SYSTEM = "gen_ai.system"
const ATTR_GEN_AI_REQUEST_MODEL = "gen_ai.request.model"

// Get a tracer instance
const tracer = trace.getTracer("openai-realtime-server")

export async function GET() {
    // Create a span for the session creation
    const span = tracer.startSpan("openai.realtime.session.create", {
        kind: SpanKind.CLIENT,
        attributes: {
            [ATTR_GEN_AI_OPERATION_NAME]: "session_create",
            [ATTR_GEN_AI_SYSTEM]: "openai",
            [ATTR_GEN_AI_REQUEST_MODEL]: "gpt-4o-mini-realtime-preview",
            "http.method": "POST",
            "http.url": "https://api.openai.com/v1/realtime/sessions",
        },
    })

    try {
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-realtime-preview",
                // voice: "verse",
            }),
        })

        // Add response code to span
        span.setAttribute("http.status_code", response.status)

        if (!response.ok) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `HTTP error ${response.status}: ${response.statusText}`,
            })
        }

        const data = await response.json()

        // Add session ID if available
        if (data?.client_secret?.value) {
            span.setAttribute("genai.session.token_available", true)
        }

        span.end()

        return NextResponse.json(data)
    } catch (error) {
        console.error("Error in /session:", error)

        // Record error in span
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
        })

        if (error instanceof Error) {
            span.recordException(error)
        }

        span.end()

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
