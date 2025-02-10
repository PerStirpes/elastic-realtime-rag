import React from "react"
import { SessionStatus } from "@/app/types"

interface BottomToolbarProps {
    sessionStatus: SessionStatus
    onToggleConnection: () => void
    isPTTActive: boolean
    setIsPTTActive: (val: boolean) => void
    isPTTUserSpeaking: boolean
    handleTalkButtonDown: () => void
    handleTalkButtonUp: () => void
    isEventsPaneExpanded: boolean
    setIsEventsPaneExpanded: (val: boolean) => void
    isAudioPlaybackEnabled: boolean
    setIsAudioPlaybackEnabled: (val: boolean) => void
}

function BottomToolbar({
    sessionStatus,
    onToggleConnection,
    isPTTActive,
    setIsPTTActive,
    isPTTUserSpeaking,
    handleTalkButtonDown,
    handleTalkButtonUp,
    isEventsPaneExpanded,
    setIsEventsPaneExpanded,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
}: BottomToolbarProps) {
    const isConnected = sessionStatus === "CONNECTED"
    const isConnecting = sessionStatus === "CONNECTING"

    function getConnectionButtonLabel() {
        if (isConnected) return "Disconnect"
        if (isConnecting) return "Connecting..."
        return "Connect"
    }

    function getConnectionButtonClasses() {
        const baseClasses = "text-white text-base p-2 w-36 rounded w-full sm:w-36"
        const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer"

        if (isConnected) {
            // Connected -> label "Disconnect" -> red
            return `bg-blue hover:bg-primary ${cursorClass} ${baseClasses}`
        }
        // Disconnected or connecting -> label is either "Connect" or "Connecting" -> black
        return `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`
    }

    return (
        <div className="p-4 flex flex-row items-center justify-center gap-x-8">
            <button onClick={onToggleConnection} className={getConnectionButtonClasses()} disabled={isConnecting}>
                {getConnectionButtonLabel()}
            </button>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <input
                        id="push-to-talk"
                        type="checkbox"
                        checked={isPTTActive}
                        onChange={(e) => setIsPTTActive(e.target.checked)}
                        disabled={!isConnected}
                        className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <label htmlFor="push-to-talk" className="cursor-pointer text-xs sm:text-sm">
                        Push to talk
                    </label>
                </div>
                <button
                    onMouseDown={handleTalkButtonDown}
                    onMouseUp={handleTalkButtonUp}
                    onTouchStart={handleTalkButtonDown}
                    onTouchEnd={handleTalkButtonUp}
                    disabled={!isPTTActive}
                    className={`py-1 px-3 rounded text-xs sm:text-sm cursor-pointer 
            ${!isPTTActive ? "bg-gray-100 text-gray-400" : isPTTUserSpeaking ? "bg-gray-300" : "bg-gray-200"}`}
                >
                    Talk
                </button>

                {/* Audio Playback & Logs – grouped side by side */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <input
                            id="audio-playback"
                            type="checkbox"
                            checked={isAudioPlaybackEnabled}
                            onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
                            disabled={!isConnected}
                            className="w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <label htmlFor="audio-playback" className="cursor-pointer text-xs sm:text-sm">
                            Audio playback
                        </label>
                    </div>
                    <div className="flex items-center gap-1">
                        <input
                            id="logs"
                            type="checkbox"
                            checked={isEventsPaneExpanded}
                            onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
                            className="w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <label htmlFor="logs" className="cursor-pointer text-xs sm:text-sm">
                            Logs
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BottomToolbar
