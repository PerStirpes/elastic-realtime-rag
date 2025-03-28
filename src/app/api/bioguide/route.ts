import { NextRequest, NextResponse } from "next/server"
import { esClient, SearchResult } from "../utility"

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
                                        fields: [
                                            "familyName",
                                            "givenName",
                                            "unaccentedMiddleName",
                                            "unaccentedGivenName",
                                            "unaccentedFamilyName",
                                            "relationship.relatedTo.unaccentedGivenName",
                                            "relationship.relatedTo.unaccentedFamilyName",
                                            "bioDisplayName",
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            standard: {
                                query: {
                                    nested: {
                                        path: "profileText_semantic.inference.chunks",
                                        query: {
                                            sparse_vector: {
                                                inference_id: "obs_ai_assistant_kb_inference",
                                                field: "profileText_semantic.inference.chunks.embeddings",
                                                query: query,
                                            },
                                        },
                                        inner_hits: {
                                            size: 2,
                                            name: "person.profileText_semantic",
                                            _source: ["profileText_semantic.inference.chunks.text"],
                                        },
                                    },
                                },
                            },
                        },
                        {
                            standard: {
                                query: {
                                    nested: {
                                        path: "researchRecord",
                                        query: {
                                            multi_match: {
                                                query: query,
                                                fields: ["unaccentedGivenName", "description"],
                                            },
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
            _source: false,
            size: 3,
            fields: ["givenName", "familyName", "deathDate", "profileText", "unaccentedGivenName"],
        }

        const searchResult = await esClient.search<SearchResult>({
            index: "person",
            body: esQuery,
        })
        console.log("Search bioguide result is:", JSON.stringify(searchResult, null, 2))
        // const extractedData = extractBodyContentAndUrls(searchResult as SearchResult)

        return NextResponse.json({
            results: searchResult,
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
