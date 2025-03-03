import React from "react"
import Transcript from "./Transcript"
import Events from "./Events"
import AudioDancerComponent from "./AudioDancerComponent"

interface MainProps {
    userText: string
    setUserText: (text: string) => void
    onSendMessage: () => void
    canSend: boolean
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    isEventsPaneExpanded: boolean
}

export function Main({
    userText,
    setUserText,
    onSendMessage,
    canSend,
    localStream,
    remoteStream,
    isEventsPaneExpanded,
}: MainProps) {
    return (
        <div className="flex flex-col md:flex-row flex-1 gap-2 px-2 overflow-hidden relative">
            <div
                className="md:hidden flex-shrink-0 flex items-start justify-center w-full pt-0 pb-2"
                style={{ minHeight: "120px" }}
            >
                <div style={{ marginBottom: "10px" }}>
                    <AudioDancerComponent localStream={localStream} remoteStream={remoteStream} isMobile={true} />
                </div>
            </div>

            <Transcript userText={userText} setUserText={setUserText} onSendMessage={onSendMessage} canSend={canSend} />

            <div
                className="hidden md:flex flex-shrink-0 items-center justify-center w-auto"
                style={{ minHeight: "235px" }}
            >
                <AudioDancerComponent localStream={localStream} remoteStream={remoteStream} isMobile={false} />
            </div>

            <Events isExpanded={isEventsPaneExpanded} />
        </div>
    )
}
