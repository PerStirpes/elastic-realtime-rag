"use client"

import { ServerEvent, SessionStatus, AgentConfig } from "@/app/types"
import { useTranscript } from "@/app/contexts/TranscriptContext"
import { useEvent } from "@/app/contexts/EventContext"
import { useRef } from "react"

export interface UseHandleServerEventParams {
    setSessionStatus: (status: SessionStatus) => void
    selectedAgentName: string
    selectedAgentConfigSet: AgentConfig[] | null
    sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void
    setSelectedAgentName: (name: string) => void
    /** Legacy param - not used */
    shouldForceResponse?: boolean
}

export function useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
}: UseHandleServerEventParams) {
    const {
        transcriptItems,
        addTranscriptBreadcrumb,
        addTranscriptMessage,
        updateTranscriptMessage,
        updateTranscriptItemStatus,
    } = useTranscript()

    const { logServerEvent } = useEvent()

    const outputAudioBuffersRef = useRef<string[]>([])

    const cancelAssistantSpeech = async () => {
        const mostRecentAssistantMessage = [...transcriptItems].reverse().find((item) => item.role === "assistant")
        if (!mostRecentAssistantMessage) {
            console.warn("can't cancel, no recent assistant message found")
            return
        }
        if (mostRecentAssistantMessage.status === "DONE") {
            console.log("No cancellation needed, message is already DONE")
            return
        }

        try {
            // Check if there are active audio buffers before attempting to cancel
            if (outputAudioBuffersRef.current.length > 0) {
                // First truncate the message content
                sendClientEvent({
                    type: "conversation.item.truncate",
                    item_id: mostRecentAssistantMessage?.itemId,
                    content_index: 0,
                    audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
                })

                // Then cancel the response after a small delay to ensure proper sequence
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
     * Process function calls from the AI
     */
    const handleFunctionCall = async (functionCallParams: { name: string; call_id?: string; arguments: string }) => {
        let args: any
        // Parse the function arguments
        try {
            args = JSON.parse(functionCallParams.arguments)
            addTranscriptBreadcrumb(`Function call: ${functionCallParams.name}`, args)
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw JSON:", functionCallParams.arguments)
            addTranscriptBreadcrumb(`Error parsing arguments for function call: ${functionCallParams.name}`, {
                error: parseError,
            })
            sendClientEvent({
                type: "conversation.item.create",
                item: {
                    type: "function_call_error",
                    call_id: functionCallParams.call_id,
                    output: JSON.stringify({
                        error: "Invalid JSON provided",
                        details: (parseError as Error).message,
                    }),
                },
            })
            sendClientEvent({ type: "response.create" })
            return
        }

        try {
            const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName)

            if (currentAgent?.toolLogic?.[functionCallParams.name]) {
                // Execute the function associated with the agent
                const fn = currentAgent.toolLogic[functionCallParams.name]
                const fnResult = await fn(args, transcriptItems)

                addTranscriptBreadcrumb(`function call result: ${functionCallParams.name}`, fnResult)

                sendClientEvent({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: functionCallParams.call_id,
                        output: JSON.stringify(fnResult),
                    },
                })
                sendClientEvent({ type: "response.create" })
            } else if (functionCallParams.name === "transferAgents") {
                // Handle the transferAgents function call
                const destinationAgent = args.destination_agent
                const newAgentConfig = selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null

                if (newAgentConfig) {
                    console.log(`Transferring to agent: ${destinationAgent}`)
                    setSelectedAgentName(destinationAgent)
                } else {
                    console.error(`Failed to transfer - agent not found: ${destinationAgent}`)
                }

                const functionCallOutput = {
                    destination_agent: destinationAgent,
                    did_transfer: !!newAgentConfig,
                }

                sendClientEvent({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: functionCallParams.call_id,
                        output: JSON.stringify(functionCallOutput),
                    },
                })
                addTranscriptBreadcrumb(`function call: ${functionCallParams.name} response`, functionCallOutput)
            } else {
                // Fallback behavior if no specific function logic exists
                const simulatedResult = { result: true }
                addTranscriptBreadcrumb(`function call fallback: ${functionCallParams.name}`, simulatedResult)

                sendClientEvent({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: functionCallParams.call_id,
                        output: JSON.stringify(simulatedResult),
                    },
                })
                sendClientEvent({ type: "response.create" })
            }
        } catch (error) {
            // General error handling for any errors that occur during function execution
            console.error("Error handling function call:", error)
            addTranscriptBreadcrumb(`Error during function call: ${functionCallParams.name}`, { error })
            sendClientEvent({
                type: "conversation.item.create",
                item: {
                    type: "function_call_error",
                    call_id: functionCallParams.call_id,
                    output: JSON.stringify({
                        error: "Function call failed",
                        details: (error as Error).message,
                    }),
                },
            })
            sendClientEvent({ type: "response.create" })
        }
    }

    /**
     * Main server event handler
     */
    const handleServerEvent = (serverEvent: ServerEvent) => {
        // Log the event for debugging
        logServerEvent(serverEvent)

        // Extract common fields used across multiple events
        let text = serverEvent.item?.content?.[0]?.text || serverEvent.item?.content?.[0]?.transcript || ""
        const role = serverEvent.item?.role as "user" | "assistant"
        const itemId = serverEvent.item?.id

        // Process each event type
        switch (serverEvent.type) {
            case "session.created": {
                // Session connection established
                if (serverEvent.session?.id) {
                    setSessionStatus("CONNECTED")
                    addTranscriptBreadcrumb(
                        `Session ID: ${serverEvent.session.id}\nStarted at: ${new Date().toLocaleString()}`,
                    )
                }
                break
            }

            case "conversation.item.created": {
                if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
                    break
                }

                // Add new message to transcript
                if (itemId && role) {
                    if (role === "user") {
                        // For audio input, show placeholder until transcription completes
                        if (!text) {
                            text = "[Transcribing...]"
                        }
                        // Cancel any ongoing assistant response when user speaks
                        cancelAssistantSpeech()
                    }
                    addTranscriptMessage(itemId, role, text)
                }
                break
            }

            case "conversation.item.truncated": {
                // Message was interrupted/truncated by the user
                const audioEndMs = serverEvent.audio_end_ms
                addTranscriptBreadcrumb(`[Truncated at ${audioEndMs}ms]`)
                break
            }

            case "conversation.item.input_audio_transcription.completed": {
                // Final transcription of user audio
                const itemId = serverEvent.item_id
                const finalTranscript =
                    !serverEvent.transcript || serverEvent.transcript === "\n" ? "[inaudible]" : serverEvent.transcript

                // Replace placeholder with final transcript
                if (itemId) {
                    updateTranscriptMessage(itemId, finalTranscript, false)
                }
                break
            }

            case "response.audio_transcript.delta": {
                // Incremental update to assistant text
                const itemId = serverEvent.item_id
                const deltaText = serverEvent.delta || ""

                // Append new text to the current message
                if (itemId) {
                    updateTranscriptMessage(itemId, deltaText, true)
                }
                break
            }

            case "response.done": {
                // AI has completed its response
                if (serverEvent.response?.output) {
                    // Process any function calls in the response
                    serverEvent.response.output.forEach((outputItem) => {
                        if (outputItem.type === "function_call" && outputItem.name && outputItem.arguments) {
                            handleFunctionCall({
                                name: outputItem.name,
                                call_id: outputItem.call_id,
                                arguments: outputItem.arguments,
                            })
                        }
                    })
                }
                break
            }

            case "output_audio_buffer.started": {
                // New audio buffer from assistant speech
                if (serverEvent.response_id) {
                    // Prevent memory leaks by limiting buffer tracking
                    if (outputAudioBuffersRef.current.length > 100) {
                        outputAudioBuffersRef.current = outputAudioBuffersRef.current.slice(-100)
                    }
                    // Track this buffer
                    outputAudioBuffersRef.current.push(serverEvent.response_id)
                }
                break
            }

            case "output_audio_buffer.stopped":
            case "output_audio_buffer.cleared": {
                // Audio buffer finished or cleared
                if (serverEvent.response_id) {
                    // Remove from tracked buffers
                    outputAudioBuffersRef.current = outputAudioBuffersRef.current.filter(
                        (id) => id !== serverEvent.response_id,
                    )
                }
                break
            }

            case "response.output_item.done": {
                // Assistant message is complete
                const itemId = serverEvent.item?.id
                if (itemId) {
                    updateTranscriptItemStatus(itemId, "DONE")
                }
                break
            }

            default:
                break
        }
    }

    const handleServerEventRef = useRef(handleServerEvent)
    handleServerEventRef.current = handleServerEvent

    return handleServerEventRef
}
