import { AgentConfig } from "@/app/types"
import { instrumentToolLogic } from "./openai-realtime-instrumentation"

/**
 * Instruments all toolLogic functions in an agent configuration
 * 
 * @param agent The agent configuration to instrument
 * @returns A new agent configuration with instrumented toolLogic
 */
export function instrumentAgent(agent: AgentConfig): AgentConfig {
    // Create a new object to avoid modifying the original
    const instrumentedAgent = { ...agent }
    
    // Instrument the toolLogic if it exists
    if (instrumentedAgent.toolLogic && typeof instrumentedAgent.toolLogic === 'object') {
        instrumentedAgent.toolLogic = instrumentToolLogic(instrumentedAgent.toolLogic)
    }
    
    return instrumentedAgent
}

/**
 * Instruments all toolLogic functions in an array of agent configurations
 * 
 * @param agents Array of agent configurations to instrument
 * @returns A new array of agent configurations with instrumented toolLogic
 */
export function instrumentAgents(agents: AgentConfig[]): AgentConfig[] {
    return agents.map(agent => instrumentAgent(agent))
}

/**
 * Instruments all toolLogic functions in a set of agent configuration sets
 * 
 * @param agentSets Object containing sets of agent configurations
 * @returns A new object with all agent configurations instrumented
 */
export function instrumentAllAgentSets<T extends Record<string, AgentConfig[]>>(agentSets: T): T {
    const result: Record<string, AgentConfig[]> = {}
    
    // Iterate through each set and instrument all agents in it
    for (const [key, agents] of Object.entries(agentSets)) {
        result[key] = instrumentAgents(agents)
    }
    
    return result as T
}