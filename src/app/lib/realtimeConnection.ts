import { RefObject } from "react"
import { recordRealtimeFetch } from "./client-telemetry"
import * as semconv from "./semconv"

export async function createRealtimeConnection(
    EPHEMERAL_KEY: string,
    audioElement: RefObject<HTMLAudioElement | null>,
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel; localStream: MediaStream }> {
    // Start a transaction for the entire connection process
    const transaction = window.elasticApm?.startTransaction("gen_ai.realtime.connection", "webrtc");
    if (transaction) {
        transaction.addLabels({
            [semconv.ATTR_GEN_AI_SYSTEM]: "openai",
            [semconv.ATTR_GEN_AI_OPERATION_NAME]: "realtime_connect"
        });
    }

    try {
        // Create RTCPeerConnection with span
        const peerConnSpan = transaction?.startSpan("gen_ai.realtime.peer_connection", "webrtc");
        const pc = new RTCPeerConnection();
        peerConnSpan?.end();

        // Set up track handler
        pc.ontrack = (e) => {
            if (audioElement.current) {
                audioElement.current.srcObject = e.streams[0];
                
                // Record remote track received in APM
                const trackSpan = transaction?.startSpan("gen_ai.realtime.remote_track", "webrtc");
                if (trackSpan) {
                    trackSpan.addLabels({
                        "track.kind": e.track.kind,
                        "track.id": e.track.id,
                        "track.enabled": e.track.enabled
                    });
                    trackSpan.end();
                }
            }
        };

        // Get user media with span
        const mediaSpan = transaction?.startSpan("gen_ai.realtime.get_user_media", "webrtc");
        const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaSpan?.end();

        // Add local track with span
        const addTrackSpan = transaction?.startSpan("gen_ai.realtime.add_track", "webrtc");
        pc.addTrack(ms.getTracks()[0]);
        addTrackSpan?.end();

        // Create data channel with span
        const dataChannelSpan = transaction?.startSpan("gen_ai.realtime.data_channel", "webrtc");
        const dc = pc.createDataChannel("oai-events");
        dataChannelSpan?.end();

        // Create offer with span
        const createOfferSpan = transaction?.startSpan("gen_ai.realtime.create_offer", "webrtc");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        createOfferSpan?.end();

        const baseUrl = "https://api.openai.com/v1/realtime";
        const model = "gpt-4o-mini-realtime-preview";

        const url = `${baseUrl}?model=${model}`;
        const method = "POST";
        let statusCode;
        let error;
        let sdpResponse;

        // Fetch SDP answer with span
        const fetchSpan = transaction?.startSpan("gen_ai.realtime.fetch_sdp", "external.http");
        if (fetchSpan) {
            fetchSpan.addLabels({
                "http.url": url,
                "http.method": method,
                [semconv.ATTR_GEN_AI_RESPONSE_MODEL]: model
            });
        }

        try {
            sdpResponse = await fetch(url, {
                method,
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp",
                },
            });

            statusCode = sdpResponse.status;

            // Record telemetry (backward compatibility)
            recordRealtimeFetch(url, method, statusCode, undefined, model);

            // Update fetch span with status
            if (fetchSpan) {
                fetchSpan.addLabels({
                    "http.status_code": statusCode
                });
            }

            if (!sdpResponse.ok) {
                const errorMsg = `HTTP error! status: ${sdpResponse.status}`;
                window.elasticApm?.captureError(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (err) {
            // Capture error for telemetry
            error = err instanceof Error ? err.message : String(err);

            // Update fetch span with error
            if (fetchSpan) {
                fetchSpan.addLabels({
                    "error": error,
                    ...(statusCode ? { "http.status_code": statusCode } : {})
                });
            }

            // Record failed fetch (backward compatibility)
            recordRealtimeFetch(url, method, statusCode, error, model);
            window.elasticApm?.captureError(error);
            
            // Re-throw the error
            throw err;
        } finally {
            fetchSpan?.end();
        }

        // Process SDP answer with span
        const processAnswerSpan = transaction?.startSpan("gen_ai.realtime.process_answer", "webrtc");
        const answerSdp = await sdpResponse.text();
        const answer: RTCSessionDescriptionInit = {
            type: "answer",
            sdp: answerSdp,
        };
        processAnswerSpan?.end();

        // Set remote description with span
        const remoteDescSpan = transaction?.startSpan("gen_ai.realtime.set_remote_desc", "webrtc");
        await pc.setRemoteDescription(answer);
        remoteDescSpan?.end();

        // Transaction successful - end it
        transaction?.end();

        return { pc, dc, localStream: ms };
    } catch (error) {
        // Record error in transaction
        if (transaction) {
            transaction.addLabels({
                "error": error instanceof Error ? error.message : String(error)
            });
            transaction.end();
        }
        throw error;
    }
}
