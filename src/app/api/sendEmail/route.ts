import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        // Parse the JSON payload from the request.
        const eventData = await request.json()

        const response = fetch("https://hooks.zapier.com/hooks/catch/21174512/2g29d9k/", {
            method: "POST",
            body: JSON.stringify(eventData),
            headers: {
                "Content-Type": "application/json",
            },
        })
        console.log("this is the response", response)
        // if (!response.ok) {
        //     console.error("Error from Zapier webhook:", response)
        //     return NextResponse.json({ error: "Error sending data to Zapier." }, { status: 500 })
        // }

        return NextResponse.json({ result: "success" })
    } catch (error) {
        console.error("Error indexing document:", error)
        return NextResponse.json({ error: "Error indexing document", details: error }, { status: 500 })
    }
}
