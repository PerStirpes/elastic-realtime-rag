// Note: this file needs to be commented out in order to run the app in dev and needs to be uncommented in order to run the app in production.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./instrumentation.node")
    }
}
