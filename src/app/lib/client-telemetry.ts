/**
 * Client-side telemetry utility
 *
 * This module provides functions to directly instrument frontend operations with Elastic APM RUM,
 * creating transactions and spans following the OpenTelemetry semantic conventions.
 */

import { TokenUsage } from "../types"
import * as semconv from "./semconv"
import { startTransaction, captureError } from "./apm-rum"
/**
 * Records token usage metrics from OpenAI response.done events
 */
export async function recordTokenUsage(usageData: TokenUsage, model?: string) {
    try {
        // Start a transaction for token usage
        const transaction = startTransaction("gen_ai.token_usage", "metrics")
        if (!transaction) return

        // Set attributes
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [semconv.ATTR_GEN_AI_TOTAL_TOKENS]: usageData.total_tokens,
            [semconv.ATTR_GEN_AI_USAGE_INPUT_TOKENS]: usageData.input_tokens,
            [semconv.ATTR_GEN_AI_USAGE_OUTPUT_TOKENS]: usageData.output_tokens,
            [semconv.ATTR_GEN_AI_RESPONSE_MODEL]: model || "unknown",
        })

        // Add input token details if available
        if (usageData.input_token_details) {
            transaction.addLabels({
                [semconv.ATTR_GEN_AI_INPUT_TEXT_TOKENS]: usageData.input_token_details.text_tokens,
                [semconv.ATTR_GEN_AI_INPUT_AUDIO_TOKENS]: usageData.input_token_details.audio_tokens,
            })

            // Add cached tokens information
            if (usageData.input_token_details.cached_tokens) {
                transaction.addLabels({
                    [semconv.ATTR_GEN_AI_CACHED_TOKENS]: usageData.input_token_details.cached_tokens,
                })

                // Add cached tokens details if available
                if (usageData.input_token_details.cached_tokens_details) {
                    transaction.addLabels({
                        [semconv.ATTR_GEN_AI_CACHED_TEXT_TOKENS]:
                            usageData.input_token_details.cached_tokens_details.text_tokens,
                        [semconv.ATTR_GEN_AI_CACHED_AUDIO_TOKENS]:
                            usageData.input_token_details.cached_tokens_details.audio_tokens,
                    })
                }
            }
        }

        // Add output token details if available
        if (usageData.output_token_details) {
            transaction.addLabels({
                [semconv.ATTR_GEN_AI_OUTPUT_TEXT_TOKENS]: usageData.output_token_details.text_tokens,
                [semconv.ATTR_GEN_AI_OUTPUT_AUDIO_TOKENS]: usageData.output_token_details.audio_tokens,
            })
        }

        // End the transaction as soon as work is done
        transaction.end()
    } catch (error) {
        console.error("Error recording token usage:", error)
        captureError(error instanceof Error ? error : String(error), { tags: { source: "client-telemetry" } })
    }
}

/**
 * Records detailed information from response.done events
 */
export async function recordResponseDoneDetails(responseData: any) {
    try {
        // Start a transaction for response details
        const transaction = startTransaction("gen_ai.response_details", "app")
        if (!transaction) return

        const output = responseData.output?.[0] || {}
        const content = output.content || []

        // Find audio content with transcript if it exists
        const audioContent = content.find((c: any) => c.type === "audio" && c.transcript)
        const transcript = audioContent?.transcript || ""

        // Get first few characters of transcript for logging
        const transcriptPreview =
            transcript.length > 0 ? transcript.substring(0, 150) + (transcript.length > 150 ? "..." : "") : ""

        // Set attributes using semantic conventions
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [semconv.ATTR_GEN_AI_RESPONSE_ID]: responseData.id,
            [semconv.ATTR_GEN_AI_RESPONSE_STATUS]: responseData.status,
            [semconv.ATTR_GEN_AI_CONVERSATION_ID]: responseData.conversation_id,
            [semconv.ATTR_GEN_AI_VOICE]: responseData.voice,
            [semconv.ATTR_GEN_AI_OUTPUT_AUDIO_FORMAT]: responseData.output_audio_format,
            [semconv.ATTR_GEN_AI_TEMPERATURE]: responseData.temperature,
            [semconv.ATTR_GEN_AI_MAX_OUTPUT_TOKENS]: responseData.max_output_tokens,
            [semconv.ATTR_GEN_AI_OUTPUT_ITEM_ID]: output.id,
            [semconv.ATTR_GEN_AI_OUTPUT_ITEM_TYPE]: output.type,
            [semconv.ATTR_GEN_AI_OUTPUT_ITEM_STATUS]: output.status,
            [semconv.ATTR_GEN_AI_OUTPUT_ITEM_ROLE]: output.role,
            [semconv.ATTR_GEN_AI_HAS_AUDIO_CONTENT]: content.some((c: any) => c.type === "audio"),
            [semconv.ATTR_GEN_AI_HAS_TRANSCRIPT]: !!transcriptPreview,
            [semconv.ATTR_GEN_AI_TRANSCRIPT_LENGTH]: transcript.length,
        })

        // For array values like modalities and content types, convert to comma-separated strings
        if (responseData.modalities) {
            transaction.addLabels({
                [semconv.ATTR_GEN_AI_MODALITIES]: responseData.modalities.join(","),
            })
        }

        if (content.length > 0) {
            transaction.addLabels({
                [semconv.ATTR_GEN_AI_CONTENT_TYPES]: content.map((c: any) => c.type).join(","),
            })
        }

        // End the transaction
        transaction.end()
    } catch (error) {
        console.error("Error recording response details:", error)
        window.elasticApm?.captureError(error instanceof Error ? error : String(error))
    }
}

/**
 * Records tool call telemetry
 */
export async function recordToolCall(toolName: string, success: boolean, resultCount?: number, error?: any) {
    try {
        // Start a transaction for tool call
        const transaction = window.elasticApm?.startTransaction("gen_ai.tool_call", "app")
        if (!transaction) return

        // Add semantic convention labels
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [semconv.ATTR_GEN_AI_TOOL_CALLED]: true,
            [semconv.ATTR_GEN_AI_TOOL_NAME]: toolName,
            [semconv.ATTR_GEN_AI_TOOL_SUCCESS]: success,
            ...(resultCount !== undefined ? { [semconv.ATTR_GEN_AI_TOOL_RESULT_COUNT]: resultCount } : {}),
        })

        // If there's an error, capture it
        if (error) {
            transaction.addLabels({
                [semconv.ATTR_GEN_AI_TOOL_ERROR]: error,
            })
            window.elasticApm?.captureError(error instanceof Error ? error : String(error))
        }

        // End the transaction
        transaction.end()
    } catch (error) {
        console.error("Error recording tool call:", error)
        window.elasticApm?.captureError(error instanceof Error ? error : String(error))
    }
}

/**
 * Records OpenAI realtime API fetch calls
 */
export async function recordRealtimeFetch(
    url: string,
    method: string,
    statusCode?: number,
    error?: any,
    model?: string,
) {
    try {
        // Start a transaction for realtime fetch
        const transaction = window.elasticApm?.startTransaction("gen_ai.realtime_fetch", "external")
        if (!transaction) return

        // Add labels with semantic conventions
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            "http.url": url,
            "http.method": method,
            ...(statusCode ? { "http.status_code": statusCode } : {}),
            ...(model ? { [semconv.ATTR_GEN_AI_RESPONSE_MODEL]: model } : {}),
        })

        // If there's an error, capture it
        if (error) {
            window.elasticApm?.captureError(error instanceof Error ? error : String(error))
        }

        // End the transaction
        transaction.end()
    } catch (error) {
        console.error("Error recording realtime fetch:", error)
        window.elasticApm?.captureError(error instanceof Error ? error : String(error))
    }
}

/**
 * Records server event telemetry
 */
export async function recordServerEvent(eventType: string, eventData: any) {
    try {
        // Start a transaction for server event
        const transaction = window.elasticApm?.startTransaction("gen_ai.server_event", "app")
        if (!transaction) return

        // Add event data as labels following semantic conventions
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [semconv.ATTR_GEN_AI_EVENT_TYPE]: eventType,
            ...(eventData.agent ? { agent: eventData.agent } : {}),
            ...(eventData.itemType ? { "item.type": eventData.itemType } : {}),
            ...(eventData.itemRole ? { "item.role": eventData.itemRole } : {}),
        })

        // End the transaction
        transaction.end()
    } catch (error) {
        console.error("Error recording server event:", error)
        window.elasticApm?.captureError(error instanceof Error ? error : String(error))
    }
}

/**
 * Records the full transcript from a completed response for archival purposes
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

        // Start a transaction for full transcript
        const transaction = window.elasticApm?.startTransaction("gen_ai.full_transcript", "app")
        if (!transaction) return

        // Add labels following semantic conventions
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [semconv.ATTR_GEN_AI_RESPONSE_ID]: responseData.id,
            [semconv.ATTR_GEN_AI_OUTPUT_ITEM_ID]: output.id,
            [semconv.ATTR_GEN_AI_TRANSCRIPT_TIMESTAMP]: Date.now(),
            [semconv.ATTR_GEN_AI_TRANSCRIPT_LENGTH]: transcript.length,
            [semconv.ATTR_GEN_AI_TRANSCRIPT_ROLE]: "assistant",
            [semconv.ATTR_GEN_AI_TRANSCRIPT_SOURCE]: "assistant",
            [semconv.ATTR_GEN_AI_RESPONSE_STATUS]: responseData.status,
            [semconv.ATTR_GEN_AI_CONVERSATION_ID]: responseData.conversation_id,
        })

        // End the transaction
        transaction.end()
    } catch (error) {
        console.error("Error recording full transcript:", error)
        window.elasticApm?.captureError(error instanceof Error ? error : String(error))
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

        // Start a transaction for user transcript
        const transaction = window.elasticApm?.startTransaction("gen_ai.user_transcript", "app")
        if (!transaction) return

        // Add labels following semantic conventions
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
            [semconv.ATTR_GEN_AI_EVENT_ID]: event.event_id,
            [semconv.ATTR_GEN_AI_ITEM_ID]: event.item_id,
            [semconv.ATTR_GEN_AI_TRANSCRIPT_TIMESTAMP]: Date.now(),
            [semconv.ATTR_GEN_AI_TRANSCRIPT_LENGTH]: transcript.length,
            [semconv.ATTR_GEN_AI_CONTENT_INDEX]: event.content_index,
            [semconv.ATTR_GEN_AI_TRANSCRIPT_ROLE]: "user",
            [semconv.ATTR_GEN_AI_TRANSCRIPT_SOURCE]: "user",
        })

        // End the transaction
        transaction.end()
    } catch (error) {
        console.error("Error recording user transcript:", error)
        window.elasticApm?.captureError(error instanceof Error ? error : String(error))
    }
}

/**
 * Records a complete response.done event directly, including token usage and all metadata
 */
export async function recordCompleteDoneEvent(eventData: any) {
    try {
        // Start a parent transaction for the complete event
        const transaction = window.elasticApm?.startTransaction("gen_ai.response.done", "app")
        if (!transaction) return

        // Add common labels
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime",
        })

        // First, extract and record token usage as span
        if (eventData.response?.usage) {
            const tokenUsageSpan = transaction.startSpan("gen_ai.token_usage", "metrics")
            if (tokenUsageSpan) {
                const usage = eventData.response.usage
                tokenUsageSpan.addLabels({
                    [semconv.ATTR_GEN_AI_TOTAL_TOKENS]: usage.total_tokens,
                    [semconv.ATTR_GEN_AI_USAGE_INPUT_TOKENS]: usage.input_tokens,
                    [semconv.ATTR_GEN_AI_USAGE_OUTPUT_TOKENS]: usage.output_tokens,
                    [semconv.ATTR_GEN_AI_RESPONSE_MODEL]: eventData.response.model || "unknown",
                })
                tokenUsageSpan.end()
            }
        }

        // Second, record response details as a span
        if (eventData.response) {
            const responseDetailsSpan = transaction.startSpan("gen_ai.response_details", "app")
            if (responseDetailsSpan) {
                const output = eventData.response.output?.[0] || {}

                responseDetailsSpan.addLabels({
                    [semconv.ATTR_GEN_AI_RESPONSE_ID]: eventData.response.id,
                    [semconv.ATTR_GEN_AI_CONVERSATION_ID]: eventData.response.conversation_id,
                    [semconv.ATTR_GEN_AI_RESPONSE_MODEL]: eventData.response.model,
                    [semconv.ATTR_GEN_AI_RESPONSE_STATUS]: eventData.response.status,
                    [semconv.ATTR_GEN_AI_OUTPUT_ITEM_ID]: output.id,
                })
                responseDetailsSpan.end()
            }
        }

        // End the parent transaction
        transaction.end()

        // Extract and record token usage separately for backward compatibility
        if (eventData.response?.usage) {
            await recordTokenUsage(eventData.response.usage, eventData.response.model)
        }

        // Record response details separately for backward compatibility
        if (eventData.response) {
            await recordResponseDoneDetails(eventData.response)
        }
    } catch (error) {
        console.error("Error recording complete done event:", error)
        window.elasticApm?.captureError(error instanceof Error ? error : String(error))
    }
}
