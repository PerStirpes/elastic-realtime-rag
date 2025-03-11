import React, { useState } from "react"

export default function ErrorTestPage() {
    const [errorStack, setErrorStack] = useState("")

    function handleClick() {
        try {
            // Intentionally throw an error
            window.elasticApm?.captureError("Manually triggered error for testing Elastic APM sourcemaps")
            throw new Error("Manually triggered error for testing Elastic APM sourcemaps")
        } catch (err) {
            // Capture the error with APM and set the error stack trace to state

            console.log(err)
            setErrorStack(err.stack)
        }
    }

    return (
        <div>
            <h1>Error Test Page</h1>
            <p>Click the button to trigger an error and see the stack trace.</p>
            <button onClick={handleClick}>Trigger Error</button>
            {errorStack && (
                <pre style={{ backgroundColor: "#fdd", padding: "1em", marginTop: "1em" }}>{errorStack}</pre>
            )}
        </div>
    )
}
