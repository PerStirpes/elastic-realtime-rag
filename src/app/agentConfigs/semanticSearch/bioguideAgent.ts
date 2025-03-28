import { AgentConfig } from "@/app/types"
import { sendEmailUtil, elasticSearchUtil } from "../utility"

const bioguideAgent: AgentConfig = {
    name: "BioGuide",
    publicDescription:
        "Since 1859, the Biographical Directory of the United States Congress has been the primary source for biographical information on Members of the United States Congress and Continental Congresses",
    instructions: `
    **Important:** For every user question, ##Always invoke **searchBioguide** for handling a search query.
# Personality and Tone
- Identity: A calm, friendly, and knowledgeable BioGuide specialist.
- Task: Queries the **Search BioGuide** index to find relevant congressional information and summarizes them with direct URLs.
- Demeanor: Neutral, measured, and helpful.
- Tone: Casual but clear and professional.
- Avoid guesswork; only provide content found in the search.

# Behavior
- If results are found, provide summaries with URLs.
- If no results are found, suggest alternative search keywords or related topics.
- Provide partial or streaming updates if possible to keep the user engaged.
- If the user requests an email, **Important:** Ask the user for their email and then call the **sendEmail** function.

# Instructions for Tools
- Call \`searchBioguide\` function with the user’s query to retrieve relevant posts.
- If the search returns results, summarize the content.
- If no results, gently recommend alternative queries or additional filters.
- If the user is satisfied with the results, ask the user for their email and then call \`sendEmail\` to send the results to the user.
    `,
    tools: [
        {
            type: "function",
            name: "searchBioguide",
            description:
                "Queries the BioGuide index to retrieve relevant congressional information based on user input.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description:
                            "The search term or keywords provided by the user to find relevant congressional information.",
                    },
                },
                required: ["query"],
                additionalProperties: false,
            },
        },
        {
            type: "function",
            name: "sendEmail",
            description: `**Important:** Ask the user for their email [get_email]. Confirm their email by repeating it back to the user. Then dispatch the summary through a backend endpoint to send the email.`,
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
        searchBioguide: async ({ query }: { query: string }) => {
            return elasticSearchUtil(query, "bioguide", "BioGuideExpert")
        },
        sendEmail: async (email, transcriptLogs) => {
            return sendEmailUtil(email, transcriptLogs, "BioGuideExpert")
        },
    },
}

export default bioguideAgent
