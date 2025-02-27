import { AgentConfig } from "@/app/types"

const vaAgent: AgentConfig = {
    name: "Veteran Affairs Expert",
    publicDescription: "Veterans Affairs (VA) Service specialized in searching the VA.gov website.",
    instructions: `
    **Important:** For every user query ##Always invoke **searchVA** when handling a search query.
# Personality and Tone
- Identity: A calm, friendly, and knowledgeable Veterans Affairs (VA) Service specialist.
- Task: Queries the **Search VA** index to find relevant content and summarizes them with direct URLs.
- Demeanor: Neutral, measured, and helpful.
- Tone: Casual but clear and professional.
- Avoid guesswork; only provide content found in the search.

# Behavior
- If results are found, provide summaries with URLs.
- If no results are found, suggest alternative search keywords or related topics.
- Minimize filler words; “umm” is acceptable but used sparingly.
- Provide partial or streaming updates if possible to keep the user engaged.
- If the user requests for an email, **Important:** Ask the user for their email and then call the **sendEmail** function.

# Instructions for Tools
- Call \`searchVA\` function with the user’s query to retrieve relevant posts.
- If the search returns results, summarize the content.
- If no results, gently recommend alternative queries or additional filters.
- If the user is satisfied with the results, ask the user for their email and then call \`sendEmail\` to send the results to the user. 
  `,
    tools: [
        {
            type: "function",
            name: "searchVA",
            description:
                "Queries the VA index to retrieve relevant information to help out our nation's Veterans based on user input.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description:
                            "The search term or keywords provided by the user to find relevant VA.gov information.",
                    },
                },
                required: ["query"],
                additionalProperties: false,
            },
        },
        {
            type: "function",
            name: "sendEmail",
            description:
                "**Important:** Ask the user for their email. Constructs the raw email, and dispatches it through a backend endpoint to send the email.",
            parameters: {
                type: "object",
                properties: {
                    email: {
                        type: "string",
                        description: "The recipient's email address.",
                    },
                    transcriptLogs: {
                        type: "string",
                        description: "the most recent transcriptLogs",
                    },
                },
                required: ["email", "transcriptLogs"],
                additionalProperties: false,
            },
        },
    ],
    toolLogic: {
        searchVA: async ({ query }: { query: string }) => {
            console.log(`[toolLogic] Searching VA for: ${query}`)
            const response = await fetch(`/api/va?q=${encodeURIComponent(query)}}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
            if (!response.ok) {
                console.error("Server returned an error:", response)
                return { error: "Something went wrong." }
            }
            const completion = await response.json()
            console.log("searchVA completion", completion)
            return { result: completion }
        },
        sendEmail: async (email, transcriptLogs) => {
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
                    transcriptLogs.filter((log) => log.role !== undefined) as { role: string; title: string }[],
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
                console.error("[MedicareExpert] sendEmail encountered an error:", error)
                return { error: "An unexpected error occurred while sending the email." }
            }
        },
    },
}

export default vaAgent
