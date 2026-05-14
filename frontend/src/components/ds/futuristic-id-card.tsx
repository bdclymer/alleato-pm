"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const PARTICLES = [
  { left: 15, top: 20, glow: 5, duration: 3.8, delay: 0.0 },
  { left: 28, top: 55, glow: 6, duration: 4.2, delay: 0.4 },
  { left: 42, top: 12, glow: 4, duration: 3.2, delay: 0.8 },
  { left: 60, top: 70, glow: 7, duration: 4.8, delay: 1.2 },
  { left: 75, top: 30, glow: 5, duration: 3.5, delay: 0.2 },
  { left: 88, top: 60, glow: 6, duration: 4.0, delay: 1.6 },
  { left: 20, top: 80, glow: 4, duration: 3.9, delay: 0.6 },
  { left: 50, top: 45, glow: 8, duration: 5.0, delay: 1.0 },
  { left: 65, top: 15, glow: 5, duration: 3.3, delay: 1.8 },
  { left: 35, top: 90, glow: 6, duration: 4.5, delay: 0.3 },
  { left: 80, top: 85, glow: 4, duration: 3.7, delay: 1.4 },
  { left: 10, top: 40, glow: 5, duration: 4.1, delay: 0.9 },
]

interface FuturisticIDCardProps {
  name?: string
  role?: string
  idNumber?: string
  avatarUrl?: string
  status?: "VERIFIED" | "ACTIVE" | "PENDING"
}

export function FuturisticIDCard({
  name = "ARIA NEXUS",
  role = "SENIOR AI ENGINEER",
  idNumber = "NX-7749-2045-ALPHA",
  avatarUrl = "/futuristic-avatar-cyberpunk.jpg",
  status = "VERIFIED",
}: FuturisticIDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), {
    stiffness: 150,
    damping: 20,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), {
    stiffness: 150,
    damping: 20,
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

  return (
    <div className="relative" style={{ perspective: "1200px" }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-[380px] h-[240px] cursor-pointer"
      >
        {/* Gradient border glow */}
        <motion.div
          className="absolute -inset-[2px] rounded-2xl opacity-75"
          animate={{
            opacity: isHovered ? 1 : 0.6,
          }}
          transition={{ duration: 0.3 }}
          style={{
            background: "linear-gradient(135deg, #00f5ff 0%, #a855f7 50%, #ec4899 100%)",
            filter: isHovered ? "blur(8px)" : "blur(4px)",
          }}
        />

        {/* Main card container */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          {/* Background holographic gradient mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

          {/* Animated holographic mesh */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              backgroundPosition: isHovered ? ["0% 0%", "100% 100%"] : "0% 0%",
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 20% 30%, rgba(0, 245, 255, 0.3) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 70%, rgba(168, 85, 247, 0.3) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.2) 0%, transparent 60%)
              `,
              backgroundSize: "200% 200%",
            }}
          />

          {/* Floating grid lines */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 245, 255, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 245, 255, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Noise overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Glassmorphism card face */}
          <div
            className="absolute inset-[1px] rounded-2xl backdrop-blur-xl"
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {/* Animated light sweep */}
            <motion.div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="absolute w-[200%] h-full"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                  repeatDelay: 2,
                }}
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)",
                  transform: "skewX(-20deg)",
                }}
              />
            </motion.div>

            {/* Floating particles — stable values to avoid hydration mismatch */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              {PARTICLES.map((p, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    background: i % 3 === 0 ? "#00f5ff" : i % 3 === 1 ? "#a855f7" : "#ec4899",
                    boxShadow: `0 0 ${p.glow}px currentColor`,
                  }}
                  animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }}
                  transition={{
                    duration: p.duration,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: p.delay,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            {/* Content layer - floating above */}
            <div
              className="relative h-full p-6 flex flex-col justify-between"
              style={{ transform: "translateZ(20px)" }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                {/* Avatar with glowing ring */}
                <div className="relative">
                  <motion.div
                    className="absolute -inset-1 rounded-full"
                    animate={{
                      opacity: isHovered ? [0.5, 1, 0.5] : 0.5,
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                    style={{
                      background: "linear-gradient(135deg, #00f5ff, #a855f7, #ec4899)",
                      filter: "blur(4px)",
                    }}
                  />
                  <Avatar className="relative w-14 h-14 border-2 border-cyan-400/50">
                    <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
                    <AvatarFallback className="bg-slate-800 text-cyan-400 font-mono text-sm">
                      {name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Status badge */}
                <Badge
                  className="font-mono text-[10px] tracking-wider border-0 px-3 py-1"
                  style={{
                    background:
                      status === "VERIFIED"
                        ? "linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(0, 245, 255, 0.1))"
                        : status === "ACTIVE"
                          ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))"
                          : "linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.1))",
                    color: status === "VERIFIED" ? "#00f5ff" : status === "ACTIVE" ? "#22c55e" : "#eab308",
                    boxShadow:
                      status === "VERIFIED"
                        ? "0 0 10px rgba(0, 245, 255, 0.3), inset 0 0 10px rgba(0, 245, 255, 0.1)"
                        : status === "ACTIVE"
                          ? "0 0 10px rgba(34, 197, 94, 0.3), inset 0 0 10px rgba(34, 197, 94, 0.1)"
                          : "0 0 10px rgba(234, 179, 8, 0.3), inset 0 0 10px rgba(234, 179, 8, 0.1)",
                  }}
                >
                  ● {status}
                </Badge>
              </div>

              {/* Center content */}
              <div className="space-y-1">
                <h2
                  className="text-xl font-bold tracking-wide text-white"
                  style={{
                    textShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
                  }}
                >
                  {name}
                </h2>
                <p className="text-xs tracking-[0.2em] text-slate-400 uppercase">{role}</p>
              </div>

              {/* Bottom row */}
              <div className="flex items-end justify-between">
                {/* ID Number */}
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">ID Number</p>
                  <p
                    className="font-mono text-sm tracking-wider"
                    style={{
                      background: "linear-gradient(90deg, #00f5ff, #a855f7, #ec4899)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {idNumber}
                  </p>
                </div>

                {/* QR Code placeholder glyph */}
                <div
                  className="w-12 h-12 rounded-lg p-1.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(168, 85, 247, 0.1))",
                    border: "1px solid rgba(0, 245, 255, 0.2)",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <rect
                      x="3"
                      y="3"
                      width="7"
                      height="7"
                      rx="1"
                      stroke="#00f5ff"
                      strokeWidth="1.5"
                      fill="rgba(0, 245, 255, 0.1)"
                    />
                    <rect
                      x="14"
                      y="3"
                      width="7"
                      height="7"
                      rx="1"
                      stroke="#a855f7"
                      strokeWidth="1.5"
                      fill="rgba(168, 85, 247, 0.1)"
                    />
                    <rect
                      x="3"
                      y="14"
                      width="7"
                      height="7"
                      rx="1"
                      stroke="#ec4899"
                      strokeWidth="1.5"
                      fill="rgba(236, 72, 153, 0.1)"
                    />
                    <rect x="14" y="14" width="3" height="3" fill="#00f5ff" />
                    <rect x="18" y="14" width="3" height="3" fill="#a855f7" />
                    <rect x="14" y="18" width="3" height="3" fill="#a855f7" />
                    <rect x="18" y="18" width="3" height="3" fill="#ec4899" />
                    <circle cx="6.5" cy="6.5" r="1.5" fill="#00f5ff" />
                    <circle cx="17.5" cy="6.5" r="1.5" fill="#a855f7" />
                    <circle cx="6.5" cy="17.5" r="1.5" fill="#ec4899" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
