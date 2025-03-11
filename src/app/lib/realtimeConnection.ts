import { RefObject } from "react"
import { recordRealtimeFetch } from "./client-telemetry"

export async function createRealtimeConnection(
    EPHEMERAL_KEY: string,
    audioElement: RefObject<HTMLAudioElement | null>,
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel; localStream: MediaStream }> {
    const pc = new RTCPeerConnection()

    pc.ontrack = (e) => {
        if (audioElement.current) {
            audioElement.current.srcObject = e.streams[0]
        }
    }

    const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
    pc.addTrack(ms.getTracks()[0])

    const dc = pc.createDataChannel("oai-events")

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const baseUrl = "https://api.openai.com/v1/realtime"
    const model = "gpt-4o-mini-realtime-preview"

    const url = `${baseUrl}?model=${model}`
    const method = "POST"
    let statusCode
    let error
    let sdpResponse

    try {
        sdpResponse = await fetch(url, {
            method,
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${EPHEMERAL_KEY}`,
                "Content-Type": "application/sdp",
            },
        })

        statusCode = sdpResponse.status

        // Record telemetry
        recordRealtimeFetch(url, method, statusCode, undefined, model)

        if (!sdpResponse.ok) {
            window.elasticApm?.captureError(`HTTP error! status: ${sdpResponse.status}`)
            throw new Error(`HTTP error! status: ${sdpResponse.status}`)
        }
    } catch (err) {
        // Capture error for telemetry
        error = err instanceof Error ? err.message : String(err)

        // Record failed fetch
        recordRealtimeFetch(url, method, statusCode, error, model)
        window.elasticApm?.captureError(error)
        // Re-throw the error
        throw err
    }

    const answerSdp = await sdpResponse.text()
    const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: answerSdp,
    }

    await pc.setRemoteDescription(answer)

    return { pc, dc, localStream: ms }
}
