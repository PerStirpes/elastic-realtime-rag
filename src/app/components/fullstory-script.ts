"use client"

import { useEffect } from "react"

export function FullStoryScript() {
    useEffect(() => {
        window._fs_host = window._fs_host || "fullstory.com"
        const _fs_script = "edge.fullstory.com/s/fs.js"
        window._fs_script = _fs_script
        window._fs_org = process.env.NEXT_PUBLIC_FS_ORG_ID || "o-2121BN-na1"
        window._fs_namespace = "FS"
        require("./raw-snippet")
    }, [])

    return null
}

// Add TypeScript definitions
declare global {
    interface Window {
        FS?: any
        _fs_host?: string
        _fs_script?: string
        _fs_org?: string
        _fs_namespace?: string
    }
}
