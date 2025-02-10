import { Client } from "@elastic/elasticsearch"

interface SearchResult {
    hits: {
        hits: {
            _source?: {
                body_content?: string
                additional_urls?: string[]
            }
        }[]
    }
}
function extractBodyContentAndUrls(data: SearchResult): { body_content: string; additional_urls: string[] }[] {
    return data.hits.hits.map((hit) => ({
        body_content: hit._source?.body_content ?? "",
        additional_urls: hit._source?.additional_urls ?? [],
    }))
}

const esNode = process.env.ELASTICSEARCH_CAPSTONE_URL
const esApiKey = process.env.ELASTICSEARCH_CAPSTONE_API_KEY

if (!esNode || !esApiKey) {
    throw new Error("Elasticsearch environment variables are not set.")
}

const esClient = new Client({
    node: esNode,
    auth: { apiKey: esApiKey },
})

export type { SearchResult }
export { esClient, extractBodyContentAndUrls }
