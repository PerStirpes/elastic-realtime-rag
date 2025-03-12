"use client"

import { ServerEvent, FunctionCallParams, UseHandleServerEventParams, TranscriptItem } from "@/app/types"
import { useTranscript } from "@/app/contexts/TranscriptContext"
import { useEvent } from "@/app/contexts/EventContext"
import { useRef } from "react"
import {
    recordServerEvent,
    recordTokenUsage,
    recordToolCall,
    recordResponseDoneDetails,
    recordFullTranscript,
    recordUserTranscript,
} from "@/app/lib/client-telemetry"
import { captureError } from "../lib/apm-rum"

/**
 * Custom hook to handle server events from the WebRTC data channel
 *
 * This hook processes various event types including:
 * - Session management events
 * - Conversation message events
 * - Audio buffer management
 * - Function/tool calls from the AI
 *
 * @returns A ref to the event handler function that maintains reference stability
 */
export function useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
}: UseHandleServerEventParams) {
    // Access to transcript state and methods
    const {
        transcriptItems,
        addTranscriptBreadcrumb,
        addTranscriptMessage,
        updateTranscriptMessage,
        updateTranscriptItemStatus,
    } = useTranscript()

    // Access to event logging
    const { logServerEvent } = useEvent()

    // Ref to track active audio buffers
    const outputAudioBuffersRef = useRef<string[]>([])

    /**
     * Cancel ongoing assistant speech
     *
     * This is used when a user interrupts the AI with new input
     */
    const cancelAssistantSpeech = async () => {
        // Find the most recent assistant message
        const mostRecentAssistantMessage = [...transcriptItems].reverse().find((item) => item.role === "assistant")

        // Early return if no message or already complete
        if (!mostRecentAssistantMessage) {
            console.warn("Can't cancel: no recent assistant message found")
            return
        }

        if (mostRecentAssistantMessage.status === "DONE") {
            console.log("No cancellation needed: message already complete")
            return
        }

        try {
            // Only attempt to cancel if there are active audio buffers
            if (outputAudioBuffersRef.current.length > 0) {
                // Step 1: Truncate the message content
                sendClientEvent({
                    type: "conversation.item.truncate",
                    item_id: mostRecentAssistantMessage.itemId,
                    content_index: 0,
                    audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
                })

                // Step 2: Cancel the response (after a short delay to ensure proper sequencing)
                setTimeout(() => {
                    sendClientEvent({ type: "response.cancel" }, "(cancel due to user interruption)")
                }, 50)
            } else {
                console.log("No active audio buffers to cancel")
            }
        } catch (error) {
            captureError(`Error in cancelAssistantSpeech ${error}`)
            console.warn("Error in cancelAssistantSpeech:", error)
        }
    }

    /**
     * Handle tool execution error
     */
    const handleFunctionError = (error: any, callId?: string, name?: string) => {
        console.error("Function call error:", error)
        captureError(`Function call error: ${error}`)
        addTranscriptBreadcrumb(`Error during function call: ${name}`, { error })

        // Record tool call failure
        if (name) {
            recordToolCall(name, false, undefined, error instanceof Error ? error.message : String(error))
        }

        sendClientEvent({
            type: "conversation.item.create",
            item: {
                type: "function_call_error",
                call_id: callId,
                output: JSON.stringify({
                    error: "Function call failed",
                    details: (error as Error).message,
                }),
            },
        })

        sendClientEvent({ type: "response.create" })
    }

    /**
     * Process standard agent tool calls
     */
    const executeAgentTool = async (
        fn: (args: any, transcriptLogsFiltered: TranscriptItem[]) => Promise<any> | any,
        args: any,
        name: string,
        callId?: string,
    ) => {
        try {
            // Execute the function and get result
            const result = await fn(args, transcriptItems)

            // Log the result to transcript
            addTranscriptBreadcrumb(`Function result: ${name}`, result)

            // Record telemetry for tool call
            const resultCount =
                result?.result?.hits?.hits?.length || (Array.isArray(result?.result) ? result.result.length : undefined)

            // Send telemetry
            recordToolCall(
                name,
                !result.error,
                resultCount,
                result.error
                    ? typeof result.error === "string"
                        ? result.error
                        : JSON.stringify(result.error)
                    : undefined,
            )

            // Send result back to AI
            sendClientEvent({
                type: "conversation.item.create",
                item: {
                    type: "function_call_output",
                    call_id: callId,
                    output: JSON.stringify(result),
                },
            })

            // Trigger AI to continue processing
            sendClientEvent({ type: "response.create" })
        } catch (error) {
            captureError(`Error in executeAgentTool ${error}`)
            handleFunctionError(error, callId, name)
        }
    }

    /**
     * Handle agent transfer requests
     */
    const handleAgentTransfer = (args: any, callId?: string) => {
        console.log("[TRANSFER] Args received:", args)
        const destinationAgent = args.destination_agent
        console.log(`[TRANSFER] Request to transfer to agent: ${destinationAgent}`)
        //todo find the bug and squash it
        const conversationContext = args.conversation_context
        // Log transfer request
        console.log(`[TRANSFER] Request to transfer to agent: ${destinationAgent}`)

        // Find the requested agent config
        const newAgentConfig = selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null

        // Perform the transfer if agent exists
        const transferSuccessful = !!newAgentConfig
        if (transferSuccessful) {
            console.log(`[TRANSFER] Found destination agent config: ${destinationAgent}`)

            // Log current state before transfer
            console.log(`[TRANSFER] Current agent: ${selectedAgentName}`)

            // Store current agent for verification
            const previousAgent = selectedAgentName

            // Execute transfer
            setSelectedAgentName(destinationAgent)
            console.log(`[TRANSFER] Transfer executed to: ${destinationAgent}`)

            // Use setTimeout to verify the transfer completed
            setTimeout(() => {
                // This will run after React state updates have been processed
                console.log(`[TRANSFER] Verification - Previous: ${previousAgent}, Current: ${selectedAgentName}`)

                const verifiedSuccess = selectedAgentName === destinationAgent
                console.log(`[TRANSFER] Verification ${verifiedSuccess ? "SUCCESS" : "FAILED"}`)

                // Trigger session update to configure the new agent's tools and settings
                if (verifiedSuccess) {
                    sendClientEvent(
                        {
                            type: "session.update.after.transfer",
                            agent: destinationAgent,
                            conversation_context: conversationContext,
                        },
                        "Trigger session update after transfer",
                    )
                }

                // Send result back to AI with verified status
                const transferResult = {
                    destination_agent: destinationAgent,
                    did_transfer: verifiedSuccess,
                    conversation_context: conversationContext,
                    verified: true,
                }

                addTranscriptBreadcrumb(`Transfer to ${destinationAgent}`, transferResult)

                sendClientEvent({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: callId,
                        output: JSON.stringify(transferResult),
                    },
                })
            }, 100) // Small delay to allow React state to update

            return // Early return to prevent immediate response
        } else {
            captureError(`Error in handleAgentTransfer destinationAgent${JSON.stringify(args, null, 2)}`)
            console.error(`[TRANSFER] FAILED - destination agent not found: ${destinationAgent}`)

            console.log(`[TRANSFER] Available agents: ${selectedAgentConfigSet?.map((a) => a.name).join(", ")}`)
            window.alert(
                `There's an issue with OpenAI Realtime API right now,😩 Please use the select menu in the top corner to change between agents. OR a page refresh might fix things 😎`,
            )
            // Prepare failure response
            const transferResult = {
                destination_agent: destinationAgent,
                did_transfer: false,
                reason: "Agent not found",
            }

            addTranscriptBreadcrumb(`Transfer to ${destinationAgent} failed`, transferResult)

            sendClientEvent({
                type: "conversation.item.create",
                item: {
                    type: "function_call_output",
                    call_id: callId,
                    output: JSON.stringify(transferResult),
                },
            })
        }
    }

    /**
     * Process function calls from the AI
     */
    const handleFunctionCall = async (params: FunctionCallParams) => {
        // Start a transaction for the function call
        const transaction = window.elasticApm?.startTransaction(`gen_ai.tool.${params.name}`, "app.tool")
        const { name, call_id, arguments: argsString } = params
        let args: any

        if (transaction) {
            transaction.addLabels({
                "gen_ai.system": "openai",
                "gen_ai.operation.name": "realtime",
                "gen_ai.tool.name": name,
                "gen_ai.tool.called": true,
                "gen_ai.tool.call_id": call_id || "",
            })
        }

        console.log("params", params)

        try {
            // Step 1: Parse the function arguments with span
            const parseSpan = transaction?.startSpan("gen_ai.tool.parse_args", "app")
            try {
                args = JSON.parse(argsString)
                addTranscriptBreadcrumb(`Function call: ${name}`, args)

                if (parseSpan) {
                    parseSpan.addLabels({
                        "gen_ai.tool.args_length": argsString.length,
                        "gen_ai.tool.args_count": Object.keys(args).length,
                    })
                }
            } catch (parseError) {
                // Handle JSON parsing errors
                console.error("JSON Parse Error:", parseError, "Raw JSON:", argsString)
                captureError(parseError instanceof Error ? parseError : String(parseError), {
                    custom: {
                        rawJson: argsString.substring(0, 1000), // Limit size for APM
                        toolName: name,
                        callId: call_id,
                    },
                })

                if (parseSpan) {
                    parseSpan.addLabels({
                        error: parseError instanceof Error ? parseError.message : String(parseError),
                        "error.type": "json_parse_error",
                    })
                }

                if (transaction) {
                    transaction.addLabels({
                        "gen_ai.tool.success": false,
                        "error.type": "json_parse_error",
                    })
                }

                addTranscriptBreadcrumb(`Error parsing arguments for function: ${name}`, {
                    error: parseError,
                })

                sendClientEvent({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_error",
                        call_id,
                        output: JSON.stringify({
                            error: "Invalid JSON provided",
                            details: (parseError as Error).message,
                        }),
                    },
                })

                sendClientEvent({ type: "response.create" })
                parseSpan?.end()
                transaction?.end()
                return
            } finally {
                parseSpan?.end()
            }

            // Step 2: Execute the appropriate function
            const execSpan = transaction?.startSpan("gen_ai.tool.execute", "app")
            try {
                const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName)

                if (currentAgent?.toolLogic?.[name]) {
                    // Add current agent context to span
                    if (execSpan) {
                        execSpan.addLabels({
                            "agent.name": selectedAgentName || "",
                            "gen_ai.tool.type": "agent_specific",
                        })
                    }

                    // Execute agent-specific tool
                    const fn = currentAgent.toolLogic[name]
                    await executeAgentTool(fn, args, name, call_id)
                } else if (name === "transferAgents") {
                    // Add transfer context to span
                    if (execSpan) {
                        execSpan.addLabels({
                            "gen_ai.tool.type": "transfer",
                            "transfer.destination": args.destination_agent || "",
                        })
                    }

                    // Handle agent transfer requests
                    handleAgentTransfer(args, call_id)
                } else {
                    // Add fallback context to span
                    if (execSpan) {
                        execSpan.addLabels({
                            "gen_ai.tool.type": "fallback",
                            "gen_ai.tool.unknown": true,
                        })
                    }

                    // Fallback for unknown functions
                    console.warn(`Unknown function called: ${name}`)

                    const simulatedResult = { result: true }
                    addTranscriptBreadcrumb(`Function fallback: ${name}`, simulatedResult)

                    sendClientEvent({
                        type: "conversation.item.create",
                        item: {
                            type: "function_call_output",
                            call_id,
                            output: JSON.stringify(simulatedResult),
                        },
                    })

                    sendClientEvent({ type: "response.create" })
                }

                // Mark as successful in transaction
                if (transaction) {
                    transaction.addLabels({
                        "gen_ai.tool.success": true,
                    })
                }
            } catch (error) {
                // Handle any other execution errors
                if (execSpan) {
                    execSpan.addLabels({
                        error: error instanceof Error ? error.message : String(error),
                        "error.type": "execution_error",
                    })
                }

                if (transaction) {
                    transaction.addLabels({
                        "gen_ai.tool.success": false,
                        "error.type": "execution_error",
                    })
                }

                handleFunctionError(error, call_id, name)
                captureError(`Error in handleFunctionCall: ${error}`)
            } finally {
                execSpan?.end()
            }
        } catch (error) {
            // Handle any unexpected errors
            if (transaction) {
                transaction.addLabels({
                    "gen_ai.tool.success": false,
                    error: error instanceof Error ? error.message : String(error),
                    "error.type": "unexpected_error",
                })
            }

            captureError(`Unexpected error in handleFunctionCall: ${error}`)
            console.error("Unexpected error handling function call:", error)
        } finally {
            // Always end the transaction
            transaction?.end()
        }
    }

    /**
     * Handle session management events
     */
    const handleSessionEvent = (event: ServerEvent) => {
        if (event.session?.id) {
            // Start a transaction for session initialization
            const transaction = window.elasticApm?.startTransaction("gen_ai.session.initialize", "app")

            try {
                setSessionStatus("CONNECTED")
                addTranscriptBreadcrumb(`Session ID: ${event.session.id}\nStarted at: ${new Date().toLocaleString()}`)

                // Get or create user ID for tracking
                let emDashUID = localStorage.getItem("emDashUID")
                if (!emDashUID) {
                    emDashUID = crypto.randomUUID()
                    localStorage.setItem("emDashUID", emDashUID)
                }

                // Set user context in Elastic APM - this enables user-centric views in APM
                window.elasticApm?.setUserContext({
                    id: emDashUID,
                    username: `user_${emDashUID.slice(0, 8)}`,
                })

                // Add custom context with session details
                window.elasticApm?.setCustomContext({
                    session: {
                        id: event.session.id,
                        agent: selectedAgentName || "unknown",
                        started_at: new Date().toISOString(),
                    },
                })

                // Add labels for filtering in APM UI
                if (transaction) {
                    transaction.addLabels({
                        "gen_ai.system": "openai",
                        "gen_ai.operation.name": "realtime",
                        "gen_ai.session.id": event.session.id,
                        "user.id": emDashUID,
                        "agent.name": selectedAgentName || "unknown",
                    })
                }

                // Integration with FullStory for session correlation
                const checkFsAndSetApm = () => {
                    if (window.FS) {
                        const fsUrl = window.FS("getSession", { format: "url" })

                        if (fsUrl) {
                            // Store FullStory URL for cross-referencing in Elastic APM
                            window.elasticApm?.addLabels({
                                "fullstory.url": fsUrl,
                            })

                            // Set identity in FullStory for cross-referencing
                            window.FS("setIdentity", {
                                uid: emDashUID,
                                properties: {
                                    chat_Session_ID: event.session!.id,
                                },
                            })
                        } else {
                            console.warn("FullStory session URL not yet available.")
                            setTimeout(checkFsAndSetApm, 500)
                        }
                    } else {
                        setTimeout(checkFsAndSetApm, 500)
                    }
                }

                checkFsAndSetApm()

                // Create page load span for initial page performance
                const pageLoadSpan = transaction?.startSpan("gen_ai.session.page_load", "app")
                if (pageLoadSpan && window.performance) {
                    const navigationTiming = window.performance.getEntriesByType(
                        "navigation",
                    )[0] as PerformanceNavigationTiming

                    if (navigationTiming) {
                        pageLoadSpan.addLabels({
                            "page.dom_interactive": navigationTiming.domInteractive,
                            "page.dom_complete": navigationTiming.domComplete,
                            "page.load_event": navigationTiming.loadEventEnd,
                            "page.response_start": navigationTiming.responseStart,
                            "page.response_end": navigationTiming.responseEnd,
                        })
                    }

                    pageLoadSpan.end()
                }
            } catch (error) {
                console.error("Error in session initialization:", error)
                captureError(error instanceof Error ? error : String(error))

                if (transaction) {
                    transaction.addLabels({
                        error: error instanceof Error ? error.message : String(error),
                    })
                }
            } finally {
                // End the transaction
                transaction?.end()
            }
        }
    }

    /**
     * Handle conversation message creation
     */
    const handleMessageCreation = (
        itemId: string | undefined,
        role: "user" | "assistant" | undefined,
        text: string,
    ) => {
        // Skip if already in transcript
        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
            return
        }

        // Add the message to transcript
        if (itemId && role) {
            // For user audio input, show placeholder until transcription completes
            const displayText = text || (role === "user" ? "[Transcribing...]" : "")

            // Cancel any ongoing assistant response when user speaks
            if (role === "user") {
                cancelAssistantSpeech()
            }

            // Add to transcript
            addTranscriptMessage(itemId, role, displayText)
        }
    }

    /**
     * Process audio transcription events
     */
    const handleTranscriptionCompleted = (event: ServerEvent) => {
        const itemId = event.item_id

        if (!itemId) return

        // Format final transcript, handling empty or newline-only input
        const finalTranscript = !event.transcript || event.transcript === "\n" ? "[inaudible]" : event.transcript

        // Replace placeholder with final transcript (false = replace, not append)
        updateTranscriptMessage(itemId, finalTranscript, false)

        // Record user transcript for telemetry
        recordUserTranscript(event)
    }

    /**
     * Process incremental text updates
     */
    const handleTextDelta = (event: ServerEvent) => {
        const itemId = event.item_id
        const deltaText = event.delta || ""

        if (itemId) {
            // Append new text to the message (true = append)
            updateTranscriptMessage(itemId, deltaText, true)
        }
    }

    /**
     * Process function calls in AI response
     */
    const handleResponseDone = (event: ServerEvent) => {
        if (!event.response?.output) return

        // Record detailed response data for telemetry
        if (event.response) {
            // Record enhanced response details (high-level metadata)
            recordResponseDoneDetails(event.response)

            // Record token usage if available
            if (event.response.usage) {
                recordTokenUsage(event.response.usage as any, event.response.voice)
            }

            // Record the full transcript for completed responses
            // This creates a separate span with the complete transcript content
            if (event.response.status === "completed") {
                recordFullTranscript(event.response)
            }
        }

        // Process each function call in the response
        event.response.output.forEach((outputItem) => {
            if (outputItem.type === "function_call" && outputItem.name && outputItem.arguments) {
                handleFunctionCall({
                    name: outputItem.name,
                    call_id: outputItem.call_id,
                    arguments: outputItem.arguments,
                })
            }
        })
    }

    /**
     * Track new audio buffers
     */
    const handleAudioBufferStarted = (event: ServerEvent) => {
        if (!event.response_id) return

        // Limit buffer tracking to prevent memory leaks
        if (outputAudioBuffersRef.current.length > 100) {
            outputAudioBuffersRef.current = outputAudioBuffersRef.current.slice(-100)
        }

        // Add new buffer to tracking list
        outputAudioBuffersRef.current.push(event.response_id)
    }

    /**
     * Remove completed audio buffers
     */
    const handleAudioBufferEnded = (event: ServerEvent) => {
        if (!event.response_id) return

        // Remove the buffer from tracking list
        outputAudioBuffersRef.current = outputAudioBuffersRef.current.filter((id) => id !== event.response_id)
    }

    /**
     * Mark message as complete
     */
    const handleOutputItemDone = (event: ServerEvent) => {
        const itemId = event.item?.id

        if (itemId) {
            updateTranscriptItemStatus(itemId, "DONE")
        }
    }

    /**
     * Main server event handler - routes events to appropriate handlers
     */
    const handleServerEvent = (event: ServerEvent) => {
        // Start a transaction for server event handling
        const transaction = window.elasticApm?.startTransaction(`gen_ai.event.${event.type}`, "app.event")

        try {
            // Log all server events
            logServerEvent(event)

            if (transaction) {
                // Add common labels to the transaction
                transaction.addLabels({
                    "gen_ai.event.type": event.type,
                    "gen_ai.system": "openai",
                    "gen_ai.operation.name": "realtime",
                })

                // Add additional context based on event type
                if (event.event_id) transaction.addLabels({ "gen_ai.event.id": event.event_id })
                if (event.response_id) transaction.addLabels({ "gen_ai.response.id": event.response_id })
                if (event.session?.id) transaction.addLabels({ "gen_ai.session.id": event.session.id })
                if (event.item_id) transaction.addLabels({ "gen_ai.item.id": event.item_id })
                else if (event.item?.id) transaction.addLabels({ "gen_ai.item.id": event.item.id })
            }

            // For important events, send telemetry to the server
            if (
                event.type === "response.done" ||
                event.type === "session.created" ||
                event.type === "conversation.item.input_audio_transcription.completed" ||
                event.type.includes("error")
            ) {
                // Send selective event data to avoid sending too much data
                const telemetryData = {
                    eventId: event.event_id,
                    responseId: event.response_id,
                    hasOutput: !!event.response?.output,
                    hasUsage: !!event.response?.usage,
                    sessionId: event.session?.id,
                    itemId: event.item_id || event.item?.id,
                    statusDetails: event.response?.status_details,
                    // For transcription events, add transcript length info
                    transcriptLength: event.transcript ? event.transcript.length : undefined,
                    hasTranscript: !!event.transcript,
                }

                // Create a span for telemetry recording
                const telemetrySpan = transaction?.startSpan("gen_ai.record_telemetry", "app")
                recordServerEvent(event.type, telemetryData)
                telemetrySpan?.end()
            }

            // Extract common fields used across multiple events
            const text = event.item?.content?.[0]?.text || event.item?.content?.[0]?.transcript || ""
            const role = event.item?.role as "user" | "assistant"
            const itemId = event.item?.id

            // Route event to the appropriate handler with performance monitoring spans
            switch (event.type) {
                case "session.created": {
                    const span = transaction?.startSpan("gen_ai.handle_session", "app")
                    handleSessionEvent(event)
                    span?.end()
                    break
                }

                case "conversation.item.created": {
                    const span = transaction?.startSpan("gen_ai.handle_message_creation", "app")
                    if (span && itemId && role) {
                        span.addLabels({
                            "gen_ai.item.id": itemId,
                            "gen_ai.item.role": role,
                            "gen_ai.transcript.length": text.length,
                        })
                    }
                    handleMessageCreation(itemId, role, text)
                    span?.end()
                    break
                }

                case "conversation.item.truncated": {
                    const span = transaction?.startSpan("gen_ai.handle_truncation", "app")
                    // Log truncation events
                    addTranscriptBreadcrumb(`[Truncated at ${event.audio_end_ms}ms]`)
                    span?.end()
                    break
                }

                case "conversation.item.input_audio_transcription.completed": {
                    const span = transaction?.startSpan("gen_ai.handle_transcription", "app")
                    if (span && event.transcript) {
                        span.addLabels({
                            "gen_ai.transcript.length": event.transcript.length,
                            "gen_ai.item.id": event.item_id || "",
                        })
                    }
                    handleTranscriptionCompleted(event)
                    span?.end()
                    break
                }

                case "response.audio_transcript.delta": {
                    const span = transaction?.startSpan("gen_ai.handle_text_delta", "app")
                    if (span && event.delta) {
                        span.addLabels({
                            "gen_ai.delta.length": event.delta.length,
                            "gen_ai.item.id": event.item_id || "",
                        })
                    }
                    handleTextDelta(event)
                    span?.end()
                    break
                }

                case "response.done": {
                    const span = transaction?.startSpan("gen_ai.handle_response_done", "app")
                    if (span && event.response) {
                        span.addLabels({
                            "gen_ai.response.id": (event.response as any).id || "",
                            "gen_ai.response.status": event.response.status || "",
                            "gen_ai.has_usage": !!event.response.usage,
                            "gen_ai.output_count": event.response.output?.length || 0,
                        })
                    }
                    handleResponseDone(event)
                    span?.end()
                    break
                }

                case "output_audio_buffer.started": {
                    const span = transaction?.startSpan("gen_ai.handle_audio_buffer_started", "app")
                    handleAudioBufferStarted(event)
                    span?.end()
                    break
                }

                case "output_audio_buffer.stopped":
                case "output_audio_buffer.cleared": {
                    const span = transaction?.startSpan("gen_ai.handle_audio_buffer_ended", "app")
                    handleAudioBufferEnded(event)
                    span?.end()
                    break
                }

                case "response.output_item.done": {
                    const span = transaction?.startSpan("gen_ai.handle_output_item_done", "app")
                    if (span && event.item?.id) {
                        span.addLabels({
                            "gen_ai.item.id": event.item.id,
                        })
                    }
                    handleOutputItemDone(event)
                    span?.end()
                    break
                }
            }
        } catch (error) {
            console.error("Error handling server event:", error)
            captureError(error instanceof Error ? error : String(error))
            if (transaction) {
                transaction.addLabels({
                    error: error instanceof Error ? error.message : String(error),
                })
            }
        } finally {
            // End the transaction
            transaction?.end()
        }
    }

    // Maintain a stable reference to the handler function
    const handleServerEventRef = useRef(handleServerEvent)
    handleServerEventRef.current = handleServerEvent

    return handleServerEventRef
}
