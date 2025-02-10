import { AgentConfig } from "@/app/types"

const medicareAgent: AgentConfig = {
    name: "Medicare Expert",
    publicDescription: "Medicare expert specialized in searching the medcare.gov website.",
    instructions: `
      **Important:** For every user query ##Always invoke **searchMedicare** when handling a search query.
# Personality and Tone
- Identity: A calm, friendly, and knowledgeable Medicare expert.
- Task: Queries the “search-medicare” index to find relevant content and summarizes them with direct URLs.
- Demeanor: Neutral, measured, and helpful.
- Tone: Casual but clear and professional.
- Avoid guesswork; only provide content found in the search.

# Behavior
- If results are found, provide summaries with URLs.
- If no results are found, suggest alternative search keywords or related topics.
- Minimize filler words; “umm” is acceptable but used sparingly.
- Provide partial or streaming updates if possible to keep the user engaged.

# Instructions for Tools
- Call \`searchMedicare\` function with the user’s query to retrieve relevant posts.
- If the search returns results, pass them to \`summarizeContent\`.
- If no results, gently recommend alternative queries or additional filters.


`,
    tools: [
        {
            type: "function",
            name: "searchMedicare",
            description:
                "Queries the medicare index to retrieve relevant information to help answer medicare questions based on user input.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search term or keywords provided by the user.",
                    },
                },
                required: ["query"],
                additionalProperties: false,
            },
        },
        {
            type: "function",
            name: "summarizeContent",
            description: `take medicare information and pass to summarizeContent() for summarization and answer
    Summarizes the blog posts returned by the searchVA function.
        - Provide summaries
        - Note that this can take up to 10 seconds, so please provide small updates to the user every few seconds, like 'I just need a little more time'
         - Feel free to share an initial assessment of potential eligibility with the user before calling this function.
        - Include direct URLs
        - If no results, advise alternative search strategies
  `,
            parameters: {
                type: "object",
                properties: {
                    blogs: {
                        type: "string",
                        description: "answer the user question with the results of the searchVA function",
                    },
                },
                required: ["question"],
                additionalProperties: false,
            },
        },
    ],
    toolLogic: {
        searchMedicare: async ({ query }: { query: string }) => {
            try {
                const response = await fetch(`/api/medicare?q=${encodeURIComponent(query)}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
                console.log("agent file response:", response)
                if (!response.ok) {
                    console.error("Error from server:", response)
                    return { error: "Server error while searching Medicare data." }
                }
                const completion = await response.json()

                return { result: completion }
            } catch (error) {
                console.error("[MedicareExpert] searchMedicare encountered an error:", error)
                return {
                    error: "An unexpected error occurred while searching medicare data.",
                    blogs: [],
                }
            }
        },
        summarizeContent: async (args, transcriptLogs) => {
            console.log("summarizeContent", args)
            console.log("transcriptLogs", transcriptLogs)

            return `Consider the context provided, be concise, which includes the question and Medicare information
  
  <modelContext>
  ${JSON.stringify(args, null, 2)}
  </modelContext>
  
  `
        },
    },
}

export default medicareAgent
