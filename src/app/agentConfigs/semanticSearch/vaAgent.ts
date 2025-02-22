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

# Instructions for Tools
- Call \`searchVA\` function with the user’s query to retrieve relevant posts.
- If the search returns results, summarize the content.
- If no results, gently recommend alternative queries or additional filters.
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
        //         {
        //             type: "function",
        //             name: "summarizeBlogs",
        //             description: `take VA information and pass to summarizeBlogs() for summarization and answer

        //   # Details
        //   - Note that this agent has access to the full conversation history,.

        //   - Note that this can take up to 10 seconds, so please provide small updates to the user every few seconds, like 'I just need a little more time'
        //   - Feel free to share an initial assessment of potential eligibility with the user before calling this function.
        //   - If you can't find the answer, suggest general information about the question.
        //   `,
        //             parameters: {
        //                 type: "object",
        //                 properties: {
        //                     blogs: {
        //                         type: "string",
        //                         description: "answer the user question with the results of the searchVA function",
        //                     },
        //                 },
        //                 required: ["question"],
        //                 additionalProperties: false,
        //             },
        //         },
    ],
    toolLogic: {
        searchVA: async ({ query }) => {
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
        //         summarizeBlogs: async (args, transcriptLogs) => {
        //             console.log("summarizeBlogs", args)
        //             console.log("transcriptLogs", transcriptLogs)

        //             return `Consider the context provided, be concise, which includes the question and the VA articles.

        //   <modelContext>
        //   ${JSON.stringify(args, null, 2)}
        //   </modelContext>

        //   `
        //         },
    },
}

export default vaAgent
