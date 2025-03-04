/**
 * Client-side telemetry utility
 *
 * This module provides functions to send telemetry data to the server-side
 * OpenTelemetry instrumentation. It acts as a bridge between client-side events
 * and the server-side tracing infrastructure.
 */

/**
 * Records token usage metrics from OpenAI response.done events
 */
export async function recordTokenUsage(usageData: any, model?: string) {
    try {
        const payload = {
            eventType: "token_usage",
            eventData: {
                totalTokens: usageData.total_tokens,
                inputTokens: usageData.input_tokens,
                outputTokens: usageData.output_tokens,
                model: model || "unknown",
                // Add detailed breakdowns if available
                inputTextTokens: usageData.input_token_details?.text_tokens,
                inputAudioTokens: usageData.input_token_details?.audio_tokens,
                outputTextTokens: usageData.output_token_details?.text_tokens,
                outputAudioTokens: usageData.output_token_details?.audio_tokens,
            },
        }

        await sendTelemetry(payload)
    } catch (error) {
        console.error("Error recording token usage:", error)
    }
}

/**
 * Records detailed information from response.done events
 */
export async function recordResponseDoneDetails(responseData: any) {
    try {
        const output = responseData.output?.[0] || {}
        const content = output.content || []

        // Find audio content with transcript if it exists
        const audioContent = content.find((c: any) => c.type === "audio" && c.transcript)
        const transcript = audioContent?.transcript || ""

        // Get first few characters of transcript for logging (to avoid storing very large responses)
        const transcriptPreview =
            transcript.length > 0 ? transcript.substring(0, 150) + (transcript.length > 150 ? "..." : "") : ""

        const payload = {
            eventType: "response_details",
            eventData: {
                // Top-level response metadata
                responseId: responseData.id,
                responseStatus: responseData.status,
                statusDetails: responseData.status_details,
                conversationId: responseData.conversation_id,

                // Modalities and voice details
                modalities: responseData.modalities,
                voice: responseData.voice,
                outputAudioFormat: responseData.output_audio_format,

                // Configuration parameters
                temperature: responseData.temperature,
                maxOutputTokens: responseData.max_output_tokens,

                // Output details
                outputItemId: output.id,
                outputItemType: output.type,
                outputItemStatus: output.status,
                outputItemRole: output.role,

                // Content details
                hasAudioContent: content.some((c: any) => c.type === "audio"),
                contentTypes: content.map((c: any) => c.type),

                // Transcript information (truncated preview)
                hasTranscript: !!transcriptPreview,
                transcriptPreview: transcriptPreview,
                transcriptLength: transcript.length,

                // Usage details are handled separately via recordTokenUsage
                hasUsage: !!responseData.usage,
            },
        }

        await sendTelemetry(payload)
    } catch (error) {
        console.error("Error recording response details:", error)
    }
}

/**
 * Records tool call telemetry
 */
export async function recordToolCall(toolName: string, success: boolean, resultCount?: number, error?: string) {
    try {
        const payload = {
            eventType: "tool_call",
            eventData: {
                toolName,
                success,
                resultCount,
                error,
                timestamp: Date.now(),
            },
        }

        await sendTelemetry(payload)
    } catch (error) {
        console.error("Error recording tool call:", error)
    }
}

/**
 * Records OpenAI realtime API fetch calls
 */
export async function recordRealtimeFetch(
    url: string,
    method: string,
    statusCode?: number,
    error?: string,
    model?: string,
) {
    try {
        const payload = {
            eventType: "realtime_fetch",
            eventData: {
                url,
                method,
                statusCode,
                error,
                model,
                timestamp: Date.now(),
            },
        }

        await sendTelemetry(payload)
    } catch (error) {
        console.error("Error recording realtime fetch:", error)
    }
}

/**
 * Records server event telemetry
 */
export async function recordServerEvent(eventType: string, eventData: any) {
    try {
        const payload = {
            eventType: "server_event",
            eventData: {
                serverEventType: eventType,
                ...eventData,
                timestamp: Date.now(),
            },
        }

        await sendTelemetry(payload)
    } catch (error) {
        console.error("Error recording server event:", error)
    }
}

/**
 * Records the full transcript from a completed response for archival purposes
 * This should be used selectively, as it can generate large amounts of data
 */
export async function recordFullTranscript(responseData: any) {
    try {
        const output = responseData.output?.[0] || {}
        const content = output.content || []

        // Find audio content with transcript
        const audioContent = content.find((c: any) => c.type === "audio" && c.transcript)
        const transcript = audioContent?.transcript || ""

        // Only proceed if we actually have a transcript
        if (!transcript) {
            return
        }

        const payload = {
            eventType: "full_transcript",
            eventData: {
                responseId: responseData.id,
                outputItemId: output.id,
                timestamp: Date.now(),
                transcript: transcript,
                // Include minimal context with full transcript
                role: "assistant", // Explicitly mark as from assistant
                transcriptSource: "assistant",
                status: responseData.status,
                conversationId: responseData.conversation_id,
            },
        }

        await sendTelemetry(payload)
    } catch (error) {
        console.error("Error recording full transcript:", error)
    }
}

/**
 * Records user audio transcription from input_audio_transcription.completed events
 */
export async function recordUserTranscript(event: any) {
    try {
        const transcript = event.transcript || ""

        // Only proceed if we actually have a transcript
        if (!transcript || transcript === "\n") {
            return
        }

        const payload = {
            eventType: "user_transcript",
            eventData: {
                eventId: event.event_id,
                itemId: event.item_id,
                timestamp: Date.now(),
                transcript: transcript,
                contentIndex: event.content_index,
                // Explicitly mark as from user
                role: "user",
                transcriptSource: "user",
            },
        }

        await sendTelemetry(payload)
    } catch (error) {
        console.error("Error recording user transcript:", error)
    }
}

/**
 * Sends telemetry data to the server endpoint
 */
async function sendTelemetry(payload: any) {
    try {
        const response = await fetch("/api/telemetry", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            console.error("Telemetry submission failed:", await response.text())
        }
    } catch (error) {
        console.error("Failed to send telemetry:", error)
    }
}
