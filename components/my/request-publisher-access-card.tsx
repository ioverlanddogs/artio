"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type AccessRequestState = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

type AccessRequestRecord = {
  id: string;
  requestedRole: "VIEWER" | "MODERATOR" | "OPERATOR" | "ADMIN";
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

type Props = {
  currentRole: "USER" | "EDITOR" | "ADMIN";
};

function formatRequestedRole(role: AccessRequestRecord["requestedRole"]) {
  return role.toLowerCase();
}

export function RequestPublisherAccessCard({ currentRole }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<AccessRequestState>("NONE");
  const [request, setRequest] = useState<AccessRequestRecord | null>(null);
  const [result, setResult] = useState<string>("");

  async function loadState() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/access/request", { method: "GET", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setState((body.state as AccessRequestState) ?? "NONE");
        setRequest((body.request as AccessRequestRecord | null) ?? null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  async function onRequestAccess() {
    setIsSubmitting(true);
    setResult("");
    try {
      const response = await fetch("/api/access/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestedRole: "operator", reason: "publisher_dashboard" }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setState((body.request?.status as AccessRequestState) ?? "PENDING");
        setRequest((body.request as AccessRequestRecord | null) ?? null);
        setResult("Request sent. We will review it soon.");
      } else if (response.status === 409) {
        setResult("You already have a pending access request.");
      } else {
        setResult("Could not send request right now.");
      }
    } catch {
      setResult("Could not send request right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Request Publisher Access</h2>
      <p className="mt-1 text-sm text-muted-foreground">Current role: {currentRole.toLowerCase()}</p>
      {isLoading ? <p className="mt-1 text-sm text-muted-foreground">Loading request status...</p> : null}
      {!isLoading ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Request status: {state === "NONE" ? "none" : state.toLowerCase()}
          {request ? ` · requested role: ${formatRequestedRole(request.requestedRole)}` : ""}
        </p>
      ) : null}
      {state === "REJECTED" && request?.rejectionReason ? <p className="mt-1 text-sm text-destructive">Rejection reason: {request.rejectionReason}</p> : null}
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" onClick={onRequestAccess} disabled={isSubmitting || state === "PENDING"}>{isSubmitting ? "Sending..." : "Request Publisher Access"}</Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">{result}</p>
      </div>
    </section>
  );
}
