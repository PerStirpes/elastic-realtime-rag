/**
 * Elastic APM RUM (Real User Monitoring) instrumentation utilities
 *
 * This module provides wrapper functions around the ElasticAPM RUM JavaScript agent
 * to instrument frontend transactions and spans.
 */

// Helper function to check if APM is available
const isApmAvailable = (): boolean => {
    return typeof window !== "undefined" && !!window.elasticApm
}

/**
 * Start a new transaction
 * @param name Transaction name
 * @param type Transaction type
 * @param options Additional options
 * @returns Transaction object or null if APM is not available
 */
export function startTransaction(name: string, type: string, options: any = {}): any {
    if (!isApmAvailable()) return null

    const transaction = window.elasticApm!.startTransaction(name, type, options)
    return transaction
}

/**
 * Start a new span within the current transaction
 * @param name Span name
 * @param type Span type
 * @param subtype Optional subtype
 * @param action Optional action
 * @param parentSpan Optional parent span (if not provided, uses current transaction)
 * @returns Span object or null if APM is not available
 */
export function startSpan(name: string, type: string, subtype?: string, action?: string, parentSpan?: any): any {
    if (!isApmAvailable()) return null

    const parent = parentSpan || getCurrentTransaction()
    if (!parent) return null

    return parent.startSpan(name, type, {
        subtype,
        action,
    })
}

/**
 * Get the current active transaction
 * @returns Current transaction or null if none or APM not available
 */
export function getCurrentTransaction(): any {
    if (!isApmAvailable()) return null

    return window.elasticApm!.getCurrentTransaction()
}

/**
 * Capture an error in APM
 * @param error Error object or string message
 * @param options Additional options
 */
export function captureError(error: Error | string, options: any = {}): void {
    if (!isApmAvailable()) return

    window.elasticApm!.captureError(error, options)
}

/**
 * Set custom context for the current transaction
 * @param context Context object to set
 */
export function setCustomContext(context: Record<string, any>): void {
    if (!isApmAvailable()) return

    window.elasticApm!.setCustomContext(context)
}

/**
 * Add labels to the current transaction
 * @param labels Labels to add
 */
export function addLabels(labels: Record<string, string | number | boolean>): void {
    if (!isApmAvailable()) return

    window.elasticApm!.addLabels(labels)
}

/**
 * Set user context for the current transaction
 * @param user User context object
 */
export function setUserContext(user: Record<string, any>): void {
    if (!isApmAvailable()) return

    window.elasticApm!.setUserContext(user)
}
