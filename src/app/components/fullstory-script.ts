"use client"

import { useEffect } from "react"

/**
 * FullStory integration with Elastic APM
 *
 * This component loads FullStory and connects it with Elastic APM RUM
 * for better debugging and error tracing across platforms.
 */
export function FullStoryScript() {
    useEffect(() => {
        // Initialize FullStory
        window._fs_host = window._fs_host || "fullstory.com"
        const _fs_script = "https://edge.fullstory.com/s/fs.js"
        window._fs_script = _fs_script
        window._fs_org = process.env.FS_ORG_ID || "o-2121BN-na1"
        window._fs_namespace = "FS"

        // Load FullStory snippet
        require("./raw-snippet")

        // Connect FullStory with Elastic APM
        try {
            // Wait for both FullStory and APM to be ready
            const waitForInit = () => {
                if (window.FS && window.elasticApm) {
                    // Add FullStory session URL to all APM transactions
                    window.elasticApm.addFilter((payload) => {
                        if (window.FS) {
                            try {
                                const fsUrl = window.FS("getSession", { format: "url" })
                                if (fsUrl) {
                                    // Add FullStory URL to transactions and spans
                                    if (payload.transactions) {
                                        payload.transactions.forEach((transaction: any) => {
                                            if (!transaction.context) transaction.context = {}
                                            if (!transaction.context.custom) transaction.context.custom = {}
                                            transaction.context.custom.fullstory_url = fsUrl
                                        })
                                    }

                                    // Add to errors as well
                                    if (payload.errors) {
                                        payload.errors.forEach((error: any) => {
                                            if (!error.context) error.context = {}
                                            if (!error.context.custom) error.context.custom = {}
                                            error.context.custom.fullstory_url = fsUrl
                                        })
                                    }
                                }
                            } catch (err) {
                                console.warn("Error connecting FullStory and APM:", err)
                            }
                        }
                        return payload
                    })

                    // Capture APM errors in FullStory
                    const originalCaptureError = window.elasticApm.captureError
                    window.elasticApm.captureError = function (error: any, options?: any) {
                        // First, pass to original handler
                        originalCaptureError.call(window.elasticApm, error, options)

                        // Then, log to FullStory
                        if (window.FS) {
                            const errorMsg = error instanceof Error ? error.message : String(error)
                            window.FS.event("Application Error", {
                                error_message: errorMsg,
                                error_trace: error instanceof Error ? error.stack : undefined,
                                error_source: "elasticApm.captureError",
                                ...(options?.custom || {}),
                            })
                        }
                    }

                    console.log("Successfully connected FullStory and Elastic APM")
                } else {
                    // Try again in 500ms
                    setTimeout(waitForInit, 500)
                }
            }

            waitForInit()
        } catch (error) {
            console.error("Error setting up FullStory/APM integration:", error)
        }
    }, [])

    return null
}
