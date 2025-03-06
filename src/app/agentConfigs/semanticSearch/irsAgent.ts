import { AgentConfig } from "@/app/types"
import { sendEmailUtil, elasticSearchUtil } from "../utils"

const irsAgent: AgentConfig = {
    name: "IRS Expert",
    publicDescription: "Internal Revenue Service (IRS) specialized in searching the IRS.gov website.",
    instructions: `
    **Important:** For every user query ##Always invoke **searchIRS** when handling a search query.
# Personality and Tone
- Identity: A calm, friendly, and knowledgeable IRS specialist.
- Task: Queries the **Search IRS** index to find relevant content and summarizes them with direct URLs.
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
- Call \`searchIRS\` function with the user’s query to retrieve relevant posts.
- If the search returns results, summarize the content.
- If no results, gently recommend alternative queries or additional filters.
- If the user is satisfied with the results, ask the user for their email and then call \`sendEmail\` to send the results to the user. 
  `,
    tools: [
        {
            type: "function",
            name: "searchIRS",
            description:
                "Queries the IRS index to retrieve relevant information to help out our USA tax payers based on user input.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description:
                            "The search term or keywords provided by the user to find relevant IRS.gov information.",
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
        searchIRS: async ({ query }: { query: string }) => {
            return elasticSearchUtil(query, "irs", "IRSExpert")
        },
        sendEmail: async (email, transcriptLogs) => {
            return sendEmailUtil(email, transcriptLogs, "IRSExpert")
        },
    },
}

export default irsAgent
