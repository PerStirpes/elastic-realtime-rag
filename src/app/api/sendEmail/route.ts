import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        // Parse the JSON payload from the request.
        const WebhookURL = process.env.ZAP_URL
        const eventData = await request.json()

        if (!WebhookURL) {
            throw new Error("Webhook URL is not defined")
        }

        const response = await fetch(WebhookURL, {
            method: "POST",
            body: JSON.stringify(eventData),
            headers: {
                "Content-Type": "application/json",
            },
        })
        // todo add proper error handling, remove console.log, and improve response handling
        console.log("this is the response", response)

        // if (!response.ok) {
        //     console.error("Error from Zapier webhook:", response)
        //     return NextResponse.json({ error: "Error sending data to Zapier." }, { status: 500 })
        // }

        return NextResponse.json({ result: "success" })
    } catch (error) {
        console.error("Error sending email:", error)
        return NextResponse.json({ error: "Error sending email", details: error }, { status: 500 })
    }
}
