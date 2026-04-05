"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

export function LoginButton({ callbackUrl = "/account", testAuthEnabled = false }: { callbackUrl?: string; testAuthEnabled?: boolean }) {
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkGoogleProvider() {
      try {
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load auth providers");
        const providers = (await res.json()) as Record<string, unknown>;
        if (!isMounted) return;

        if (!providers?.google) {
          setIsGoogleAvailable(false);
          setGoogleError("Google sign-in is temporarily unavailable. Please contact support.");
          return;
        }

        setIsGoogleAvailable(true);
        setGoogleError(null);
      } catch {
        if (!isMounted) return;
        setIsGoogleAvailable(false);
        setGoogleError("Unable to initialize Google sign-in right now. Please try again later.");
      }
    }

    if (!testAuthEnabled) {
      void checkGoogleProvider();
    }

    return () => {
      isMounted = false;
    };
  }, [testAuthEnabled]);

  async function handleTestLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Invalid test credentials");
      router.push("/for-you");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleError(null);

    if (!isGoogleAvailable) {
      setGoogleError("Google sign-in is not configured. Please contact support.");
      return;
    }

    try {
      const result = await signIn("google", { callbackUrl, redirect: false });

      if (!result) {
        setGoogleError("Google sign-in failed to start. Please try again.");
        return;
      }

      if (result.error) {
        setGoogleError("Google sign-in is unavailable right now. Please try again later.");
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch {
      setGoogleError("Unable to start Google sign-in right now. Please try again.");
    }
  }

  if (testAuthEnabled) {
    return (
      <div className="space-y-3">
        {!showEmailLogin ? (
          <Button type="button" onClick={() => setShowEmailLogin(true)}>
            Continue with email
          </Button>
        ) : (
          <form className="space-y-3" onSubmit={handleTestLogin}>
            <label className="block text-sm" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full rounded border p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="block text-sm" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full rounded border p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" disabled={isSubmitting}>
              Login
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleGoogleSignIn} disabled={!isGoogleAvailable}>
        Continue with Google
      </Button>
      {googleError ? <p className="text-sm text-red-600">{googleError}</p> : null}
    </div>
  );
}
