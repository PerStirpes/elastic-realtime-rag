export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED"

export interface ToolParameterProperty {
    type: string
    description?: string
    enum?: string[]
    pattern?: string
    properties?: Record<string, ToolParameterProperty>
    required?: string[]
    additionalProperties?: boolean
    items?: ToolParameterProperty
}

export interface ToolParameters {
    type: string
    properties: Record<string, ToolParameterProperty>
    required?: string[]
    additionalProperties?: boolean
}

export interface Tool {
    type: "function"
    name: string
    description: string
    parameters: ToolParameters
}

export interface AgentConfig {
    name: string
    publicDescription: string // gives context to agent transfer tool
    instructions: string
    tools: Tool[]
    toolLogic?: Record<string, (args: any, transcriptLogsFiltered: TranscriptItem[]) => Promise<any> | any>
    downstreamAgents?: AgentConfig[] | { name: string; publicDescription: string }[]
}

export type AllAgentConfigsType = Record<string, AgentConfig[]>

export interface TranscriptItem {
    itemId: string
    type: "MESSAGE" | "BREADCRUMB"
    role?: "user" | "assistant" | "system"
    title?: string
    data?: Record<string, any>
    expanded: boolean
    timestamp: string
    createdAtMs: number
    status: "IN_PROGRESS" | "DONE"
    isHidden: boolean
}

export interface Log {
    id: number
    timestamp: string
    direction: string
    eventName: string
    data: any
    expanded: boolean
    type: string
}

/**
 * Parameters for function calls from the AI to the application
 */
export interface FunctionCallParams {
    name: string
    call_id?: string
    arguments: string
}

export interface ServerEvent {
    type: string
    event_id?: string
    item_id?: string
    transcript?: string
    audio_end_ms?: number
    response_id?: string
    delta?: string
    session?: {
        id?: string
    }
    item?: {
        id?: string
        object?: string
        type?: string
        status?: string
        name?: string
        arguments?: string
        role?: "user" | "assistant" | "system"
        content?: {
            type?: string
            transcript?: string | null
            text?: string
        }[]
    }
    response?: {
        output?: {
            type?: string
            name?: string
            arguments?: any
            call_id?: string
        }[]
        status_details?: {
            error?: any
        }
        usage?: string
        voice?: string
        status?: string
    }
}

export interface LoggedEvent {
    id: number
    direction: "client" | "server"
    expanded: boolean
    timestamp: string
    eventName: string
    eventData: Record<string, any> // can have arbitrary objects logged
}

/**
 * Props for the useRealtimeConnection hook
 */
export interface UseRealtimeConnectionProps {
    selectedAgentName: string
    setSelectedAgentName: (name: string) => void
    selectedAgentConfigSet: AgentConfig[] | null
}

/**
 * Props for the useHandleServerEvent hook
 */
export interface UseHandleServerEventParams {
    setSessionStatus: (status: SessionStatus) => void
    selectedAgentName: string
    selectedAgentConfigSet: AgentConfig[] | null
    sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void
    setSelectedAgentName: (name: string) => void
}

export interface TokenUsage {
    total_tokens: number
    input_tokens: number
    output_tokens: number
    input_token_details?: {
        text_tokens?: number
        audio_tokens?: number
        cached_tokens?: number
        cached_tokens_details?: {
            text_tokens?: number
            audio_tokens?: number
        }
    }
    output_token_details?: {
        text_tokens?: number
        audio_tokens?: number
    }
}

export type AudioDancerComponentProps = {
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    isMobile?: boolean
}

declare global {
    interface Window {
        elasticApm?: {
            init: (config: Record<string, any>) => void
            startTransaction: (name: string, type: string, options?: any) => any
            addLabels: (labels: Record<string, string | number | boolean>) => void
            setUserContext: (user: Record<string, any>) => void
            setCustomContext: (context: Record<string, any>) => void
            addFilter: (fn: (payload: any) => any) => void
            getCurrentTransaction: () => any
            captureError: (error: Error | string, options?: any) => void
        }
        FS?: any
        _fs_host?: string
        _fs_script?: string
        _fs_org?: string
        _fs_namespace?: string
    }
}
