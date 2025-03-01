// OpenTelemetry instrumentation registration for Next.js
// This file is auto-imported by Next.js when instrumentation is enabled

/**
 * Registers OpenTelemetry instrumentation when running in a Node.js environment
 *
 */
export async function register() {
    // Only load instrumentation in Node.js environment (not in browser)
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Only enable in production or when explicitly enabled for development
        if (process.env.NODE_ENV === "production" || process.env.ENABLE_OTEL === "true") {
            try {
                console.log("Loading OpenTelemetry instrumentation...")
                await import("./instrumentation.node")
            } catch (error) {
                console.error("Failed to load OpenTelemetry instrumentation:", error)
            }
        } else {
            console.log("OpenTelemetry instrumentation is disabled. Set ENABLE_OTEL=true to enable in development")
        }
    }
}
