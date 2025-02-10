"use client"

import React, { createContext, useContext, useState, FC, PropsWithChildren } from "react"
import { v4 as uuidv4 } from "uuid"
import { LoggedEvent } from "@/app/types"

type EventContextValue = {
    loggedEvents: LoggedEvent[]
    logClientEvent: (eventObj: Record<string, any>, eventNameSuffix?: string) => void
    logServerEvent: (eventObj: Record<string, any>, eventNameSuffix?: string) => void
    toggleExpand: (id: number | string) => void
}

const EventContext = createContext<EventContextValue | undefined>(undefined)

export const EventProvider: FC<PropsWithChildren> = ({ children }) => {
    const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([])

    function addLoggedEvent(direction: "client" | "server", eventName: string, eventData: Record<string, any>) {
        async function sendLogEvent(eventData: Record<string, any>) {
            try {
                const response = await fetch("/api/logEvent", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(eventData),
                })

                const result = await response.json()
                if (!response.ok) {
                    console.error("Failed to send log event:", result)
                }
            } catch (error) {
                console.error("Error sending log event:", error)
            }
        }

        const id = eventData.event_id || uuidv4()

        if (eventName === "response.audio_transcript.delta" || eventName === "response.function_call_arguments.delta") {
            console.log("Skipping logging of response.audio_transcript.delta event")
        } else {
            sendLogEvent({ ...eventData, eventName })
        }

        setLoggedEvents((prev) => {
            if (prev.some((e) => e.id === id)) return prev // Avoid duplicates
            return [
                ...prev,
                { id, direction, eventName, eventData, timestamp: new Date().toLocaleTimeString(), expanded: false },
            ]
        })
    }

    const logClientEvent: EventContextValue["logClientEvent"] = (eventObj, eventNameSuffix = "") => {
        const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim()
        addLoggedEvent("client", name, eventObj)
    }

    const logServerEvent: EventContextValue["logServerEvent"] = (eventObj, eventNameSuffix = "") => {
        const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim()
        addLoggedEvent("server", name, eventObj)
    }

    const toggleExpand: EventContextValue["toggleExpand"] = (id) => {
        setLoggedEvents((prev) =>
            prev.map((log) => {
                if (log.id === id) {
                    return { ...log, expanded: !log.expanded }
                }
                return log
            }),
        )
    }

    return (
        <EventContext.Provider value={{ loggedEvents, logClientEvent, logServerEvent, toggleExpand }}>
            {children}
        </EventContext.Provider>
    )
}

export function useEvent() {
    const context = useContext(EventContext)
    if (!context) {
        throw new Error("useEvent must be used within an EventProvider")
    }
    return context
}
