import { useRef, useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { SessionStatus, UseRealtimeConnectionProps } from "@/app/types"
import { createRealtimeConnection } from "@/app/lib/realtimeConnection"
import { useTranscript } from "@/app/contexts/TranscriptContext"
import { useEvent } from "@/app/contexts/EventContext"
import { useHandleServerEvent } from "./useHandleServerEvent"
import { recordServerEvent } from "../lib/client-telemetry"

export function useRealtimeConnection({
    selectedAgentName,
    setSelectedAgentName,
    selectedAgentConfigSet,
}: UseRealtimeConnectionProps) {
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED")
    const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
    const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false)
    const [isPTTActive, setIsPTTActive] = useState<boolean>(false) // Default value
    const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true) // Default value

    // Load settings from localStorage only after component has mounted on client
    useEffect(() => {
        // This only runs on the client after mount
        const storedPTT = localStorage.getItem("pushToTalkUI")
        if (storedPTT !== null) {
            setIsPTTActive(storedPTT === "true")
        }

        const storedAudio = localStorage.getItem("audioPlaybackEnabled")
        if (storedAudio !== null) {
            setIsAudioPlaybackEnabled(storedAudio === "true")
        }
    }, []) // Empty dependency array ensures this only runs once after mount
    const [userText, setUserText] = useState<string>("")

    // References
    const pcRef = useRef<RTCPeerConnection | null>(null)
    const dcRef = useRef<RTCDataChannel | null>(null)
    const audioElementRef = useRef<HTMLAudioElement | null>(null)
    const manualDisconnectRef = useRef(false)
    const updateSessionCounterRef = useRef(0)
    const dcEventHandlersRef = useRef<{
        open: () => void
        close: () => void
        error: (err: any) => void
        message: (e: MessageEvent) => void
    } | null>(null)

    const { addTranscriptMessage, addTranscriptBreadcrumb, transcriptItems } = useTranscript()
    const { logClientEvent, logServerEvent } = useEvent()

    // Set up the server event handler
    const handleServerEventRef = useHandleServerEvent({
        setSessionStatus,
        selectedAgentName,
        selectedAgentConfigSet,
        sendClientEvent,
        setSelectedAgentName, // Pass the real setSelectedAgentName function
    })

    // Function to send events to the client
    function sendClientEvent(eventObj: any, eventNameSuffix = "") {
        if (dcRef.current && dcRef.current.readyState === "open") {
            logClientEvent(eventObj, eventNameSuffix)

            try {
                // If this is a special event type, record it for telemetry
                if (
                    eventObj.type === "conversation.item.create" ||
                    eventObj.type === "response.cancel" ||
                    eventObj.type === "session.update" ||
                    eventObj.type === "session.update.after.transfer"
                ) {
                    recordServerEvent(eventObj.type, {
                        itemType: eventObj.item?.type,
                        itemRole: eventObj.item?.role,
                        suffix: eventNameSuffix,

                        agent: eventObj.agent, // For tracking transfers
                    })
                }

                // Special handling for post-transfer session updates
                if (eventObj.type === "session.update.after.transfer") {
                    console.log(`[TRANSFER] Triggering session update after transfer to: ${eventObj.agent}`)
                    // Convert to a regular session update
                    updateSession(false)
                    return
                }

                // Send the event via data channel
                dcRef.current.send(JSON.stringify(eventObj))
            } catch (error) {
                window.elasticApm?.captureError(`Failed to send message: ${error}`)
                console.error("Failed to send message", error)
            }
        } else {
            logClientEvent({ attemptedEvent: eventObj.type }, "error.data_channel_not_open")
            console.log("Failed to send message - data channel not open", eventObj.type)
            console.error("Failed to send message - no data channel available", eventObj)
            window.elasticApm?.captureError(`Failed to send message - no data channel available: ${eventObj.type}`)
        }
    }

    // Function to fetch ephemeral key for WebRTC connection
    const fetchEphemeralKey = async (): Promise<string | null> => {
        logClientEvent({ url: "/session" }, "fetch_session_token_request")
        const tokenResponse = await fetch("/api/session")
        const data = await tokenResponse.json()
        logServerEvent(data, "fetch_session_token_response")

        if (!data.client_secret?.value) {
            logClientEvent(data, "error.no_ephemeral_key")
            console.error("No ephemeral key provided by the server")
            window.elasticApm?.captureError(`No ephemeral key provided by the server`)
            setSessionStatus("DISCONNECTED")
            return null
        }

        return data.client_secret.value
    }

    // Function to connect to the realtime service
    const connectToRealtime = async () => {
        if (sessionStatus !== "DISCONNECTED") return
        setSessionStatus("CONNECTING")

        try {
            const EPHEMERAL_KEY = await fetchEphemeralKey()
            if (!EPHEMERAL_KEY) {
                return
            }

            if (!audioElementRef.current) {
                audioElementRef.current = document.createElement("audio")
            }
            audioElementRef.current.autoplay = isAudioPlaybackEnabled

            const { pc, dc, localStream } = await createRealtimeConnection(EPHEMERAL_KEY, audioElementRef)
            pcRef.current = pc
            dcRef.current = dc
            setLocalStream(localStream)

            // Attach remote stream to state once available
            const timeoutId = setTimeout(() => {
                if (audioElementRef.current && audioElementRef.current.srcObject) {
                    setRemoteStream(audioElementRef.current.srcObject as MediaStream)
                }
            }, 1000)

            // Clear timeout on disconnect
            pcRef.current.addEventListener("iceconnectionstatechange", () => {
                if (
                    pcRef.current?.iceConnectionState === "disconnected" ||
                    pcRef.current?.iceConnectionState === "failed" ||
                    pcRef.current?.iceConnectionState === "closed"
                ) {
                    clearTimeout(timeoutId)
                }
            })

            // Set up event handlers for the data channel
            const handleOpen = () => {
                logClientEvent({}, "data_channel.open")
            }

            const handleClose = () => {
                logClientEvent({}, "data_channel.close")
            }

            const handleError = (err: any) => {
                logClientEvent({ error: err }, "data_channel.error")
                window.elasticApm?.captureError(`  Data channel error: ${err}`)
            }

            const handleMessage = (e: MessageEvent) => {
                handleServerEventRef.current(JSON.parse(e.data))
            }

            // Attach event listeners to the data channel
            dc.addEventListener("open", handleOpen)
            dc.addEventListener("close", handleClose)
            dc.addEventListener("error", handleError)
            dc.addEventListener("message", handleMessage)

            // Store handlers for cleanup
            dcEventHandlersRef.current = {
                open: handleOpen,
                close: handleClose,
                error: handleError,
                message: handleMessage,
            }

            setDataChannel(dc)
        } catch (err) {
            console.error("Error connecting to realtime:", err)

            window.elasticApm?.captureError(`Error connecting to realtime: ${err}`)
            window.alert("This app needs access to your microphone, Please enable your microphone")

            setSessionStatus("DISCONNECTED")
        }
    }

    // Function to disconnect from the realtime service
    const disconnectFromRealtime = () => {
        try {
            // Clean up event listeners from data channel
            if (dcRef.current && dcEventHandlersRef.current) {
                const handlers = dcEventHandlersRef.current
                dcRef.current.removeEventListener("open", handlers.open)
                dcRef.current.removeEventListener("close", handlers.close)
                dcRef.current.removeEventListener("error", handlers.error)
                dcRef.current.removeEventListener("message", handlers.message)
                dcEventHandlersRef.current = null
            }

            // Stop and clean up RTCPeerConnection
            if (pcRef.current) {
                pcRef.current.getSenders().forEach((sender) => {
                    if (sender.track) {
                        sender.track.stop()
                    }
                })

                pcRef.current.close()
                pcRef.current = null
            }

            // Stop local stream tracks if they exist
            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop())
            }

            // Reset state
            setLocalStream(null)
            setRemoteStream(null)
            setDataChannel(null)
            setSessionStatus("DISCONNECTED")
            setIsPTTUserSpeaking(false)
            dcRef.current = null

            logClientEvent({}, "disconnected")
        } catch (error) {
            console.error("Error in disconnectFromRealtime:", error)
            window.elasticApm?.captureError(`Error in disconnectFromRealtime: ${error}`)
        }
    }

    // Toggle connection function
    const onToggleConnection = () => {
        if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
            manualDisconnectRef.current = true
            disconnectFromRealtime()
            setSessionStatus("DISCONNECTED")
        } else {
            manualDisconnectRef.current = false
            connectToRealtime()
        }
    }

    // Function to send user text message
    const handleSendTextMessage = () => {
        if (!userText.trim()) return
        cancelAssistantSpeech()

        sendClientEvent(
            {
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "user",
                    content: [{ type: "input_text", text: userText.trim() }],
                },
            },
            "(send user text message)",
        )
        setUserText("")

        sendClientEvent({ type: "response.create" }, "trigger response")
    }

    // Function to send simulated user message
    const sendSimulatedUserMessage = (text: string) => {
        const id = uuidv4().slice(0, 32)
        addTranscriptMessage(id, "user", text, true)

        sendClientEvent(
            {
                type: "conversation.item.create",
                item: {
                    id,
                    type: "message",
                    role: "user",
                    content: [{ type: "input_text", text }],
                },
            },
            "(simulated user text message)",
        )
        sendClientEvent({ type: "response.create" }, "(trigger response after simulated user text message)")
    }

    // Update session configuration
    const updateSession = (shouldTriggerResponse: boolean = false) => {
        updateSessionCounterRef.current++
        console.log(`[SESSION] updateSession with agent: ${selectedAgentName}, trigger: ${shouldTriggerResponse}`)
        sendClientEvent({ type: "input_audio_buffer.clear" }, "clear audio buffer on session update")

        const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName)
        if (!currentAgent) {
            console.error(`[SESSION] Cannot find agent config for ${selectedAgentName}`)
            window.elasticApm?.captureError(`Cannot find agent config for ${selectedAgentName}`)
            console.log(`[SESSION] Available agents: ${selectedAgentConfigSet?.map((a) => a.name).join(", ")}`)
            return
        }

        console.log(`[SESSION] Found agent config for ${selectedAgentName}`)
        console.log(`[SESSION] Agent has ${currentAgent.tools?.length || 0} tools`)

        if (currentAgent.tools) {
            const hasTransferTool = currentAgent.tools.some((tool) => tool.name === "transferAgents")
            console.log(`[SESSION] Agent has transferAgents tool: ${hasTransferTool}`)

            if (hasTransferTool) {
                const transferTool = currentAgent.tools.find((tool) => tool.name === "transferAgents")
                if (transferTool && transferTool.parameters?.properties?.destination_agent?.enum) {
                    console.log(
                        `[SESSION] Transfer targets: ${transferTool.parameters.properties.destination_agent.enum.join(", ")}`,
                    )
                }
            }
        }

        const turnDetection = isPTTActive
            ? null
            : {
                  type: "server_vad",
                  threshold: 0.7,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                  create_response: true,
              }

        const instructions = currentAgent?.instructions || ""
        const tools = currentAgent?.tools || []

        const sessionUpdateEvent = {
            type: "session.update",
            session: {
                modalities: ["text", "audio"],
                instructions,
                voice: "echo",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: { model: "whisper-1" },
                turn_detection: turnDetection,
                tools,
                temperature: 0.8,
            },
        }

        console.log(`[SESSION] Sending session update for ${selectedAgentName}`)
        sendClientEvent(sessionUpdateEvent)

        if (shouldTriggerResponse) {
            console.log(`[SESSION] Triggering initial response for ${selectedAgentName}`)
            sendSimulatedUserMessage("hi")
        } else {
            console.log(`[SESSION] Session updated for ${selectedAgentName} without triggering response`)
        }
    }

    // Cancel assistant speech
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

        try {
            sendClientEvent({
                type: "conversation.item.truncate",
                item_id: mostRecentAssistantMessage?.itemId,
                content_index: 0,
                audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
            })

            // Add a small delay before cancelling the response to ensure proper sequence
            setTimeout(() => {
                try {
                    sendClientEvent({ type: "response.cancel" }, "(cancel due to user interruption)")
                } catch (error) {
                    console.warn("Error in delayed response.cancel:", error)
                    window.elasticApm?.captureError(`Error in delayed response.cancel: ${error}`)
                }
            }, 50)
        } catch (error) {
            console.warn("Error in cancelAssistantSpeech:", error)
            window.elasticApm?.captureError(`Error in cancelAssistantSpeech: ${error}`)
        }
    }

    // Push-to-talk handlers
    const handleTalkButtonDown = () => {
        if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open") return
        cancelAssistantSpeech()

        setIsPTTUserSpeaking(true)
        sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer")
    }

    const handleTalkButtonUp = () => {
        if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open" || !isPTTUserSpeaking) return

        setIsPTTUserSpeaking(false)
        sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT")
        sendClientEvent({ type: "response.create" }, "trigger response PTT")
    }

    // We use a separate useEffect to initialize from localStorage after component mount

    // Save settings to localStorage (only in browser)
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("pushToTalkUI", isPTTActive.toString())
        }
    }, [isPTTActive])

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("audioPlaybackEnabled", isAudioPlaybackEnabled.toString())
        }
    }, [isAudioPlaybackEnabled])

    // Handle audio playback settings
    useEffect(() => {
        if (audioElementRef.current) {
            if (isAudioPlaybackEnabled) {
                audioElementRef.current.play().catch((err) => {
                    console.warn("Autoplay may be blocked by browser:", err)
                })
            } else {
                audioElementRef.current.pause()
            }
        }
    }, [isAudioPlaybackEnabled])

    // Auto-connect when selectedAgentName is set
    useEffect(() => {
        if (selectedAgentName && sessionStatus === "DISCONNECTED" && !manualDisconnectRef.current) {
            connectToRealtime()
        }
        // Reset the manual disconnect flag when status changes to CONNECTED
        if (sessionStatus === "CONNECTED") {
            manualDisconnectRef.current = false
        }
    }, [selectedAgentName, sessionStatus])

    // Update session when connected with agent info
    useEffect(() => {
        if (sessionStatus === "CONNECTED" && selectedAgentConfigSet && selectedAgentName) {
            const currentAgent = selectedAgentConfigSet.find((a) => a.name === selectedAgentName)
            addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent)
            updateSession(true)
        }
    }, [selectedAgentConfigSet, selectedAgentName, sessionStatus])

    // Also update session when agent name changes while already connected
    useEffect(() => {
        if (sessionStatus === "CONNECTED" && selectedAgentName) {
            console.log(`Agent changed to: ${selectedAgentName} - updating session`)
            // Use a small delay to ensure state has propagated
            setTimeout(() => {
                updateSession(false)
            }, 50)
        }
    }, [selectedAgentName])

    // Update session when PTT status changes
    useEffect(() => {
        if (sessionStatus === "CONNECTED") {
            console.log(`updatingSession, isPTTActive=${isPTTActive} sessionStatus=${sessionStatus}`)
            updateSession()
        }
    }, [isPTTActive, sessionStatus])

    return {
        // Connection state
        sessionStatus,
        localStream,
        remoteStream,

        // PTT state
        isPTTActive,
        setIsPTTActive,
        isPTTUserSpeaking,

        // Audio state
        isAudioPlaybackEnabled,
        setIsAudioPlaybackEnabled,

        // Text input state
        userText,
        setUserText,

        // Connection actions
        onToggleConnection,

        // Messaging actions
        handleSendTextMessage,

        // PTT actions
        handleTalkButtonDown,
        handleTalkButtonUp,

        // Helper to check if sending is possible
        canSend: sessionStatus === "CONNECTED" && dcRef.current?.readyState === "open",
    }
}
