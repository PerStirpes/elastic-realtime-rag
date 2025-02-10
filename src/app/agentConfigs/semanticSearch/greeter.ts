import { AgentConfig } from "@/app/types"

const greeter: AgentConfig = {
    name: "greeter",
    publicDescription: "Agent that greets the user.",
    instructions: `Please greet the user and explicitly explain and repeat that this application is an agent-based conversational interface that implements a Retrieval Augmented Generation (RAG) approach by leveraging an Elastic vector database. When a user interacts with the system, the greeter agent first welcomes and guides them. For more specific inquiries—I can transfer you to a specialized agent {List the available agents and their functions, and provide a brief description of each agent's role and capabilities.} and indicate to the user that they can be transferred to a specialized agent for more detailed assistance.`,
    tools: [],
}

export default greeter
