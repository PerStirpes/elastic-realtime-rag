import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        reactCompiler: {
          compilationMode: 'annotation',
        },
      }
    //   ,
    // webpack: (config, { isServer }) => {
    //     if (isServer) {
    //       config.externals.push("@elastic/opentelemetry-node")
    //     } 
    //     return config
    //   }
};

export default nextConfig;

