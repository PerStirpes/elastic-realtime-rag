"use client"

import React, { useEffect, useRef } from "react"

type AudioDancerComponentProps = {
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    isMobile?: boolean
}

export default function AudioDancerComponent({ localStream, remoteStream, isMobile = false }: AudioDancerComponentProps) {
    const svgRef = useRef<SVGSVGElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Use a ref to store AudioContext to prevent recreation on each render
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const sourcesRef = useRef<MediaStreamAudioSourceNode[]>([])

    useEffect(() => {
        if (!localStream && !remoteStream) return

        // Only create AudioContext once or reuse existing one
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.AudioContext)()
        }

        // Create analyser if needed
        if (!analyserRef.current) {
            analyserRef.current = audioContextRef.current.createAnalyser()
            analyserRef.current.fftSize = 2048
            analyserRef.current.smoothingTimeConstant = 0.8
        }

        const analyser = analyserRef.current
        const audioCtx = audioContextRef.current
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        // Disconnect any previous sources
        sourcesRef.current.forEach((source) => source.disconnect())
        sourcesRef.current = []

        // Connect local and/or remote streams to the analyser
        if (localStream) {
            const source = audioCtx.createMediaStreamSource(localStream)
            source.connect(analyser)
            sourcesRef.current.push(source)
        }
        if (remoteStream) {
            const source = audioCtx.createMediaStreamSource(remoteStream)
            source.connect(analyser)
            sourcesRef.current.push(source)
        }

        // Get all SVG path elements (bubbles) and assign random frequency bands
        const svgElement = svgRef.current
        if (!svgElement) return
        const bubblePaths = svgElement.querySelectorAll("path")
        const bandIndices = Array.from({ length: bubblePaths.length }, () =>
            Math.floor(Math.random() * analyser.frequencyBinCount),
        )

        // Animation loop to scale bubbles
        let frameId: number
        const animate = () => {
            frameId = requestAnimationFrame(animate)
            analyser.getByteFrequencyData(dataArray)
            bubblePaths.forEach((path, i) => {
                const amplitude = dataArray[bandIndices[i]]
                // Limit scale to avoid excessive scaling that might cause clipping
                // Use smaller scale factor for mobile to keep animations within bounds
                const scaleFactor = isMobile ? 0.2 : 0.4;
                const scale = 1 + (amplitude / 255) * scaleFactor
                // Scale the path around its center
                path.style.transform = `scale(${scale})`
                path.style.transformOrigin = "center center"
                path.style.transformBox = "fill-box"
                // Ensure paths don't get clipped during animation
                path.style.overflow = "visible"
                path.style.display = "block"
            })
        }
        frameId = requestAnimationFrame(animate)

        // Cleanup on unmount or props change
        return () => {
            cancelAnimationFrame(frameId)
            sourcesRef.current.forEach((src) => src.disconnect())
        }
    }, [localStream, remoteStream])

    // Add a final cleanup when component unmounts
    useEffect(() => {
        return () => {
            if (analyserRef.current) {
                analyserRef.current.disconnect()
            }

            if (audioContextRef.current) {
                audioContextRef.current.close()
            }

            sourcesRef.current.forEach((source) => source.disconnect())
            sourcesRef.current = []
        }
    }, [])

    // Define sizes based on mobile or desktop
    const svgSize = isMobile ? 120 : 235;
    const viewBoxPadding = isMobile ? 20 : 15;
    const viewBoxSize = isMobile ? 205 : 235;
    
    return (
        <div 
            ref={containerRef}
            className="flex items-center justify-center h-full w-full"
            style={{ minWidth: `${svgSize}px` }}
        >
            <svg 
                ref={svgRef} 
                width={svgSize} 
                height={svgSize} 
                viewBox={`-${viewBoxPadding} -${viewBoxPadding} ${viewBoxSize} ${viewBoxSize}`}
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible', display: 'block' }}
            >
                {/* Elastic logo SVG paths (each path is a bubble) */}
            <path
                d="M204.58 106.744C204.603 98.4365 202.056 90.3256 197.289 83.5226C192.521 76.7196 185.766 71.5575 177.95 68.7437C178.661 65.1202 179.02 61.4363 179.02 57.7437C179.015 45.5282 175.137 33.6288 167.945 23.7553C160.752 13.8817 150.615 6.54212 138.99 2.79108C127.365 -0.95996 114.849 -0.929399 103.242 2.87837C91.6356 6.68615 81.5344 14.0751 74.3903 23.9837C69.1179 19.9113 62.6636 17.6651 56.0021 17.5844C49.3406 17.5036 42.8337 19.5926 37.4641 23.536C32.0946 27.4793 28.1539 33.0628 26.2374 39.4431C24.3208 45.8235 24.5325 52.6542 26.8403 58.9037C19.0148 61.7531 12.2486 66.929 7.45072 73.7362C2.6528 80.5433 0.0529206 88.6558 0.000313645 96.9837C-0.0326102 105.33 2.52727 113.48 7.32627 120.309C12.1253 127.138 18.9265 132.307 26.7903 135.104C25.1677 143.453 25.4123 152.057 27.5064 160.301C29.6005 168.544 33.4924 176.222 38.903 182.784C44.3136 189.347 51.1089 194.631 58.8019 198.258C66.495 201.885 74.8951 203.765 83.4003 203.764C92.5559 203.772 101.581 201.59 109.722 197.402C117.863 193.213 124.884 187.138 130.2 179.684C135.455 183.802 141.912 186.091 148.588 186.201C155.264 186.312 161.793 184.238 167.181 180.295C172.569 176.353 176.522 170.758 178.437 164.362C180.352 157.965 180.125 151.119 177.79 144.864C185.623 142.013 192.394 136.832 197.193 130.016C201.992 123.201 204.587 115.079 204.63 106.744"
                fill="white"
            />
            <path
                d="M80.4304 87.7437L125.2 108.154L170.36 68.5837C172.647 57.1747 170.923 45.326 165.48 35.0418C160.036 24.7576 151.208 16.6692 140.487 12.1447C129.767 7.62016 117.813 6.9373 106.647 10.2116C95.4817 13.4859 85.7895 20.5163 79.2104 30.1137L71.6904 69.1137L80.4304 87.7437Z"
                fill="#FEC514"
            />
            <path
                d="M34.1005 135.154C31.7687 146.616 33.4787 158.533 38.9397 168.877C44.4007 179.221 53.2757 187.355 64.0559 191.896C74.836 196.436 86.856 197.103 98.0722 193.783C109.288 190.463 119.009 183.36 125.581 173.684L133.031 134.844L123.031 115.844L78.1405 95.3438L34.1005 135.154Z"
                fill="#02BCB7"
            />
            <path
                d="M33.7903 57.6838L64.4903 64.9238L71.2103 30.0437C67.0362 26.8839 61.9516 25.1598 56.7165 25.129C51.4814 25.0981 46.3769 26.7623 42.1659 29.8727C37.9549 32.9831 34.8636 37.3728 33.3539 42.3856C31.8442 47.3984 31.9973 52.7652 33.7903 57.6838Z"
                fill="#F04E98"
            />
            <path
                d="M31.1505 64.9837C24.5185 67.1748 18.727 71.3643 14.5705 76.9775C10.4141 82.5907 8.09631 89.3525 7.93527 96.3353C7.77423 103.318 9.7778 110.179 13.6711 115.978C17.5643 121.777 23.1566 126.229 29.6805 128.724L72.6805 89.8137L64.7905 72.9837L31.1505 64.9837Z"
                fill="#1BA9F5"
            />
            <path
                d="M133.44 173.684C137.012 176.435 141.284 178.128 145.77 178.572C150.256 179.016 154.777 178.191 158.818 176.193C162.859 174.195 166.259 171.103 168.63 167.269C171.001 163.434 172.248 159.012 172.23 154.504C172.243 151.636 171.749 148.789 170.77 146.094L140.12 138.924L133.44 173.684Z"
                fill="#9ADC30"
            />
            <path
                d="M139.68 130.894L173.43 138.784C180.166 136.513 186.025 132.197 190.191 126.437C194.357 120.678 196.622 113.762 196.67 106.654C196.664 99.8008 194.573 93.112 190.676 87.4751C186.779 81.8383 181.259 77.5201 174.85 75.0938L130.72 113.764L139.68 130.894Z"
                fill="#0B64DD"
            />
        </svg>
        </div>
    )
}
