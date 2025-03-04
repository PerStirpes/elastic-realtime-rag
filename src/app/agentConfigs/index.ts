import { AllAgentConfigsType } from "@/app/types"
import semanticSearchAgents from "./semanticSearch"
import { instrumentAllAgentSets } from "@/app/lib/instrumentAgentConfigs"

// Apply instrumentation to all agent sets
const instrumentedAgentSets = instrumentAllAgentSets({
    semanticSearch: semanticSearchAgents,
})

export const allAgentSets: AllAgentConfigsType = instrumentedAgentSets

export const defaultAgentSetKey = "semanticSearch"
