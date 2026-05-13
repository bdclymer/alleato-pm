"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { createAuthClient } from "@/lib/supabase/client-auth";
import { validateCallbackUrl } from "@/lib/validation/callback-url";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/misc/password-input";

// ─── Isometric projection ──────────────────────────────────────────────────
// iso(ix, iy, iz) → screen(x, y)
// ix = east axis, iy = south axis, iz = up axis
const CX = 480;   // screen origin x
const CY = 800;   // screen ground y
const U  = 17;    // pixels per iso unit
const C  = 0.866; // cos(30°)

function sx(ix: number, iy: number)               { return CX + (ix - iy) * U * C; }
function sy(ix: number, iy: number, iz: number)   { return CY + (ix + iy) * U * 0.5 - iz * U; }
function pt(ix: number, iy: number, iz: number)   {
  return `${sx(ix, iy).toFixed(1)},${sy(ix, iy, iz).toFixed(1)}`;
}

// ─── Building path generator ───────────────────────────────────────────────
interface Bld {
  ox: number; oy: number;
  w: number;  d: number; h: number;
  floors: number;
  accent?: boolean;
  delay: number;
}

function bldPaths(b: Bld) {
  const { ox, oy, w, d, h, floors } = b;
  const struct: string[] = [
    `M${pt(ox,   oy,   0)}L${pt(ox+w, oy,   0)}`, // front-bottom
    `M${pt(ox,   oy,   0)}L${pt(ox,   oy+d, 0)}`, // left-bottom
    `M${pt(ox,   oy,   0)}L${pt(ox,   oy,   h)}`, // front-left vert
    `M${pt(ox+w, oy,   0)}L${pt(ox+w, oy,   h)}`, // front-right vert
    `M${pt(ox,   oy+d, 0)}L${pt(ox,   oy+d, h)}`, // left-back vert
    `M${pt(ox,oy,h)}L${pt(ox+w,oy,h)}L${pt(ox+w,oy+d,h)}L${pt(ox,oy+d,h)}Z`, // top
  ];
  const detail: string[] = [];
  const fh = h / floors;
  for (let f = 1; f < floors; f++) {
    const fz = f * fh;
    detail.push(`M${pt(ox,   oy, fz)}L${pt(ox+w, oy,   fz)}`); // front floor
    detail.push(`M${pt(ox,   oy, fz)}L${pt(ox,   oy+d, fz)}`); // left floor
  }
  return { struct, detail };
}

// ─── Scene definition ─────────────────────────────────────────────────────
const BUILDINGS: Bld[] = [
  { ox: 2,  oy: 2, w: 3,   d: 3,   h: 22, floors: 11, accent: true,  delay: 0.2 },
  { ox: 0,  oy: 2, w: 2,   d: 2,   h: 14, floors: 7,  accent: false, delay: 0.5 },
  { ox: 5,  oy: 2, w: 2,   d: 2,   h: 12, floors: 6,  accent: false, delay: 0.6 },
  { ox: 2,  oy: 5, w: 2,   d: 2,   h: 10, floors: 5,  accent: false, delay: 0.7 },
  { ox: 0,  oy: 0, w: 1.5, d: 1.5, h: 7,  floors: 4,  accent: false, delay: 0.9 },
  { ox: 5,  oy: 0, w: 1.5, d: 1.5, h: 6,  floors: 3,  accent: false, delay: 1.0 },
  { ox: 7,  oy: 2, w: 2,   d: 2,   h: 9,  floors: 5,  accent: false, delay: 0.8 },
  { ox: -1, oy: 3, w: 1.5, d: 1.5, h: 5,  floors: 3,  accent: false, delay: 1.1 },
];

// Ground plane extent
const GX1 = -1, GX2 = 10, GY1 = -1, GY2 = 9;

interface LoginPageV3Props {
  redirectTo?: string;
}

export function LoginPageV3({ redirectTo }: LoginPageV3Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const supabase = createAuthClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Invalid email or password");
        return;
      }
      toast.success("Signed in");
      if (redirectTo && redirectTo !== "/") {
        const url = validateCallbackUrl(redirectTo);
        setTimeout(() => { router.push(url); router.refresh(); }, 100);
      } else {
        try {
          const result = await apiFetch<{ redirect?: string }>("/api/auth/post-login-redirect");
          setTimeout(() => { router.push(result?.redirect || "/"); router.refresh(); }, 100);
        } catch {
          setTimeout(() => { router.push("/"); router.refresh(); }, 100);
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes isoDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes isoFade {
          to { opacity: 1; }
        }
        .iso-line {
          stroke-dasharray: 3000;
          stroke-dashoffset: 3000;
          animation: isoDraw 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .iso-detail {
          opacity: 0;
          animation: isoFade 0.9s ease-out forwards;
        }
        .iso-ground {
          stroke-dasharray: 3000;
          stroke-dashoffset: 3000;
          animation: isoDraw 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      <div className="min-h-screen bg-background grid lg:grid-cols-[400px_1fr]">

        {/* ─── Left: Form panel ─── */}
        <div className="flex flex-col justify-between px-10 py-12 md:px-12 relative z-10">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src="/Alleato-Group-Logo_Light.png"
              alt="Alleato"
              width={152}
              height={38}
              priority
            />
          </motion.div>

          {/* Form block */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="mb-9">
              <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">
                Project Management
              </p>
              <p className="text-3xl font-light tracking-tight text-foreground leading-snug">
                Welcome back.<br />
                <span className="text-muted-foreground">Sign in to continue.</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email-v3"
                  className="text-xs tracking-widest uppercase text-muted-foreground"
                >
                  Email address
                </Label>
                <Input
                  id="email-v3"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 bg-background text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password-v3"
                    className="text-xs tracking-widest uppercase text-muted-foreground"
                  >
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground/50 hover:text-primary transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <PasswordInput
                  id="password-v3"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 bg-background text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 font-normal tracking-wider"
                >
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>
              </div>

              <p className="text-sm text-center text-muted-foreground pt-1">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/sign-up"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-xs tracking-widest uppercase text-muted-foreground/30"
          >
            Built for builders
          </motion.p>
        </div>

        {/* ─── Right: Isometric city ─── */}
        <div className="hidden lg:flex relative overflow-hidden items-end justify-center bg-background">
          <svg
            viewBox="0 0 850 920"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMax meet"
          >
            {/* Ground perimeter */}
            {[
              [GX1, GY1, GX2, GY1, "0s"],
              [GX1, GY1, GX1, GY2, "0.1s"],
              [GX2, GY1, GX2, GY2, "0.12s"],
              [GX1, GY2, GX2, GY2, "0.14s"],
            ].map(([ax, ay, bx, by, d], i) => (
              <line
                key={i}
                x1={sx(ax as number, ay as number)}
                y1={sy(ax as number, ay as number, 0)}
                x2={sx(bx as number, by as number)}
                y2={sy(bx as number, by as number, 0)}
                stroke="hsl(var(--muted-foreground) / 0.15)"
                strokeWidth="0.5"
                className="iso-ground"
                style={{ animationDelay: d as string }}
              />
            ))}

            {/* Grid lines across ground plane */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <g key={`grid-${n}`}>
                <line
                  x1={sx(n, GY1)} y1={sy(n, GY1, 0)}
                  x2={sx(n, GY2)} y2={sy(n, GY2, 0)}
                  stroke="hsl(var(--muted-foreground) / 0.05)"
                  strokeWidth="0.3"
                  className="iso-ground"
                  style={{ animationDelay: `${0.2 + n * 0.02}s` }}
                />
                <line
                  x1={sx(GX1, n)} y1={sy(GX1, n, 0)}
                  x2={sx(GX2, n)} y2={sy(GX2, n, 0)}
                  stroke="hsl(var(--muted-foreground) / 0.05)"
                  strokeWidth="0.3"
                  className="iso-ground"
                  style={{ animationDelay: `${0.2 + n * 0.02}s` }}
                />
              </g>
            ))}

            {/* Buildings */}
            {BUILDINGS.map((b, bi) => {
              const { struct, detail } = bldPaths(b);
              const lineColor = b.accent
                ? "hsl(var(--primary))"
                : "hsl(var(--foreground) / 0.18)";
              const lineWidth = b.accent ? "0.9" : "0.55";
              const detailColor = b.accent
                ? "hsl(var(--primary) / 0.35)"
                : "hsl(var(--foreground) / 0.07)";
              return (
                <g key={bi}>
                  {struct.map((path, i) => (
                    <path
                      key={i}
                      d={path}
                      stroke={lineColor}
                      strokeWidth={lineWidth}
                      fill="none"
                      className="iso-line"
                      style={{ animationDelay: `${b.delay + i * 0.055}s` }}
                    />
                  ))}
                  {detail.map((path, i) => (
                    <path
                      key={`d${i}`}
                      d={path}
                      stroke={detailColor}
                      strokeWidth="0.35"
                      fill="none"
                      className="iso-detail"
                      style={{ animationDelay: `${b.delay + 0.8 + i * 0.012}s` }}
                    />
                  ))}
                </g>
              );
            })}

            {/* Accent glow under main tower base */}
            <ellipse
              cx={sx(3.5, 3.5)}
              cy={sy(3.5, 3.5, 0)}
              rx="60"
              ry="18"
              fill="hsl(var(--primary) / 0.04)"
              className="iso-detail"
              style={{ animationDelay: "1.5s" }}
            />
          </svg>
        </div>
      </div>
    </>
  );
}
