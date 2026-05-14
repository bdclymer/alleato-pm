"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface LiquidMetalIDCardProps {
  name?: string
  role?: string
  idNumber?: string
  avatarUrl?: string
  logo?: React.ReactNode
}

export function LiquidMetalIDCard({
  name = "Alex Johnson",
  role = "Project Manager",
  idNumber = "ALT-2025-PM-001",
  avatarUrl,
  logo,
}: LiquidMetalIDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Initialize AudioContext on mount
    audioContextRef.current = new (
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  const playFlipSound = useCallback(() => {
    const ctx = audioContextRef.current
    if (!ctx) return

    // Resume context if suspended (required for user interaction)
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    const duration = 0.4

    // Create white noise for the whoosh base
    const bufferSize = ctx.sampleRate * duration
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)

    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1
    }

    // Create noise source
    const whiteNoise = ctx.createBufferSource()
    whiteNoise.buffer = noiseBuffer

    // Bandpass filter for wind character - sweeps frequency for whoosh effect
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = "bandpass"
    bandpass.Q.value = 0.8
    bandpass.frequency.setValueAtTime(200, ctx.currentTime)
    bandpass.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + duration * 0.3)
    bandpass.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + duration)

    // Lowpass filter for smoothness
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = "lowpass"
    lowpass.frequency.setValueAtTime(2000, ctx.currentTime)
    lowpass.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + duration * 0.4)
    lowpass.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + duration)

    // Gain envelope for the whoosh shape - fast attack, smooth decay
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05)
    gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + duration * 0.3)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    // Connect the chain: noise -> bandpass -> lowpass -> gain -> output
    whiteNoise.connect(bandpass)
    bandpass.connect(lowpass)
    lowpass.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Play the whoosh
    whiteNoise.start(ctx.currentTime)
    whiteNoise.stop(ctx.currentTime + duration)
  }, [])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), {
    stiffness: 200,
    damping: 25,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), {
    stiffness: 200,
    damping: 25,
  })
  const backRotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [12, -12]), {
    stiffness: 200,
    damping: 25,
  })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      mouseX.set(x)
      mouseY.set(y)
    },
    [mouseX, mouseY],
  )

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }, [mouseX, mouseY])

  const handleClick = () => {
    playFlipSound()
    setIsFlipped(!isFlipped)
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div className="relative" style={{ perspective: "1500px" }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          scale: isFlipped ? [1, 1.05, 1] : 1,
        }}
        style={{
          rotateX: rotateX,
          rotateY: isFlipped ? 180 : rotateY,
          transformStyle: "preserve-3d",
        }}
        transition={{
          rotateY: {
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
          },
          scale: {
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
            times: [0, 0.5, 1],
          },
        }}
        className="relative w-[420px] h-[260px] cursor-pointer"
      >
        {/* FRONT OF CARD */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
          animate={{
            opacity: isFlipped ? 0 : 1,
            filter: isFlipped ? "blur(8px)" : "blur(0px)",
          }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
        >
          {/* Liquid metal base gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 25%, #0f0f0f 50%, #1f1f1f 75%, #0a0a0a 100%)
              `,
            }}
          />

          {/* Animated liquid metal ripples */}
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: isHovered ? ["0% 0%", "100% 100%", "0% 0%"] : ["0% 0%", "50% 50%", "0% 0%"],
            }}
            transition={{
              duration: isHovered ? 4 : 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255,255,255,0.06) 0%, transparent 50%),
                radial-gradient(ellipse 100% 60% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)
              `,
              backgroundSize: "200% 200%",
            }}
          />

          {/* Flowing liquid highlights */}
          <motion.div
            className="absolute inset-0 opacity-60"
            animate={{
              background: isHovered
                ? [
                    "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                    "linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.2) 55%, transparent 75%)",
                    "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                  ]
                : "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
            }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />

          {/* Mercury-like surface reflection */}
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: isHovered ? [0.3, 0.6, 0.3] : 0.3,
            }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            style={{
              background: `
                conic-gradient(from 0deg at 30% 30%, 
                  transparent 0deg, 
                  rgba(255,255,255,0.1) 60deg, 
                  transparent 120deg,
                  rgba(255,255,255,0.05) 180deg,
                  transparent 240deg,
                  rgba(255,255,255,0.08) 300deg,
                  transparent 360deg
                )
              `,
            }}
          />

          {/* Sweeping light reflection */}
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute w-[300%] h-full"
              animate={{
                x: ["-200%", "100%"],
              }}
              transition={{
                duration: 5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                repeatDelay: 2,
              }}
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%, transparent 100%)",
                transform: "skewX(-25deg)",
              }}
            />
          </motion.div>

          {/* Subtle metallic edge highlight */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
              padding: "1px",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "exclude",
            }}
          />

          {/* Inner border glow */}
          <div
            className="absolute inset-[1px] rounded-2xl"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.3)",
            }}
          />

          {/* Card content */}
          <div className="relative h-full p-8 flex flex-col justify-between" style={{ transform: "translateZ(30px)" }}>
            {/* Top section */}
            <div className="flex items-start justify-between">
              {/* Avatar with metallic ring */}
              <div className="relative">
                <motion.div
                  className="absolute -inset-[3px] rounded-full"
                  animate={{
                    opacity: isHovered ? [0.4, 0.8, 0.4] : 0.4,
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  style={{
                    background: "linear-gradient(135deg, #fff 0%, #888 50%, #fff 100%)",
                  }}
                />
                <Avatar className="relative w-16 h-16 border-2 border-neutral-700">
                  <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} className="object-cover grayscale" />
                  <AvatarFallback className="bg-neutral-900 text-white font-mono text-sm">
                    {name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-white"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    boxShadow: [
                      "0 0 4px rgba(255,255,255,0.5)",
                      "0 0 8px rgba(255,255,255,0.8)",
                      "0 0 4px rgba(255,255,255,0.5)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
                <span className="text-[10px] font-mono tracking-[0.3em] text-neutral-400 uppercase">Active</span>
              </div>
            </div>

            {/* Center content - Name and Role */}
            <div className="space-y-2">
              <motion.h2
                className="text-3xl font-light tracking-wide text-white"
                style={{
                  textShadow: "0 2px 10px rgba(255,255,255,0.1)",
                }}
              >
                {name}
              </motion.h2>
              <p
                className="text-sm tracking-[0.25em] uppercase"
                style={{
                  background: "linear-gradient(90deg, #888 0%, #fff 50%, #888 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {role}
              </p>
            </div>

            {/* Bottom section */}
            <div className="flex items-end justify-between">
              {/* ID Number */}
              <div className="space-y-1">
                <p className="text-[9px] text-neutral-600 uppercase tracking-[0.2em] font-mono">Credential ID</p>
                <p className="font-mono text-xs tracking-wider text-neutral-400">{idNumber}</p>
              </div>

              {/* Logo slot */}
              {logo && (
                <motion.div
                  className="w-10 h-10 flex items-center justify-center"
                  animate={{ opacity: isHovered ? 1 : 0.7 }}
                  transition={{ duration: 0.3 }}
                >
                  {logo}
                </motion.div>
              )}
            </div>
          </div>

          {/* Click hint */}
          <motion.div
            className="absolute bottom-3 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 0.5 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">Click to flip</span>
          </motion.div>
        </motion.div>

        {/* BACK OF CARD */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          animate={{
            opacity: isFlipped ? 1 : 0,
            filter: isFlipped ? "blur(0px)" : "blur(8px)",
          }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
        >
          {/* Liquid metal base - slightly different pattern */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(225deg, #0f0f0f 0%, #1a1a1a 30%, #0a0a0a 60%, #151515 100%)
              `,
            }}
          />

          {/* Animated liquid metal effect */}
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{
              background: `
                radial-gradient(ellipse 60% 40% at 70% 40%, rgba(255,255,255,0.06) 0%, transparent 50%),
                radial-gradient(ellipse 80% 60% at 30% 60%, rgba(255,255,255,0.04) 0%, transparent 50%)
              `,
              backgroundSize: "200% 200%",
            }}
          />

          {/* Inner border */}
          <div
            className="absolute inset-[1px] rounded-2xl"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.3)",
            }}
          />

          {/* Back content */}
          <div className="relative h-full p-8 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between">
              {logo && <div className="w-5 h-5 text-neutral-500 flex items-center">{logo}</div>}
              <span className="text-[9px] font-mono tracking-[0.3em] text-neutral-600 uppercase">
                ID Card
              </span>
            </div>

            {/* Main content */}
            <div className="space-y-6">
              {/* Bio */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">About</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Building the future of web development. Advocate for exceptional developer experiences and modern
                  frontend architecture.
                </p>
              </div>

              {/* Skills / Tags */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {["Next.js", "React", "TypeScript", "AI"].map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 text-[10px] font-mono tracking-wider text-neutral-300 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-wider text-neutral-600">vercel.com/ambassadors</span>
              <span className="text-[9px] font-mono tracking-wider text-neutral-600">2025</span>
            </div>

            {/* Click hint */}
            <motion.div
              className="absolute bottom-3 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0.5 }}
            >
              <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
                Click to flip back
              </span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
