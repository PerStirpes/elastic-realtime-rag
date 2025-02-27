import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import { FullStoryScript } from "./components/fullstory-script"

export const metadata: Metadata = {
    title: "Elastic Realtime API Agents",
    description:
        "Power insights and outcomes with The Elastic Search AI Platform. See into your data and find answers that matter with enterprise solutions designed to help you accelerate time to insight. Try Elastic ...",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <head>
                <Script
                    src="https://unpkg.com/@elastic/apm-rum/dist/bundles/elastic-apm-rum.umd.min.js"
                    strategy="beforeInteractive"
                    crossOrigin="anonymous"
                />
                <Script id="elastic-apm-init" strategy="beforeInteractive">
                    {`
            elasticApm.init({
              serviceName: 'capstone-frontend',
              serverUrl: 'https://abbe56903b824f85b28892772f898006.apm.us-east-1.aws.cloud.es.io:443',
              environment: 'production',
            });
          `}
                </Script>
                <FullStoryScript />
            </head>
            <body className={`antialiased`}>{children}</body>
        </html>
    )
}
