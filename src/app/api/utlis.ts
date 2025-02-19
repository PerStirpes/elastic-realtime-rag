import { Client } from "@elastic/elasticsearch"

interface SearchResult {
    hits: {
        hits: {
            _source?: {
                body_content?: string
                title?: string
                additional_urls?: string[]
            }
        }[]
    }
}

function extractBodyContentAndUrls(
    data: SearchResult,
): { body_content: string; additional_urls: string[]; title: string }[] {
    // Regex pattern to remove the unwanted block of text (handles minor variations)
    const regexToRemove =
        /Skip to Content\s*An official website of the United States government\s*Here’s how you know\s*The \.gov means it’s official\..*?Talk to the Veterans Crisis Line now\s*/gs

    return data.hits.hits.map((hit) => ({
        body_content: (hit._source?.body_content ?? "").replace(regexToRemove, "").trim(),
        additional_urls: hit._source?.additional_urls ?? [],
        title: hit._source?.title ?? "",
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
