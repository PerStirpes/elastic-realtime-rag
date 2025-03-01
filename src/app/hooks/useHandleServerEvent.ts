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
            console.log("No truncation needed, message is DONE")
            return
        }

        // sendClientEvent({
        //     type: "conversation.item.truncate",
        //     item_id: mostRecentAssistantMessage?.itemId,
        //     content_index: 0,
        //     audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
        // })
        sendClientEvent({ type: "response.cancel" }, "(cancel due to user interruption)")
    }

    const handleFunctionCall = async (functionCallParams: { name: string; call_id?: string; arguments: string }) => {
        let args: any
        // 1. Attempt to parse the JSON arguments
        try {
            args = JSON.parse(functionCallParams.arguments)
            addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args)
        } catch (parseError) {
            // console.error("Error parsing JSON in functionCallParams.arguments:", parseError)
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
            sendClientEvent({ type: "response.create" }) // maybe change to
            return // Exit early since the input is invalid
        }

        // 2. Wrap the rest of the processing in a try/catch block
        try {
            const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName)

            // addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args)

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
                    console.log(`Transferring to agent: ${destinationAgent}`);
                    setSelectedAgentName(destinationAgent);
                } else {
                    console.error(`Failed to transfer - agent not found: ${destinationAgent}`);
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

    const handleServerEvent = (serverEvent: ServerEvent) => {
        logServerEvent(serverEvent)
        let text = serverEvent.item?.content?.[0]?.text || serverEvent.item?.content?.[0]?.transcript || ""
        const role = serverEvent.item?.role as "user" | "assistant"
        const itemId = serverEvent.item?.id
        switch (serverEvent.type) {
            case "session.created": {
                if (serverEvent.session?.id) {
                    setSessionStatus("CONNECTED")
                    addTranscriptBreadcrumb(
                        `session.id: ${serverEvent.session.id}\nStarted at: ${new Date().toLocaleString()}`,
                    )
                }
                break
            }

            case "conversation.item.created": {
                // let text = serverEvent.item?.content?.[0]?.text || serverEvent.item?.content?.[0]?.transcript || ""
                // const role = serverEvent.item?.role as "user" | "assistant"
                // const itemId = serverEvent.item?.id

                if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
                    break
                }

                if (itemId && role) {
                    if (role === "user") {
                        // If the text is empty (e.g., during audio transcription), you can set a placeholder
                        if (!text) {
                            text = "[Transcribing...]"
                        }
                        // User message detected: cancel any ongoing audio response
                        cancelAssistantSpeech()
                    }
                    addTranscriptMessage(itemId, role, text)
                }
                break
            }

            case "conversation.item.truncated": {
                const audioEndMs = serverEvent.audio_end_ms

                addTranscriptBreadcrumb(`[Truncated at ${audioEndMs}],`)
                cancelAssistantSpeech()
                break
            }
            case "conversation.item.input_audio_transcription.completed": {
                const itemId = serverEvent.item_id
                const finalTranscript =
                    !serverEvent.transcript || serverEvent.transcript === "\n" ? "[inaudible]" : serverEvent.transcript
                if (itemId) {
                    updateTranscriptMessage(itemId, finalTranscript, false)
                }
                break
            }

            case "response.audio_transcript.delta": {
                const itemId = serverEvent.item_id
                const deltaText = serverEvent.delta || ""
                if (itemId) {
                    updateTranscriptMessage(itemId, deltaText, true)
                }
                break
            }

            case "response.done": {
                if (serverEvent.response?.output) {
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

            // Handle creation of an output audio buffer.
            case "output_audio_buffer.started": {
                // Assuming serverEvent carries a unique buffer ID in serverEvent.response_id.
                if (serverEvent.response_id) {
                    // Limit the size of the array to prevent memory leaks
                    if (outputAudioBuffersRef.current.length > 100) {
                        outputAudioBuffersRef.current = outputAudioBuffersRef.current.slice(-100)
                    }
                    outputAudioBuffersRef.current.push(serverEvent.response_id)
                }
                break
            }

            // Handle deletion of an output audio buffer.
            case "output_audio_buffer.stopped":
            case "output_audio_buffer.cleared": {
                if (serverEvent.response_id) {
                    outputAudioBuffersRef.current = outputAudioBuffersRef.current.filter(
                        (id) => id !== serverEvent.response_id,
                    )
                }
                break
            }

            case "response.output_item.done": {
                const itemId = serverEvent.item?.id
                if (itemId) {
                    updateTranscriptItemStatus(itemId, "DONE")
                    cancelAssistantSpeech()
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
