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

function extractBodyContentAndUrls(data: SearchResult): {
    body_content: string
    additional_urls: string[]
}[] {
    // todo remove, this was moved into elastic, need to reprocess the index
    // Regex pattern to remove the unwanted block of text (handles minor variations)
    const regexToRemove =
        /Skip to Content\s*An official website of the United States government\s*Here’s how you know\s*The \.gov means it’s official\..*?Talk to the Veterans Crisis Line now\s*/gs

    return data.hits.hits.map((hit) => ({
        body_content: (hit._source?.body_content ?? "").replace(regexToRemove, "").trim(),
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

async function collectWebRTCStats(peerConnection: { getStats: () => any }) {
    const stats = await peerConnection.getStats()
    const statsReport: {
        type: any
        timestamp: any
        packetsLost: any
        jitter: any
        roundTripTime: any
        bitrate: any
    }[] = []

    stats.forEach(
        (report: {
            type: string
            timestamp: any
            packetsLost: any
            jitter: any
            roundTripTime: any
            bytesSent: any
            bytesReceived: any
        }) => {
            if (report.type === "inbound-rtp" || report.type === "outbound-rtp") {
                statsReport.push({
                    type: report.type,
                    timestamp: report.timestamp,
                    packetsLost: report.packetsLost,
                    jitter: report.jitter,
                    roundTripTime: report.roundTripTime,
                    bitrate: report.bytesSent || report.bytesReceived,
                })
            }
        },
    )
    try {
        console.log("Sending statsReport:", statsReport)
        const response = await fetch("/api/webrtc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stats: statsReport }),
        })

        // Log failure details if the response is not OK
        if (!response.ok) {
            console.warn("Telemetry request failed:", response.status, await response.text())
        }
    } catch (error) {
        console.error("Error sending telemetry:", error)
    }
    return statsReport
}

export type { SearchResult }
export { esClient, extractBodyContentAndUrls, collectWebRTCStats }
