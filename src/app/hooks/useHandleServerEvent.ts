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
            console.warn("Error in cancelAssistantSpeech:", error)
        }
    }

    /**
     * Handle tool execution error
     */
    const handleFunctionError = (error: any, callId?: string, name?: string) => {
        console.error("Function call error:", error)

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
            handleFunctionError(error, callId, name)
        }
    }

    /**
     * Handle agent transfer requests
     */
    const handleAgentTransfer = (args: any, callId?: string) => {
        const destinationAgent = args.destination_agent

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
                console.log(`[TRANSFER] Verification ${verifiedSuccess ? 'SUCCESS' : 'FAILED'}`)
                
                // Trigger session update to configure the new agent's tools and settings
                if (verifiedSuccess) {
                    sendClientEvent({ 
                        type: "session.update.after.transfer",
                        agent: destinationAgent
                    }, "Trigger session update after transfer")
                }
                
                // Send result back to AI with verified status
                const transferResult = {
                    destination_agent: destinationAgent,
                    did_transfer: verifiedSuccess,
                    verified: true
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
            console.error(`[TRANSFER] FAILED - agent not found: ${destinationAgent}`)
            console.log(`[TRANSFER] Available agents: ${selectedAgentConfigSet?.map(a => a.name).join(', ')}`)
            
            // Prepare failure response
            const transferResult = {
                destination_agent: destinationAgent,
                did_transfer: false,
                reason: "Agent not found"
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
        const { name, call_id, arguments: argsString } = params
        let args: any

        // Step 1: Parse the function arguments
        try {
            args = JSON.parse(argsString)
            addTranscriptBreadcrumb(`Function call: ${name}`, args)
        } catch (parseError) {
            // Handle JSON parsing errors
            console.error("JSON Parse Error:", parseError, "Raw JSON:", argsString)

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
            return
        }

        // Step 2: Execute the appropriate function
        try {
            const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName)

            if (currentAgent?.toolLogic?.[name]) {
                // Execute agent-specific tool
                const fn = currentAgent.toolLogic[name]
                await executeAgentTool(fn, args, name, call_id)
            } else if (name === "transferAgents") {
                // Handle agent transfer requests
                handleAgentTransfer(args, call_id)
            } else {
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
        } catch (error) {
            // Handle any other execution errors
            handleFunctionError(error, call_id, name)
        }
    }

    /**
     * Handle session management events
     */
    const handleSessionEvent = (event: ServerEvent) => {
        if (event.session?.id) {
            setSessionStatus("CONNECTED")
            addTranscriptBreadcrumb(`Session ID: ${event.session.id}\nStarted at: ${new Date().toLocaleString()}`)
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
        // Log all server events
        logServerEvent(event)

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

            recordServerEvent(event.type, telemetryData)
        }

        // Extract common fields used across multiple events
        const text = event.item?.content?.[0]?.text || event.item?.content?.[0]?.transcript || ""
        const role = event.item?.role as "user" | "assistant"
        const itemId = event.item?.id

        // Route event to the appropriate handler
        switch (event.type) {
            case "session.created":
                handleSessionEvent(event)
                break

            case "conversation.item.created":
                handleMessageCreation(itemId, role, text)
                break

            case "conversation.item.truncated":
                // Log truncation events
                addTranscriptBreadcrumb(`[Truncated at ${event.audio_end_ms}ms]`)
                break

            case "conversation.item.input_audio_transcription.completed":
                handleTranscriptionCompleted(event)
                break

            case "response.audio_transcript.delta":
                handleTextDelta(event)
                break

            case "response.done":
                handleResponseDone(event)
                break

            case "output_audio_buffer.started":
                handleAudioBufferStarted(event)
                break

            case "output_audio_buffer.stopped":
            case "output_audio_buffer.cleared":
                handleAudioBufferEnded(event)
                break

            case "response.output_item.done":
                handleOutputItemDone(event)
                break
        }
    }

    // Maintain a stable reference to the handler function
    const handleServerEventRef = useRef(handleServerEvent)
    handleServerEventRef.current = handleServerEvent

    return handleServerEventRef
}
