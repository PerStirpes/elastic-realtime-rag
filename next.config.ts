import type { NextConfig } from "next"
import packageJson from "./package.json"

const nextConfig: NextConfig = {
    experimental: {
        reactCompiler: true,
    },
    env: {
        APP_VERSION: packageJson.version,
    },
    productionBrowserSourceMaps: true,
}

export default nextConfig
