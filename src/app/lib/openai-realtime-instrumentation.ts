/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * COMPATIBILITY LAYER
 *
 * This file exists only to maintain backward compatibility with existing code.
 * New code should import directly from client-telemetry.ts instead.
 *
 * The only exports maintained are:
 * - instrumentToolFunction: Wraps a tool function with telemetry
 * - instrumentToolLogic: Wraps an object of tool functions with telemetry
 *
 * These functions internally delegate to client-telemetry, which sends the
 * data to the server-side telemetry endpoint.
 */

import { recordToolCall } from "./client-telemetry"

// Dummy function for compatibility
export function instrumentToolFunction<T extends (...args: any[]) => Promise<any>>(toolName: string, toolFn: T): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
            const result = await toolFn(...args)
            recordToolCall(toolName, !result.error, undefined, result.error ? String(result.error) : undefined)
            return result as ReturnType<T>
        } catch (error) {
            recordToolCall(toolName, false, undefined, error instanceof Error ? error.message : String(error))
            throw error
        }
    }) as T
}

// Dummy function for compatibility
export function instrumentToolLogic<T extends Record<string, (...args: any[]) => Promise<any>>>(toolLogic: T): T {
    const instrumentedToolLogic: Partial<T> = {}

    for (const [toolName, toolFn] of Object.entries(toolLogic)) {
        ;(instrumentedToolLogic as any)[toolName] = instrumentToolFunction(toolName, toolFn)
    }

    return instrumentedToolLogic as T
}

// This file now only exports the instrumentToolFunction and instrumentToolLogic
// functions for compatibility with existing code
