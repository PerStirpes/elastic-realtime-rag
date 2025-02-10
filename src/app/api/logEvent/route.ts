import { NextResponse } from "next/server"
import { Client } from "@elastic/elasticsearch"

const esNode = process.env.ELASTICSEARCH_CAPSTONE_URL
const esApiKey = process.env.ELASTICSEARCH_LOGSAI_API_KEY

if (!esNode || !esApiKey) {
    throw new Error("Elasticsearch environment variables are not set.")
}

const esClient = new Client({
    node: esNode,
    auth: { apiKey: esApiKey },
})

export async function POST(request: Request) {
    try {
        // Parse the JSON payload from the request.
        const eventData = await request.json()
        eventData["@timestamp"] = new Date().toISOString()

        // Create an index name using the current date.

        const indexName = `logs-ai`

        // Index the document into Elasticsearch.
        const result = await esClient.index({
            index: indexName,
            document: eventData,
        })

        return NextResponse.json({ result: "success", esResult: result })
    } catch (error) {
        console.error("Error indexing document:", error)
        return NextResponse.json({ error: "Error indexing document", details: error }, { status: 500 })
    }
}
