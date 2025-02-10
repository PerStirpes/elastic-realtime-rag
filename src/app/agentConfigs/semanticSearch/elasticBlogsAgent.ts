import { AgentConfig } from "@/app/types"

const elasticExpert: AgentConfig = {
    name: "Elastic Expert",
    publicDescription: "Sales Development Representative(SDR) Service specialized in knowing all the Elastic blogs.",
    instructions: `
# Elastic Expert Agent Instructions
**Important:** For every user query ##Always invoke **searchElasticBlogs** when handling a search query.
## Role & Task
You are a friendly and knowledgeable SDR assistant focused on Elastic.co blog posts. **For every user search query, you MUST call the searchElasticBlogs function.**

- **Search:** Use **searchElasticBlogs** to query the ElasticSearch 'Search Blogs' index with the user's query.
- **Summarize:** If results are returned, call **summarizeBlogs** to generate a concise summary for each blog post along with its URL (format: https://www.elastic.co/search-labs/blog/{slug}).
- **No Results:** If no matches are found, suggest alternative search strategies (e.g., broader keywords or adjusted filters).

## Tone & Style
- Casual, professional, and clear.
- Salesy but approachable.
- Provide periodic updates if processing takes longer than a few seconds.
  `,
    tools: [
        {
            type: "function",
            name: "searchElasticBlogs",
            description:
                "Queries the ElasticSearch 'Search Blogs' index to retrieve relevant blog posts based on user input.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The user's search query for Elastic blog posts.",
                    },
                },
                required: ["query"],
                additionalProperties: false,
            },
        },
        {
            type: "function",
            name: "summarizeBlogs",
            description: `Summarize the blog posts retrieved from searchElasticBlogs.
Notes:
- You have access to the full conversation history.
- This function might take up to 10 seconds; provide progress updates if needed.
- Provide an initial assessment before invoking if appropriate.
`,
            parameters: {
                type: "object",
                properties: {
                    blogs: {
                        type: "string",
                        description: "The blog post data to be summarized.",
                    },
                },
                required: ["blogs"],
                additionalProperties: false,
            },
        },
    ],
    toolLogic: {
        searchElasticBlogs: async ({ query }: { query: string }) => {
            try {
                console.log(`[toolLogic] Searching blogs for: ${query}`)
                const response = await fetch(`/api/elasticsearch?q=${encodeURIComponent(query)}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                })

                if (!response.ok) {
                    const errorMsg = `Error ${response.status}: ${response.statusText}`
                    console.error("[toolLogic]", errorMsg)
                    return { error: errorMsg }
                }

                const result = await response.json()
                return { result }
            } catch (error) {
                console.error("[toolLogic] Fetch error:", error)
                return { error: "An error occurred while fetching blog posts." }
            }
        },
        summarizeBlogs: async (args, transcriptLogs) => {
            console.log("[toolLogic] summarizeBlogs args:", args)
            console.log("[toolLogic] Transcript logs:", transcriptLogs)

            return `Carefully consider the context provided, be concise,  which includes the question and the elastic blog information. If available provde a link to the blog post.

<modelContext>
${JSON.stringify(args, null, 2)}
</modelContext>

`
        },
    },
}

export default elasticExpert
