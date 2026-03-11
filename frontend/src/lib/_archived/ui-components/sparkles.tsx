"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type SparklesProps = {
  id?: string;
  className?: string;
  background?: string;
  particleSize?: number;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
};

type Sparkle = {
  id: string;
  left: number;
  top: number;
  delay: number;
  size: number;
};

function generateSparkles(count: number, minSize: number, maxSize: number): Sparkle[] {
  return Array.from({ length: count }).map((_, index) => ({
    id: `${index}-${minSize}-${maxSize}`,
    left: Math.random(),
    top: Math.random(),
    delay: Math.random() * 2,
    size: Math.random() * (maxSize - minSize) + minSize,
  }));
}

export const SparklesCore = ({
  className,
  background,
  particleDensity = 18,
  minSize = 0.5,
  maxSize = 2,
  particleColor = "#ffffff",
  speed = 3,
  id,
}: SparklesProps) => {
  const sparkles = React.useMemo(
    () => generateSparkles(particleDensity, minSize, maxSize),
    [particleDensity, minSize, maxSize],
  );

  return (
    <div
      id={id}
      className={cn("relative overflow-hidden pointer-events-none", className)}
      style={{ background }}
    >
      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${sparkle.left * 100}%`,
            top: `${sparkle.top * 100}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            background: particleColor,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
            y: [0, -10, 0],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            repeatType: "loop",
            delay: sparkle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
