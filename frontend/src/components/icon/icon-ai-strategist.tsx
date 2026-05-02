import * as React from "react"

interface IconAiStrategistProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

export function IconAiStrategist({ size = 16, className, ...props }: IconAiStrategistProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Top-left orbital arc */}
      <path d="M 22 18 C 10 28, 8 42, 18 52" />
      {/* Top-right orbital arc */}
      <path d="M 78 18 C 90 28, 92 42, 82 52" />
      {/* Bottom-left orbital arc */}
      <path d="M 18 52 C 8 62, 10 76, 22 84" />
      {/* Bottom-right orbital arc */}
      <path d="M 82 52 C 92 62, 90 76, 78 84" />
      {/* Diagonal slash top-left to bottom-right */}
      <path d="M 30 30 L 70 72" />
      {/* Diagonal slash top-right to bottom-left */}
      <path d="M 70 30 L 30 72" />
      {/* 4-pointed star in center */}
      <path d="M 50 38 L 53.5 47 L 62 50 L 53.5 53 L 50 62 L 46.5 53 L 38 50 L 46.5 47 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}
