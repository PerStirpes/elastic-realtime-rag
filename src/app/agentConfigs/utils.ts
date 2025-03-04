import { AgentConfig, Tool } from "@/app/types"
import { instrumentToolFunction, instrumentToolLogic } from "@/app/lib/openai-realtime-instrumentation"

/**
 * Shared Elasticsearch utility for fetching data from different endpoints
 */
export const elasticSearchUtil = instrumentToolFunction(
    "elasticSearchUtil",
    async (query: string, endpoint: string, agentName: string = "Agent") => {
        try {
            console.log(`[${agentName}] Searching ${endpoint} for: ${query}`)

            const response = await fetch(`/api/${endpoint}?q=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                console.error(`Error from server when searching ${endpoint}:`, response)
                return { error: `Server error while searching ${endpoint} data.` }
            }

            const completion = await response.json()
            return { result: completion }
        } catch (error) {
            console.error(`[${agentName}] search${endpoint} encountered an error:`, error)
            return {
                error: `An unexpected error occurred while searching ${endpoint} data.`,
                results: [],
            }
        }
    }
)

/**
 * Shared email utility for sending conversation transcripts via email
 */
export const sendEmailUtil = instrumentToolFunction(
    "sendEmailUtil",
    async (email: any, transcriptLogs: any, agentName: string = "Agent") => {
        try {
            function extractTitleAndRole(
                transcriptLogs: { role: string | undefined; title: string }[],
            ): { title: string; role: string }[] {
                return transcriptLogs
                    .filter(
                        ({ role, title }) =>
                            role &&
                            (role === "user" || role === "assistant") &&
                            !/^hi\b|^hello\b/i.test(title) &&
                            !/\[inaudible\]/i.test(title),
                    )
                    .map(({ title, role }) => ({ title, role: role as string }))
            }

            const filteredTitles = extractTitleAndRole(
                transcriptLogs.filter((log: any) => log.role !== undefined) as { role: string; title: string }[],
            )

            console.log("filteredTitles", filteredTitles)

            const response = await fetch(`/api/sendEmail`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: email, message: filteredTitles }),
            })

            if (!response.ok) {
                console.error("Error from server:", response)
                return { error: "Server error while sending email." }
            }

            const result = await response.json()
            console.log("result", result)
            return { result }
        } catch (error) {
            console.error(`[${agentName}] sendEmail encountered an error:`, error)
            return { error: "An unexpected error occurred while sending the email." }
        }
    }
)

/**
 * This defines and adds "transferAgents" tool dynamically based on the specified downstreamAgents on each agent.
 */
export function injectTransferTools(agentDefs: AgentConfig[]): AgentConfig[] {
    // Iterate over each agent definition
    agentDefs.forEach((agentDef) => {
        const downstreamAgents = agentDef.downstreamAgents || []

        // Only proceed if there are downstream agents
        if (downstreamAgents.length > 0) {
            // Build a list of downstream agents and their descriptions for the prompt
            const availableAgentsList = downstreamAgents
                .map((dAgent) => `- ${dAgent.name}: ${dAgent.publicDescription ?? "No description"}`)
                .join("\n")

            // Create the transfer_agent tool specific to this agent
            const transferAgentTool: Tool = {
                type: "function",
                name: "transferAgents",
                description: `Triggers a transfer of the user to a more specialized agent. 
  Calls escalate to a more specialized agent, with additional context. 
  Let the user know you're about to transfer them before doing so.
  
  Available Agents:
  ${availableAgentsList}
        `,
                parameters: {
                    type: "object",
                    properties: {
                        rationale_for_transfer: {
                            type: "string",
                            description: "The reasoning why this transfer is needed.",
                        },
                        conversation_context: {
                            type: "string",
                            description:
                                "Relevant context from the conversation that will help the recipient perform the correct action.",
                        },
                        destination_agent: {
                            type: "string",
                            description:
                                "The more specialized destination_agent that should handle the user's intended request.",
                            enum: downstreamAgents.map((dAgent) => dAgent.name),
                        },
                    },
                    required: ["rationale_for_transfer", "conversation_context", "destination_agent"],
                },
            }

            // Ensure the agent has a tools array
            if (!agentDef.tools) {
                agentDef.tools = []
            }

            // Add the newly created tool to the current agent's tools
            agentDef.tools.push(transferAgentTool)
        }

        // so .stringify doesn't break with circular dependencies
        agentDef.downstreamAgents = agentDef.downstreamAgents?.map(({ name, publicDescription }) => ({
            name,
            publicDescription,
        }))
        
        // Instrument the toolLogic if it exists
        if (agentDef.toolLogic && typeof agentDef.toolLogic === 'object') {
            agentDef.toolLogic = instrumentToolLogic(agentDef.toolLogic)
        }
    })

    return agentDefs
}