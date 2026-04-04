"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";

type RequestItem = { id: string; email: string; note: string | null; createdAt: string };
type FeedbackItem = { id: string; email: string | null; pagePath: string | null; message: string; createdAt: string };

export function AdminBetaClient({ initialRequests, feedback }: { initialRequests: RequestItem[]; feedback: FeedbackItem[] }) {
  const [requests, setRequests] = useState(initialRequests);

  async function patchStatus(id: string, status: "APPROVED" | "DENIED") {
    const response = await fetch(`/api/admin/beta/requests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    setRequests((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <main className="space-y-8 p-6">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Beta requests</h1>
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Note</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="p-2">{item.email}</td>
                <td className="p-2">{item.note || "—"}</td>
                <td className="p-2">{formatDate(item.createdAt)}</td>
                <td className="space-x-2 p-2">
                  <Button size="sm" variant="outline" onClick={() => void patchStatus(item.id, "APPROVED")}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => void patchStatus(item.id, "DENIED")}>Deny</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Recent feedback</h2>
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Page</th>
              <th className="p-2">Message</th>
              <th className="p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="p-2">{item.email || "anonymous"}</td>
                <td className="p-2">{item.pagePath || "—"}</td>
                <td className="p-2">{item.message.slice(0, 180)}</td>
                <td className="p-2">{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-sm text-muted-foreground">Approving a request grants Publisher Dashboard role access (EDITOR) when a matching user account exists.</p>
    </main>
  );
}
