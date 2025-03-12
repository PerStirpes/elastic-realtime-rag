import { NextRequest, NextResponse } from "next/server"
import { esClient } from "../utility"

export async function GET(request: NextRequest) {
    try {
        const searchParams = await request.nextUrl.searchParams
        const query = searchParams.get("q")

        if (!query) {
            return NextResponse.json(
                {
                    error: "No search query provided",
                },
                { status: 400 },
            )
        }

        const searchResult = await esClient.search({
            index: "search-labs-blogs",
            body: {
                retriever: {
                    standard: {
                        query: {
                            semantic: {
                                field: "body_semantic",
                                query: query,
                            },
                        },
                    },
                },
                _source: false,
                fields: ["title", "body", "url"],
            },
        })

        const fields = searchResult.hits.hits[0].fields
        if (!fields) {
            return NextResponse.json(
                {
                    error: "No fields found in search result",
                },
                { status: 404 },
            )
        }
        const { body, title, url } = fields
        return NextResponse.json({
            body,
            title,
            url,
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
