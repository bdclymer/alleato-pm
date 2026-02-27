"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { createAuthClient } from "@/lib/supabase/client-auth";
import { validateCallbackUrl } from "@/lib/validation/callback-url";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          const response = await fetch("/api/auth/post-login-redirect");
          const { redirect } = await response.json();
          setTimeout(() => {
            router.push(redirect || "/");
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

      <div className="min-h-screen bg-[#0a0e17] grid lg:grid-cols-[1fr_1.3fr] relative overflow-hidden">
        {/* Ambient background glow */}
        <div
          className="bld-ambient absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(219,128,45,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Floating particles (full page) */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="bld-particle absolute w-[2px] h-[2px] bg-white/10 rounded-full"
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
              className="rounded-2xl border border-white/[0.08] p-8"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Welcome back
                </h1>
                <p className="text-sm text-slate-400 mt-1.5">
                  Sign in to your account
                </p>
              </motion.div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                data-dev-autofill-disabled="true"
              >
                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-slate-300 text-sm">
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
                    className="bg-white/[0.06] border-white/[0.08] text-white placeholder:text-slate-500 focus:ring-1 focus:ring-[#DB802D]/50 focus:border-[#DB802D]/50 transition-all"
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
                    <Label htmlFor="password" className="text-slate-300 text-sm">
                      Password
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-slate-500 hover:text-[#DB802D] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/[0.06] border-white/[0.08] text-white placeholder:text-slate-500 focus:ring-1 focus:ring-[#DB802D]/50 focus:border-[#DB802D]/50 transition-all"
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
                    className="w-full h-11 bg-[#DB802D] hover:bg-[#c47228] text-white font-medium shadow-lg shadow-[#DB802D]/20 transition-all hover:shadow-[#DB802D]/30"
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </motion.div>

                {/* Sign up */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1, duration: 0.4 }}
                  className="text-center text-sm text-slate-500 pt-2"
                >
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/sign-up"
                    className="text-[#DB802D] hover:text-[#e8923e] font-medium transition-colors"
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
              className="text-center text-xs text-slate-600 tracking-wider uppercase"
            >
              Built for builders
            </motion.p>
          </div>
        </div>

        {/* ─── Right: Animated Building Scene ─── */}
        <div className="hidden lg:flex relative overflow-hidden items-end justify-center">
          {/* Subtle ground gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(219,128,45,0.04) 0%, transparent 100%)",
            }}
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
              stroke="#1e293b" strokeWidth="2"
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
              fill="#1a2236"
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
              stroke="#475569" strokeWidth="3"
              className="bld-draw-slow" style={{ animationDelay: "0.5s" }}
            />
            <line
              x1="500" y1="830" x2="500" y2="130"
              stroke="#475569" strokeWidth="3"
              className="bld-draw-slow" style={{ animationDelay: "0.6s" }}
            />

            {/* Structural columns */}
            {[250, 310, 370, 440].map((x, i) => (
              <line
                key={`col-${x}`}
                x1={x} y1="830" x2={x} y2="130"
                stroke="#334155" strokeWidth="1.5"
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
                    stroke="#475569" strokeWidth="2"
                    className="bld-draw"
                    style={{ animationDelay: `${1.0 + i * 0.06}s` }}
                  />
                  {/* Floor fill */}
                  <rect
                    x="200" y={y} width="300" height="3"
                    fill="#1e293b"
                    className="bld-fade"
                    style={{ animationDelay: `${1.1 + i * 0.06}s` }}
                  />
                </g>
              );
            })}

            {/* Roof slab + parapet */}
            <rect
              x="195" y="126" width="310" height="6"
              fill="#475569"
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
                      fill={isLit ? "#0f1a2e" : "#0c1322"}
                      stroke="#334155" strokeWidth="0.5"
                      className="bld-fade"
                      style={{ animationDelay: `${delay}s` }}
                    />
                    {/* Window glass/light */}
                    <rect
                      x={x + 1} y={y + 1} width="46" height="28" rx="0.5"
                      fill={isLit ? "#DB802D" : "#1a2744"}
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
                      stroke="#334155" strokeWidth="0.5"
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
              fill="#0f1a2e" stroke="#475569" strokeWidth="1"
              className="bld-fade" style={{ animationDelay: "2.2s" }}
            />
            <rect
              x="316" y="803" width="32" height="24" rx="1"
              fill="#DB802D" fillOpacity="0.2"
              className="bld-fade" style={{ animationDelay: "2.3s" }}
            />
            <rect
              x="352" y="803" width="32" height="24" rx="1"
              fill="#DB802D" fillOpacity="0.2"
              className="bld-fade" style={{ animationDelay: "2.35s" }}
            />
            {/* Canopy */}
            <line
              x1="300" y1="798" x2="400" y2="798"
              stroke="#64748b" strokeWidth="2"
              className="bld-draw" style={{ animationDelay: "2.4s" }}
            />

            {/* ── SMALLER BUILDING (left, 8 floors) ── */}
            <rect
              x="70" y="830" width="110" height="15"
              fill="#111827"
              className="bld-fade" style={{ animationDelay: "0.4s" }}
            />
            <line
              x1="70" y1="830" x2="70" y2="490"
              stroke="#374151" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.8s" }}
            />
            <line
              x1="180" y1="830" x2="180" y2="490"
              stroke="#374151" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.9s" }}
            />
            {/* Floors */}
            {Array.from({ length: 8 }, (_, i) => {
              const y = 830 - (i + 1) * 42;
              return (
                <line
                  key={`sf-${i}`}
                  x1="70" y1={y} x2="180" y2={y}
                  stroke="#374151" strokeWidth="1.5"
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
                    fill={lit ? "#DB802D" : "#1a2744"}
                    fillOpacity={lit ? 0.15 : 0.2}
                    stroke="#334155" strokeWidth="0.5"
                    className="bld-fade"
                    style={{ animationDelay: `${delay}s` }}
                  />
                );
              })
            )}
            {/* Roof */}
            <rect
              x="68" y="486" width="114" height="5"
              fill="#374151"
              className="bld-fade" style={{ animationDelay: "2.0s" }}
            />

            {/* ── BACKGROUND BUILDING (right, taller but faded) ── */}
            <line
              x1="560" y1="850" x2="560" y2="200"
              stroke="#1e293b" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.6s" }}
            />
            <line
              x1="720" y1="850" x2="720" y2="200"
              stroke="#1e293b" strokeWidth="2"
              className="bld-draw-slow" style={{ animationDelay: "0.7s" }}
            />
            {Array.from({ length: 14 }, (_, i) => {
              const y = 850 - (i + 1) * 45;
              return (
                <line
                  key={`bf-${i}`}
                  x1="560" y1={y} x2="720" y2={y}
                  stroke="#1e293b" strokeWidth="1"
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
                    fill="#1a2744" fillOpacity="0.3"
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
              stroke="#DB802D" strokeWidth="4"
              className="bld-draw-slow" style={{ animationDelay: "1.8s" }}
            />
            {/* Mast lattice lines */}
            {Array.from({ length: 12 }, (_, i) => {
              const y1 = 800 - i * 60;
              return (
                <g key={`latt-${i}`}>
                  <line
                    x1="426" y1={y1} x2="434" y2={y1 - 30}
                    stroke="#DB802D" strokeWidth="0.8" opacity="0.5"
                    className="bld-draw"
                    style={{ animationDelay: `${2.0 + i * 0.04}s` }}
                  />
                  <line
                    x1="434" y1={y1} x2="426" y2={y1 - 30}
                    stroke="#DB802D" strokeWidth="0.8" opacity="0.5"
                    className="bld-draw"
                    style={{ animationDelay: `${2.0 + i * 0.04}s` }}
                  />
                </g>
              );
            })}

            {/* Crane slew (pivot) */}
            <rect
              x="422" y="88" width="16" height="10" rx="2"
              fill="#DB802D"
              className="bld-fade" style={{ animationDelay: "2.3s" }}
            />

            {/* Crane jib (arm) + counter-jib */}
            <g className="bld-crane-arm">
              {/* Main jib to the left */}
              <line
                x1="240" y1="95" x2="430" y2="95"
                stroke="#DB802D" strokeWidth="3"
              />
              {/* Counter-jib to the right */}
              <line
                x1="430" y1="95" x2="530" y2="95"
                stroke="#DB802D" strokeWidth="2.5"
              />
              {/* Counterweight */}
              <rect x="510" y="90" width="25" height="12" rx="1" fill="#DB802D" />
              {/* Tie rods (cables from peak to jib ends) */}
              <line
                x1="430" y1="70" x2="240" y2="95"
                stroke="#94a3b8" strokeWidth="0.8"
              />
              <line
                x1="430" y1="70" x2="530" y2="95"
                stroke="#94a3b8" strokeWidth="0.8"
              />
              {/* Peak / cat head */}
              <line
                x1="430" y1="95" x2="430" y2="65"
                stroke="#DB802D" strokeWidth="3"
              />
              <polygon points="425,65 435,65 430,58" fill="#DB802D" />

              {/* Trolley on jib */}
              <rect x="305" y="91" width="12" height="6" rx="1" fill="#94a3b8" />
              {/* Hook cable */}
              <line
                x1="311" y1="97" x2="311" y2="180"
                stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"
              />
              {/* Hook */}
              <path
                d="M307,180 L315,180 L313,190 C313,194 309,194 309,190 Z"
                fill="#94a3b8"
              />
              {/* Suspended beam */}
              <rect
                x="295" y="192" width="32" height="6" rx="1"
                fill="#64748b"
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
                stroke="#e2e8f0" strokeWidth="1"
              />
              <polygon points="430,38 450,44 430,50" fill="#DB802D" opacity="0.8" />
            </g>

            {/* ── Ground details ── */}
            {/* Construction fence posts */}
            {Array.from({ length: 6 }, (_, i) => {
              const x = 520 + i * 30;
              return (
                <g key={`fence-${i}`}>
                  <line
                    x1={x} y1="850" x2={x} y2="838"
                    stroke="#64748b" strokeWidth="1"
                    className="bld-fade"
                    style={{ animationDelay: `${2.5 + i * 0.05}s` }}
                  />
                  {i < 5 && (
                    <line
                      x1={x} y1="842" x2={x + 30} y2="842"
                      stroke="#DB802D" strokeWidth="0.8" opacity="0.5"
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
                      stroke="#475569" strokeWidth="1" opacity="0.4"
                      className="bld-draw"
                      style={{ animationDelay: `${2.8 + i * 0.06}s` }}
                    />
                    <line
                      x1="185" y1={y - 42} x2="200" y2={y - 42}
                      stroke="#475569" strokeWidth="0.8" opacity="0.3"
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
              fill="#374151"
              className="bld-fade" style={{ animationDelay: "3.0s" }}
            />
            <rect
              x="540" y="842" width="14" height="8" rx="1"
              fill="#374151"
              className="bld-fade" style={{ animationDelay: "3.1s" }}
            />
          </svg>
        </div>
      </div>
    </>
  );
}
