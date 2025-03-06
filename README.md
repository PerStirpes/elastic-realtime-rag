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

- To see how to define tools and toolLogic, including a background LLM call, see [src/app/agentConfigs/semanticSearch/elasticBlogsAgent.ts](src/app/agentConfigs/semanticSearch/elasticBlogsAgent.ts)

## UI

- You can automatically switch to a specific agent with the Agent dropdown.
- The conversation transcript is on the left, including tool calls, tool call responses, and agent changes. Click to expand non-message elements.
- The event log is on the right, showing both client and server events. Click to see the full payload.
- On the bottom, you can disconnect, toggle between automated voice-activity detection or PTT, turn off audio playback, and toggle logs.

## System Architecture and Data Flow

```
                                                                +-------------------+
                                                                |                   |
                                                                |   OpenTelemetry   |
                                 +--------------------------->  |   Collectors      |
                                 |                              |                   |
                                 |                              +--------+----------+
                                 |                                       |
                                 |                                       v
                                 |                              +-----------------+
                                 |                              |                 |
                                 |                              |   Elastic       |
                                 |                              |   Search        |
                                 |                              |                 |
                                 |                              +-----------------+
                                 |
+-------------+                  |                              +------------------+
|             |                  |                              |                  |
|  Browser    |    +---------+   |    +------------+            |   Elasticsearch  |
|  Client     | <--+ Next.js  +---+    |            |           |   Service (API)  |
|             | +-->  App    <---------+  OpenAI    |           |                  |
+------+------+ |  |         | +------>  Realtime   |           +--------+---------+
       ^        |  +---------+ |       |  API       |                    ^
       |        |              |       |            |                    |
       |        |  +---------+ |       +------------+                    |
       |        |  |         | |                                         |
       +--------+--+ Events  +-+                                         |
                |  | Context | +-------------------> +--------------+    |
                |  |         |                       |              |    |
                |  +---------+                       |  Medicare    +----+
                |                                    |  VA API      |
                |  +---------+                       |  Services    |
                |  |         |                       |              |
                |  | Agent   |                       +--------------+
                |  | Configs |
                |  |         |
                |  +---------+
                |
                |  +---------+
                |  |         |                       +---------------+
                |  | Client  +----------------------->               |
                |  | Telemetry+----------------------> Telemetry     |
                |  |         <---------------------+ | Endpoint      |
                |  +---------+                       +-------+-------+
                                                             |
                                                             v
                                                     +---------------+
                                                     |               |
                                                     | Observability |
                                                     | & Monitoring  |
                                                     |               |
                                                     +---------------+
```

## Component Description

### Client-Side Components

1. **Browser Client**: The user interface where users interact with the application.

2. **Next.js App**: The main web application framework:

    - Renders the UI
    - Manages client-side routing
    - Serves as the application container

3. **Events Context**: Manages the state of events in the application:

    - Tracks event streams
    - Maintains event history
    - Provides event dispatching

4. **Agent Configs**: Contains configuration for various AI agents:

    - Defines agent behaviors
    - Specifies metadata and capabilities
    - Configures agent-specific parameters

5. **Client Telemetry**: Collects client-side metrics and events:
    - Captures user interactions
    - Monitors performance
    - Tracks usage patterns
    - Records token usage

### Server-Side Components

1. **OpenAI Realtime API**: The core AI service:

    - Processes realtime requests
    - Handles streaming responses
    - Manages conversation context
    - Provides tool calling capabilities

2. **Elasticsearch Service**: Knowledge base for semantic search:

    - Indexes documents
    - Provides vector search capabilities
    - Stores searchable content

3. **Medicare/VA API Services**: Domain-specific data providers:

    - Offer structured data access
    - Provide specialized information
    - Support agent knowledge base

4. **Telemetry Endpoint**: Central collection point for metrics:

    - Receives client-side telemetry
    - Processes and aggregates metrics
    - Forwards data to observability systems

5. **OpenTelemetry Collectors**: Distributed tracing infrastructure:

    - Collects traces and spans
    - Processes telemetry data
    - Routes to storage backends

6. **Elastic Search (Observability)**: Storage for monitoring data:

    - Long-term metrics storage
    - Enables data visualization
    - Supports observability

7. **Observability & Monitoring**: Analysis of system health:
    - Dashboards for system metrics
    - Alerting on anomalies
    - Performance monitoring

## Data Flow

### Primary Flows

1. **User Interaction Flow**:

    - User interacts with Browser Client
    - Next.js App processes interactions
    - Requests flow to OpenAI Realtime API
    - Responses return through the Events Context
    - UI updates with received data

2. **Knowledge Base Flow**:

    - OpenAI calls for external data
    - Requests route to Elasticsearch Service
    - Domain services (Medicare/VA) provide specialized data
    - Data flows back to OpenAI for context augmentation
    - Results incorporate into responses

3. **Telemetry Flow**:
    - Client Telemetry collects metrics
    - Data transmits to Telemetry Endpoint
    - OpenTelemetry processes and aggregates
    - Metrics store in Elastic Search
    - Observability tools visualize the data

### Bidirectional Communications

1. **Client ↔ Server**:

    - Browser ↔ Next.js: UI rendering and user input
    - Next.js ↔ OpenAI: AI requests and streaming responses
    - Client ↔ Telemetry: Metrics collection and status feedback

2. **Server ↔ Services**:
    - Next.js ↔ Elasticsearch: Knowledge retrieval
    - Next.js ↔ Domain APIs: Specialized data access
    - Telemetry ↔ Observability: Monitoring and analysis

## Key Features

1. **Realtime Response**:

    - Streaming AI responses
    - Immediate feedback loops
    - Progressive rendering

2. **Context Awareness**:

    - Persistent conversation state
    - Knowledge augmentation
    - Domain-specific understanding

3. **Comprehensive Telemetry**:

    - Token usage tracking (including cached tokens)
    - Performance metrics
    - Error monitoring
    - Response quality analysis

4. **Specialized Agents**:
    - Domain-configured behaviors
    - Targeted knowledge bases
    - Use-case optimized responses

## Core Contributors

- Noah MacCallum - [noahmacca](https://x.com/noahmacca)
- Ilan Bigio - [ibigio](https://github.com/ibigio)

- and now me, since this repo has changed quite a bit
