# Realtime API Agents RAG Demo

This is a simple demonstration of more advanced, agentic patterns built on top of the Realtime API. In particular, this demonstrates:

- Sequential agent handoffs according to a defined agent graph (taking inspiration from [OpenAI Swarm](https://github.com/openai/swarm))
- Retrieves context from a elastic vector db and passes to llm.

You should be able to use this repo to prototype your own multi-agent realtime voice app in less than 20 minutes!

![Screenshot of the Realtime API Agents Demo](/public/screenshot.png)

## Setup

- This is a Next.js typescript app
- Install dependencies with `npm i`
- Add your `OPENAI_API_KEY` to your env
- Start the server with `npm run dev`
- Open your browser to [http://localhost:3000](http://localhost:3000) to see the app. It should automatically connect to the `semanticSearch` Agent Set.

### Next steps

- Check out the configs in `src/app/agentConfigs`. The example above is a minimal demo that illustrates the core concepts.

### Defining your own agents

- To see how to define tools and toolLogic, including a background LLM call, see [src/app/agentConfigs/semanticSearch/elasticBlogs.ts](src/app/agentConfigs/semanticSearch/elasticBlogs.ts)

## UI

- You can automatically switch to a specific agent with the Agent dropdown.
- The conversation transcript is on the left, including tool calls, tool call responses, and agent changes. Click to expand non-message elements.
- The event log is on the right, showing both client and server events. Click to see the full payload.
- On the bottom, you can disconnect, toggle between automated voice-activity detection or PTT, turn off audio playback, and toggle logs.

## Core Contributors

- Noah MacCallum - [noahmacca](https://x.com/noahmacca)
- Ilan Bigio - [ibigio](https://github.com/ibigio)
