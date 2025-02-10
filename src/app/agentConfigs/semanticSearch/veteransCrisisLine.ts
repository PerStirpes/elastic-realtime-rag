import { AgentConfig } from "@/app/types"

const veteransCrisisLine: AgentConfig = {
    name: "CrisisLineExpert",
    publicDescription: "Agent that is currently under development.",
    instructions:
        "Please state you are under development and will be available soon. However, I can transfer you to a Medicare, VA, or Elastic expert.",
    tools: [],
}

// const veteransCrisisLine: AgentConfig = {
//     name: "CrisisLineExpert",
//     publicDescription:
//         "A friendly and knowledgeable Veterans Affairs (VA) service agent, specialized in searching the VA.gov website using a RAG-based approach.",
//     instructions: `
// # Personality and Tone
// - Identity: A calm, friendly, and knowledgeable VA expert.
// - Task: Queries the “Search VA” index to find relevant blog posts and summarizes them with direct URLs.
// - Demeanor: Neutral, measured, and helpful.
// - Tone: Casual but clear and professional.
// - Avoid guesswork; only provide content found in the search.

// # Behavior
// - If results are found, provide concise summaries with URLs.
// - If no results are found, suggest alternative search keywords or related topics.
// - Minimize filler words; “umm” is acceptable but used sparingly.
// - Provide partial or streaming updates if possible to keep the user engaged.

// # Instructions for Tools
// - Call \`searchVA\` function with the user’s query to retrieve relevant posts.
// - If the search returns results, pass them to \`summarizeBlogs\`.
// - If no results, gently recommend alternative queries or additional filters.
// `,

//     // Two "functions" (tools) the agent can use
//     tools: [
//         {
//             type: "function",
//             name: "searchVA",
//             description: "Queries the VA index to retrieve relevant blog posts or content from VA.gov.",
//             parameters: {
//                 type: "object",
//                 properties: {
//                     query: {
//                         type: "string",
//                         description: "The search term or keywords provided by the user.",
//                     },
//                 },
//                 required: ["query"],
//                 additionalProperties: false,
//             },
//         },
//         {
//             type: "function",
//             name: "summarizeBlogs",
//             description: `
//         Summarizes the blog posts returned by the searchVA function.
//         - Provide concise summaries
//         - Include direct URLs
//         - If no results, advise alternative search strategies
//       `,
//             parameters: {
//                 type: "object",
//                 properties: {
//                     question: {
//                         type: "string",
//                         description: "The user's original query or question.",
//                     },
//                     blogs: {
//                         type: "array",
//                         items: {
//                             type: "object",
//                             properties: {
//                                 title: { type: "string" },
//                                 url: { type: "string" },
//                                 excerpt: { type: "string" },
//                             },
//                             required: ["title", "url"],
//                         },
//                         description: "A list of blog posts related to the query.",
//                     },
//                 },
//                 required: ["question", "blogs"],
//                 additionalProperties: false,
//             },
//         },
//     ],

//     // Implementation of the tools' logic
//     toolLogic: {
//         searchVA: async ({ query }) => {
//             console.log(`[VAExpert] Searching for VA data with query: ${query}`)

//             try {
//                 const response = await fetch(`/api/va?q=${encodeURIComponent(query)}`, {
//                     method: "GET",
//                     headers: {
//                         "Content-Type": "application/json",
//                     },
//                 })

//                 if (!response.ok) {
//                     console.error("Error from server:", response)
//                     return { error: "Server error while searching VA data." }
//                 }

//                 const result = await response.json()

//                 // Return an array of blog posts (or an empty array if none found)
//                 return {
//                     blogs: Array.isArray(result) ? result : [],
//                     message: result.length ? "" : "No VA data found for this query.",
//                 }
//             } catch (error) {
//                 console.error("[VAExpert] searchVA encountered an error:", error)
//                 return {
//                     error: "An unexpected error occurred while searching VA data.",
//                     blogs: [],
//                 }
//             }
//         },

//         summarizeBlogs: async ({ question, blogs }, transcriptLogs) => {
//             console.log("[VAExpert] Summarizing Blogs...")
//             console.log("question:", question)
//             console.log("blogs:", blogs)
//             console.log("transcriptLogs:", transcriptLogs)

//             if (!blogs || blogs.length === 0) {
//                 return `
// I couldn't find any matching information for "${question}".
// Here are some ideas for refining your search:
//   • Try broader keywords (e.g., "VA benefits" instead of "fee schedule").
//   • Check for related topics (veterans health, VA home loans, GI Bill, etc.).
//   • Make sure your spelling is correct or simplify your query.
// `
//             }

//             // Example: Summarize each blog post
//             // const summaries = blogs
//             //     .map((b, idx) => {
//             //         return `${idx + 1}. **${b.title}**\nURL: ${b.url}\nExcerpt: ${b.excerpt}\n`
//             //     })
//             //     .join("\n")
//             // add this back below   ${question} ${summaries}

//             return `
// **Search Results for:** ${question}

// If you need more details, feel free to ask or refine your query.
// `
//         },
//     },
// }

export default veteransCrisisLine
