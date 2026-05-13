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

interface LoginPageV2Props {
  redirectTo?: string;
}

export function LoginPageV2({ redirectTo }: LoginPageV2Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createAuthClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Invalid email or password");
        return;
      }

      toast.success("Successfully logged in");

      if (redirectTo && redirectTo !== "/") {
        const validatedUrl = validateCallbackUrl(redirectTo);
        setTimeout(() => {
          router.push(validatedUrl);
          router.refresh();
        }, 100);
      } else {
        try {
          const result = await apiFetch<{ redirect?: string }>(
            "/api/auth/post-login-redirect",
          );
          setTimeout(() => {
            router.push(result?.redirect || "/");
            router.refresh();
          }, 100);
        } catch {
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 100);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes windowLight {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        @keyframes craneSwing {
          0% { transform: rotate(-3deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes particleDrift {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.15; }
          100% { transform: translateY(-80vh) translateX(15px); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.08; }
        }

        /* Building structure draw-in */
        .bld-draw {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: draw 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .bld-draw-slow {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: draw 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .bld-fade {
          opacity: 0;
          animation: fadeIn 0.5s ease-out forwards;
        }
        .bld-fade-up {
          opacity: 0;
          transform: translateY(8px);
          animation: fadeInUp 0.4s ease-out forwards;
        }
        .bld-window-glow {
          animation: windowLight 3s ease-in-out infinite;
        }
        .bld-crane-arm {
          transform-origin: 430px 95px;
          animation: craneSwing 1s cubic-bezier(0.4, 0, 0.2, 1) 2.4s forwards;
          transform: rotate(-3deg);
        }
        .bld-particle {
          animation: particleDrift linear infinite;
          opacity: 0;
        }
        .bld-ambient {
          animation: pulseGlow 4s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen bg-background grid lg:grid-cols-[1fr_1.3fr] relative overflow-hidden">
        {/* Ambient background glow */}
        <div
          className="bld-ambient absolute top-1/4 right-1/4 rounded-full pointer-events-none bg-primary/10 blur-3xl"
          style={{
            width: "37.5rem",
            height: "37.5rem",
          }}
        />

        {/* Floating particles (full page) */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="bld-particle absolute bg-card/10 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              bottom: "0%",
              animationDelay: `${i * 2}s`,
              animationDuration: `${18 + i * 2}s`,
            }}
          />
        ))}

        {/* ─── Left: Glass Login Form ─── */}
        <div className="flex items-center justify-center p-6 md:p-12 relative z-10">
          <div className="w-full max-w-sm space-y-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="flex justify-center"
            >
              <Image
                src="/Alleato-Group-Logo_Light.png"
                alt="Alleato"
                width={180}
                height={45}
                priority
              />
            </motion.div>

            {/* Glass card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-2xl bg-muted/50 p-8 shadow-xs"
            >
              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Sign in to your account
                </p>
              </motion.div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-dev-autofill-disabled="true"
              >
                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-muted-foreground text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/70 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
                  />
                </motion.div>

                {/* Password */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.4 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-muted-foreground text-sm">
                      Password
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/70 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
                  />
                </motion.div>

                {/* Submit */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.4 }}
                  className="pt-1"
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 font-medium shadow-sm transition-all"
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </motion.div>

                {/* Sign up */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1, duration: 0.4 }}
                  className="text-center text-sm text-muted-foreground pt-2"
                >
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/sign-up"
                    className="text-primary hover:text-primary/90 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </motion.p>
              </form>
            </motion.div>

            {/* Tagline below glass card */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.6 }}
              className="text-center text-xs text-muted-foreground tracking-wider uppercase"
            >
              Built for builders
            </motion.p>
          </div>
        </div>

        {/* ─── Right: Animated Building Scene ─── */}
        <div className="hidden lg:flex relative overflow-hidden items-center justify-center">
          {/* Subtle ground gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-primary/5 to-transparent"
          />

          <svg
            viewBox="0 0 800 900"
            className="w-full max-w-2xl relative z-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: "-2px" }}
          >
            {/* ── Ground plane ── */}
            <line
              x1="0" y1="850" x2="800" y2="850"
              stroke="hsl(var(--muted-foreground) / 0.45)" strokeWidth="2"
              className="bld-draw" style={{ animationDelay: "0s" }}
            />
            <line
              x1="50" y1="850" x2="750" y2="850"
              stroke="#334155" strokeWidth="1"
              className="bld-draw" style={{ animationDelay: "0.1s" }}
            />

            {/* ── MAIN BUILDING (center, 16 floors) ── */}
            {/* Foundation / base slab */}
            <rect
              x="200" y="830" width="300" height="20"
              fill="hsl(var(--secondary))"
              className="bld-fade" style={{ animationDelay: "0.3s" }}
            />
            <rect
              x="200" y="830" width="300" height="2"
              fill="#334155"
              className="bld-fade" style={{ animationDelay: "0.35s" }}
            />

            {/* Outer walls - left and right edges */}
            <line
              x1="200" y1="830" x2="200" y2="130"
              stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="3"
              className="bld-draw-slow" style={{ animationDelay: "0.5s" }}
            />
            <line
              x1="500" y1="830" x2="500" y2="130"
              stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="3"
              className="bld-draw-slow" style={{ animationDelay: "0.6s" }}
            />

            {/* Structural columns */}
            {[250, 310, 370, 440].map((x, i) => (
              <line
                key={`col-${x}`}
                x1={x} y1="830" x2={x} y2="130"
                stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="1.5"
                className="bld-draw-slow"
                style={{ animationDelay: `${0.7 + i * 0.08}s` }}
              />
            ))}

            {/* Floor slabs - 16 floors */}
            {Array.from({ length: 16 }, (_, i) => {
              const y = 830 - (i + 1) * 43;
              return (
                <g key={`floor-${i}`}>
                  {/* Floor line */}
                  <line
                    x1="198" y1={y} x2="502" y2={y}
                    stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="2"
                    className="bld-draw"
                    style={{ animationDelay: `${1.0 + i * 0.06}s` }}
                  />
                  {/* Floor fill */}
                  <rect
                    x="200" y={y} width="300" height="3"
                    fill="hsl(var(--muted-foreground) / 0.45)"
                    className="bld-fade"
                    style={{ animationDelay: `${1.1 + i * 0.06}s` }}
                  />
                </g>
              );
            })}

            {/* Roof slab + parapet */}
            <rect
              x="195" y="126" width="310" height="6"
              fill="hsl(var(--muted-foreground) / 0.55)"
              className="bld-fade" style={{ animationDelay: "2.0s" }}
            />
            <line
              x1="195" y1="122" x2="505" y2="122"
              stroke="#64748b" strokeWidth="1.5"
              className="bld-draw" style={{ animationDelay: "2.1s" }}
            />

            {/* ── Windows (4 columns x 15 visible floors) ── */}
            {Array.from({ length: 15 }, (_, floor) =>
              Array.from({ length: 4 }, (_, col) => {
                const x = 215 + col * 68;
                const y = 830 - (floor + 1) * 43 + 8;
                const delay = 1.8 + floor * 0.04 + col * 0.03;
                const isLit =
                  (floor + col) % 3 !== 0 && (floor * col + floor) % 4 !== 0;
                return (
                  <g key={`w-${floor}-${col}`}>
                    {/* Window frame */}
                    <rect
                      x={x} y={y} width="48" height="30" rx="1"
                      fill={isLit ? "hsl(var(--muted-subtle) / 0.8)" : "hsl(var(--muted-subtle) / 0.65)"}
                      stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="0.5"
                      className="bld-fade"
                      style={{ animationDelay: `${delay}s` }}
                    />
                    {/* Window glass/light */}
                    <rect
                      x={x + 1} y={y + 1} width="46" height="28" rx="0.5"
                      fill={isLit ? "hsl(var(--primary))" : "hsl(var(--muted-subtle) / 0.55)"}
                      fillOpacity={isLit ? 0.25 : 0.3}
                      className={`bld-fade ${isLit ? "bld-window-glow" : ""}`}
                      style={{
                        animationDelay: `${delay}s`,
                        ...(isLit
                          ? { animationDelay: `${delay}s, ${delay + 1}s` }
                          : {}),
                      }}
                    />
                    {/* Mullion (center vertical bar) */}
                    <line
                      x1={x + 24} y1={y + 2} x2={x + 24} y2={y + 28}
                      stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="0.5"
                      className="bld-fade"
                      style={{ animationDelay: `${delay + 0.1}s` }}
                    />
                  </g>
                );
              })
            )}

            {/* ── Building entrance / lobby ── */}
            <rect
              x="310" y="800" width="80" height="30" rx="2"
              fill="hsl(var(--muted-subtle) / 0.8)" stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="1"
              className="bld-fade" style={{ animationDelay: "2.2s" }}
            />
            <rect
              x="316" y="803" width="32" height="24" rx="1"
              fill="hsl(var(--primary))" fillOpacity="0.2"
              className="bld-fade" style={{ animationDelay: "2.3s" }}
            />
            <rect
              x="352" y="803" width="32" height="24" rx="1"
              fill="hsl(var(--primary))" fillOpacity="0.2"
              className="bld-fade" style={{ animationDelay: "2.35s" }}
            />
            {/* Canopy */}
            <line
              x1="300" y1="798" x2="400" y2="798"
              stroke="hsl(var(--muted-foreground))" strokeWidth="2"
              className="bld-draw" style={{ animationDelay: "2.4s" }}
            />

            {/* ── SMALLER BUILDING (left, 8 floors) ── */}
            <rect
              x="70" y="830" width="110" height="15"
              fill="hsl(var(--secondary))"
              className="bld-fade" style={{ animationDelay: "0.4s" }}
            />
            <line
              x1="70" y1="830" x2="70" y2="490"
              stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.8s" }}
            />
            <line
              x1="180" y1="830" x2="180" y2="490"
              stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.9s" }}
            />
            {/* Floors */}
            {Array.from({ length: 8 }, (_, i) => {
              const y = 830 - (i + 1) * 42;
              return (
                <line
                  key={`sf-${i}`}
                  x1="70" y1={y} x2="180" y2={y}
                  stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="1.5"
                  className="bld-draw"
                  style={{ animationDelay: `${1.2 + i * 0.06}s` }}
                />
              );
            })}
            {/* Small building windows */}
            {Array.from({ length: 7 }, (_, floor) =>
              Array.from({ length: 2 }, (_, col) => {
                const x = 82 + col * 50;
                const y = 830 - (floor + 1) * 42 + 8;
                const delay = 2.0 + floor * 0.04;
                const lit = (floor + col) % 2 === 0;
                return (
                  <rect
                    key={`sw-${floor}-${col}`}
                    x={x} y={y} width="36" height="26" rx="1"
                    fill={lit ? "hsl(var(--primary))" : "hsl(var(--muted-subtle) / 0.55)"}
                    fillOpacity={lit ? 0.15 : 0.2}
                    stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="0.5"
                    className="bld-fade"
                    style={{ animationDelay: `${delay}s` }}
                  />
                );
              })
            )}
            {/* Roof */}
            <rect
              x="68" y="486" width="114" height="5"
              fill="hsl(var(--muted-foreground) / 0.35)"
              className="bld-fade" style={{ animationDelay: "2.0s" }}
            />

            {/* ── BACKGROUND BUILDING (right, taller but faded) ── */}
            <line
              x1="560" y1="850" x2="560" y2="200"
              stroke="hsl(var(--muted-foreground) / 0.45)" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.6s" }}
            />
            <line
              x1="720" y1="850" x2="720" y2="200"
              stroke="hsl(var(--muted-foreground) / 0.45)" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.7s" }}
            />
            {Array.from({ length: 14 }, (_, i) => {
              const y = 850 - (i + 1) * 45;
              return (
                <line
                  key={`bf-${i}`}
                  x1="560" y1={y} x2="720" y2={y}
                  stroke="hsl(var(--muted-foreground) / 0.45)" strokeWidth="1"
                  className="bld-draw"
                  style={{ animationDelay: `${1.0 + i * 0.05}s` }}
                />
              );
            })}
            {/* Faint windows */}
            {Array.from({ length: 12 }, (_, floor) =>
              Array.from({ length: 3 }, (_, col) => {
                const x = 574 + col * 48;
                const y = 850 - (floor + 1) * 45 + 10;
                return (
                  <rect
                    key={`bw-${floor}-${col}`}
                    x={x} y={y} width="34" height="26" rx="1"
                    fill="hsl(var(--muted-subtle) / 0.55)" fillOpacity="0.3"
                    className="bld-fade"
                    style={{ animationDelay: `${2.0 + floor * 0.03}s` }}
                  />
                );
              })
            )}

            {/* ── TOWER CRANE ── */}
            {/* Crane mast (on main building) */}
            <line
              x1="430" y1="830" x2="430" y2="80"
              stroke="hsl(var(--primary))" strokeWidth="4"
              className="bld-draw-slow" style={{ animationDelay: "1.8s" }}
            />
            {/* Mast lattice lines */}
            {Array.from({ length: 12 }, (_, i) => {
              const y1 = 800 - i * 60;
              return (
                <g key={`latt-${i}`}>
                  <line
                    x1="426" y1={y1} x2="434" y2={y1 - 30}
                    stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.5"
                    className="bld-draw"
                    style={{ animationDelay: `${2.0 + i * 0.04}s` }}
                  />
                  <line
                    x1="434" y1={y1} x2="426" y2={y1 - 30}
                    stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.5"
                    className="bld-draw"
                    style={{ animationDelay: `${2.0 + i * 0.04}s` }}
                  />
                </g>
              );
            })}

            {/* Crane slew (pivot) */}
            <rect
              x="422" y="88" width="16" height="10" rx="2"
              fill="hsl(var(--primary))"
              className="bld-fade" style={{ animationDelay: "2.3s" }}
            />

            {/* Crane jib (arm) + counter-jib */}
            <g className="bld-crane-arm">
              {/* Main jib to the left */}
              <line
                x1="240" y1="95" x2="430" y2="95"
                stroke="hsl(var(--primary))" strokeWidth="3"
              />
              {/* Counter-jib to the right */}
              <line
                x1="430" y1="95" x2="530" y2="95"
                stroke="hsl(var(--primary))" strokeWidth="2.5"
              />
              {/* Counterweight */}
              <rect x="510" y="90" width="25" height="12" rx="1" fill="hsl(var(--primary))" />
              {/* Tie rods (cables from peak to jib ends) */}
              <line
                x1="430" y1="70" x2="240" y2="95"
                stroke="hsl(var(--muted-foreground) / 0.75)" strokeWidth="0.8"
              />
              <line
                x1="430" y1="70" x2="530" y2="95"
                stroke="hsl(var(--muted-foreground) / 0.75)" strokeWidth="0.8"
              />
              {/* Peak / cat head */}
              <line
                x1="430" y1="95" x2="430" y2="65"
                stroke="hsl(var(--primary))" strokeWidth="3"
              />
              <polygon points="425,65 435,65 430,58" fill="hsl(var(--primary))" />

              {/* Trolley on jib */}
              <rect x="305" y="91" width="12" height="6" rx="1" fill="hsl(var(--muted-foreground) / 0.75)" />
              {/* Hook cable */}
              <line
                x1="311" y1="97" x2="311" y2="180"
                stroke="hsl(var(--muted-foreground) / 0.75)" strokeWidth="1" strokeDasharray="3,2"
              />
              {/* Hook */}
              <path
                d="M307,180 L315,180 L313,190 C313,194 309,194 309,190 Z"
                fill="hsl(var(--muted-foreground) / 0.75)"
              />
              {/* Suspended beam */}
              <rect
                x="295" y="192" width="32" height="6" rx="1"
                fill="hsl(var(--muted-foreground))"
                className="bld-fade" style={{ animationDelay: "3.0s" }}
              />
            </g>

            {/* ── Flag on crane peak ── */}
            <g
              className="bld-fade-up"
              style={{ animationDelay: "3.2s" }}
            >
              <line
                x1="430" y1="58" x2="430" y2="38"
                stroke="hsl(var(--foreground) / 0.9)" strokeWidth="1"
              />
              <polygon points="430,38 450,44 430,50" fill="hsl(var(--primary))" opacity="0.8" />
            </g>

            {/* ── Ground details ── */}
            {/* Construction fence posts */}
            {Array.from({ length: 6 }, (_, i) => {
              const x = 520 + i * 30;
              return (
                <g key={`fence-${i}`}>
                  <line
                    x1={x} y1="850" x2={x} y2="838"
                    stroke="hsl(var(--muted-foreground))" strokeWidth="1"
                    className="bld-fade"
                    style={{ animationDelay: `${2.5 + i * 0.05}s` }}
                  />
                  {i < 5 && (
                    <line
                      x1={x} y1="842" x2={x + 30} y2="842"
                      stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.5"
                      className="bld-draw"
                      style={{ animationDelay: `${2.6 + i * 0.05}s` }}
                    />
                  )}
                </g>
              );
            })}

            {/* Scaffolding on left side of main building */}
            <g>
              {Array.from({ length: 5 }, (_, i) => {
                const y = 830 - i * 85;
                return (
                  <g key={`scaff-${i}`}>
                    <line
                      x1="190" y1={y} x2="190" y2={y - 85}
                      stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="1" opacity="0.4"
                      className="bld-draw"
                      style={{ animationDelay: `${2.8 + i * 0.06}s` }}
                    />
                    <line
                      x1="185" y1={y - 42} x2="200" y2={y - 42}
                      stroke="hsl(var(--muted-foreground) / 0.55)" strokeWidth="0.8" opacity="0.3"
                      className="bld-draw"
                      style={{ animationDelay: `${2.9 + i * 0.06}s` }}
                    />
                  </g>
                );
              })}
            </g>

            {/* Small equipment on ground */}
            <rect
              x="100" y="840" width="20" height="10" rx="1"
              fill="hsl(var(--muted-foreground) / 0.35)"
              className="bld-fade" style={{ animationDelay: "3.0s" }}
            />
            <rect
              x="540" y="842" width="14" height="8" rx="1"
              fill="hsl(var(--muted-foreground) / 0.35)"
              className="bld-fade" style={{ animationDelay: "3.1s" }}
            />
          </svg>
        </div>
      </div>
    </>
  );
}
