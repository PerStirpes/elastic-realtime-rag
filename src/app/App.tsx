"use client"

import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

// Components
import { Header } from "./components/Header"
import { Main } from "./components/Main"
import BottomToolbar from "./components/BottomToolbar"

// Custom hooks
import { useAgentSelection } from "./hooks/useAgentSelection"
import { useRealtimeConnection } from "./hooks/useRealtimeConnection"
import { useEventsPaneState } from "./hooks/useEventsPaneState"

// Loading component for Suspense
function Loading() {
    return <div>Loading...</div>
}

// Error Fallback component
function ErrorFallback({ error }: { error: Error }) {
    return (
        <div role="alert">
            <p>Something went wrong:</p>
            <pre style={{ color: "red" }}>{error.message}</pre>
        </div>
    )
}

function Logic() {
    // Use custom hooks for different aspects of the application
    const { 
        selectedAgentName, 
        setSelectedAgentName,
        selectedAgentConfigSet, 
        handleSelectedAgentChange, 
        agentSetKey
    } = useAgentSelection();
    
    const { isEventsPaneExpanded, setIsEventsPaneExpanded } = useEventsPaneState();
    
    const { 
        sessionStatus,
        localStream,
        remoteStream,
        isPTTActive,
        setIsPTTActive,
        isPTTUserSpeaking,
        isAudioPlaybackEnabled,
        setIsAudioPlaybackEnabled,
        userText,
        setUserText,
        onToggleConnection,
        handleSendTextMessage,
        handleTalkButtonDown,
        handleTalkButtonUp,
        canSend
    } = useRealtimeConnection({ 
        selectedAgentName, 
        setSelectedAgentName,
        selectedAgentConfigSet 
    });

    // Note: All connection-related functions are now in the useRealtimeConnection hook


    // Note: The handleSendTextMessage function is now provided by the useRealtimeConnection hook

    // Note: The PTT handler functions are now provided by the useRealtimeConnection hook

    // Note: The onToggleConnection function is now provided by the useRealtimeConnection hook

    // Note: The handleSelectedAgentChange function is now provided by the useAgentSelection hook

    // Note: The localStorage effects are now handled in the respective custom hooks

    // Note: agentSetKey is now provided by the useAgentSelection hook

    return (
        <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
            <Header 
                agentSetKey={agentSetKey}
                selectedAgentName={selectedAgentName}
                selectedAgentConfigSet={selectedAgentConfigSet}
                onAgentChange={handleSelectedAgentChange}
            />
            
            <Main
                userText={userText}
                setUserText={setUserText}
                onSendMessage={handleSendTextMessage}
                canSend={canSend}
                localStream={localStream}
                remoteStream={remoteStream}
                isEventsPaneExpanded={isEventsPaneExpanded}
            />
            
            <BottomToolbar
                sessionStatus={sessionStatus}
                onToggleConnection={onToggleConnection}
                isPTTActive={isPTTActive}
                setIsPTTActive={setIsPTTActive}
                isPTTUserSpeaking={isPTTUserSpeaking}
                handleTalkButtonDown={handleTalkButtonDown}
                handleTalkButtonUp={handleTalkButtonUp}
                isEventsPaneExpanded={isEventsPaneExpanded}
                setIsEventsPaneExpanded={setIsEventsPaneExpanded}
                isAudioPlaybackEnabled={isAudioPlaybackEnabled}
                setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
            />
        </div>
    )
}

export default function App() {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<Loading />}>
                <Logic />
            </Suspense>
        </ErrorBoundary>
    )
}
