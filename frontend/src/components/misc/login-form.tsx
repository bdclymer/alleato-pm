"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { createAuthClient } from "@/lib/supabase/client-auth";
import { validateCallbackUrl } from "@/lib/validation/callback-url";
import { toast } from "sonner";
import { PasswordInput } from "@/components/misc/password-input";

type LoginFormProps = React.ComponentPropsWithoutRef<"div"> & {
  redirectTo?: string;
};

export function LoginForm({
  className,
  redirectTo = "/",
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = createAuthClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Always show generic message to prevent email enumeration
        setError("Invalid email or password");
        toast.error("Invalid email or password");
        return;
      }

      if (!data?.user) {
        setError("Login failed. Please try again.");
        toast.error("Login failed. Please try again.");
        return;
      }

      setSuccessMessage("Login successful! Redirecting you now...");

      // Determine the redirect path then do a full-page navigation.
      // window.location.href instead of router.push() avoids a race condition
      // with router.refresh() in Next.js 15 and guarantees the middleware reads
      // the freshly-set session cookie on the next request.
      let destination = "/";

      if (redirectTo !== "/") {
        destination = validateCallbackUrl(redirectTo);
      } else {
        try {
          const result = await apiFetch<{ redirect?: string }>(
            "/api/auth/post-login-redirect",
          );
          destination = result?.redirect || "/";
        } catch {
          destination = "/";
        }
      }

      window.location.href = destination;
    } catch (err: unknown) {
      const fallbackMessage =
        "An error occurred during login. Please try again.";
      setError(err instanceof Error ? err.message : fallbackMessage);
      toast.error(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <form
        onSubmit={handleLogin}
        className="w-full space-y-6"
        data-dev-autofill-disabled="true"
      >
        <div className="space-y-3">
          <Label
            htmlFor="email"
            className="text-base font-medium text-primary-foreground/64"
          >
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            required
            disabled={isLoading}
            data-auth-input="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-16 rounded-md border-0 bg-primary-foreground/15 px-5 text-base font-medium text-primary-foreground shadow-none placeholder:text-primary-foreground/48 focus-visible:bg-primary-foreground/18 focus-visible:ring-2 focus-visible:ring-primary-foreground/20"
          />
        </div>

        <div className="space-y-3">
          <Label
            htmlFor="password"
            className="text-base font-medium text-primary-foreground/64"
          >
            Password
          </Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={isLoading}
            data-auth-input="true"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-16 rounded-md border-0 bg-primary-foreground/15 px-5 text-base font-medium text-primary-foreground shadow-none placeholder:text-primary-foreground/48 focus-visible:bg-primary-foreground/18 focus-visible:ring-2 focus-visible:ring-primary-foreground/20"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-primary">
            {error}
          </p>
        )}
        {successMessage && (
          <p role="status" className="text-sm font-medium text-green-200">
            {successMessage}
          </p>
        )}

        <Button
          type="submit"
          className="h-16 w-full rounded-md bg-primary text-base font-semibold text-primary-foreground shadow-none hover:bg-primary/90 focus-visible:ring-primary/40"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>

        <div className="space-y-4 pt-6 text-center text-sm text-primary-foreground/52">
          <Link
            href="/auth/forgot-password"
            className="block underline-offset-4 transition-colors hover:text-primary-foreground/70 hover:underline"
          >
            Forgot your password?
          </Link>
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="underline-offset-4 transition-colors hover:text-primary-foreground/70 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
