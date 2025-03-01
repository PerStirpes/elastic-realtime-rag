// OpenTelemetry instrumentation registration for Next.js
// This file is auto-imported by Next.js when instrumentation is enabled

/**
 * Registers OpenTelemetry instrumentation when running in a Node.js environment
 * 
 * Note: Currently disabled to avoid connection errors with missing OTLP endpoints
 */
export async function register() {
    // Instrumentation is currently disabled to avoid connection errors
    console.log('OpenTelemetry instrumentation is currently disabled.');
    
    // To re-enable, uncomment the code below and ensure proper endpoint configuration
    /*
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
    */
}
