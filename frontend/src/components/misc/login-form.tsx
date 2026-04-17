"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      toast.success("Logged in successfully");

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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} data-dev-autofill-disabled="true">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {successMessage && (
                <p className="text-sm text-success">{successMessage}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
