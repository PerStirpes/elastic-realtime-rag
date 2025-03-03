import { AgentConfig } from "@/app/types"
import { sendEmailUtil, elasticSearchUtil } from "../utils"

const medicareAgent: AgentConfig = {
    name: "Medicare Expert",
    publicDescription: "Medicare expert specialized in searching the medicare.gov website.",
    instructions: `
      **Important:** For every user query ##Always invoke **searchMedicare** when handling a search query.
# Personality and Tone
- Identity: A calm, friendly, and knowledgeable Medicare expert.
- Task: Queries the “search-medicare” index to find relevant content and summarizes them with direct URLs.
- Task: If the user requests for an email  **Important:** Ask user for their email and call the **sendEmail** function. 
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
- If the user is satisfied with the results, Ask the user for their email and then call \`sendEmail\` to send the results to the user. 
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
        - If no results, advise alternative search strategies `,
            parameters: {
                type: "object",
                properties: {
                    args: {
                        type: "string",
                    },
                    transcriptLogs: {
                        type: "string",
                    },
                },
                required: ["args", "transcriptLogs"],
                additionalProperties: true,
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
        searchMedicare: async ({ query }: { query: string }) => {
            return elasticSearchUtil(query, "medicare", "MedicareExpert");
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
        sendEmail: async (email, transcriptLogs) => {
            return sendEmailUtil(email, transcriptLogs, "MedicareExpert");
        },
    },
}

export default medicareAgent
