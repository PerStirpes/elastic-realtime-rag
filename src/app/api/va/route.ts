import { NextRequest, NextResponse } from "next/server"
import { esClient, SearchResult, extractBodyContentAndUrls } from "../utlis"

export async function GET(request: NextRequest) {
    try {
        const query = request.nextUrl.searchParams.get("q")
        console.log("Query param is:", query)

        if (!query) {
            return NextResponse.json(
                {
                    error: "No search query provided",
                },
                { status: 400 },
            )
        }

        const esQuery = {
            retriever: {
                rrf: {
                    retrievers: [
                        {
                            standard: {
                                query: {
                                    multi_match: {
                                        query: query,
                                        fields: ["title", "body_content"],
                                    },
                                },
                            },
                        },
                        {
                            standard: {
                                query: {
                                    nested: {
                                        path: "semantic_text.inference.chunks",
                                        query: {
                                            sparse_vector: {
                                                inference_id: "obs_ai_assistant_kb_inference",
                                                field: "semantic_text.inference.chunks.embeddings",
                                                query: query,
                                            },
                                        },
                                        inner_hits: {
                                            size: 2,
                                            name: "search-va.semantic_text",
                                            _source: ["semantic_text.inference.chunks.text"],
                                        },
                                    },
                                },
                            },
                        },
                    ],
                    rank_window_size: 5,
                    rank_constant: 1,
                },
            },
            size: 3,
            fields: ["title", "body_content", "additional_urls"],
        }

        const searchResult = await esClient.search<SearchResult>({
            index: "search-va",
            body: esQuery,
        })

        const extractedData = extractBodyContentAndUrls(searchResult as SearchResult)

        return NextResponse.json({
            results: extractedData,
        })
    } catch (error) {
        console.error("Elasticsearch search error:", error)
        return NextResponse.json(
            {
                error: "Failed to perform search",
            },
            { status: 500 },
        )
    }
}
