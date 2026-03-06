"use client";

import Link from "next/link";
import { useState } from "react";

type AssociationItem = {
  id: string;
  status: string;
  role: string | null;
  message: string | null;
  createdAt: string;
  artist: { id: string; name: string; slug: string };
  event: { id: string; title: string; slug: string; startAt: string; venue: { name: string } | null };
};

type Props = {
  initialItems: AssociationItem[];
  currentStatus: string;
};

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export function ArtistEventAssociationsClient({ initialItems, currentStatus }: Props) {
  const [items, setItems] = useState(initialItems);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setLoadingIds((prev) => new Set(prev).add(id));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const res = await fetch(`/api/admin/artist-event-associations/${id}/${action}`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [id]: "Failed to update association. Please try again.",
      }));
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {STATUSES.map((status) => {
          const isActive = currentStatus === status;
          return (
            <Link
              key={status}
              href={`/admin/artist-event-associations?status=${status}`}
              className={`rounded border px-3 py-1 text-sm ${
                isActive ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              {status}
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border bg-background p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>Artist</th>
              <th>Event</th>
              <th>Venue</th>
              <th>Role</th>
              <th>Message</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLoading = loadingIds.has(item.id);
              const truncatedMessage = item.message
                ? item.message.length > 80
                  ? `${item.message.slice(0, 80)}…`
                  : item.message
                : "—";

              return (
                <tr key={item.id} className="border-t">
                  <td className="py-2">
                    <Link href={`/artists/${item.artist.slug}`} className="underline">
                      {item.artist.name}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/events/${item.event.slug}`} className="underline">
                      {item.event.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.event.startAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>{item.event.venue?.name ?? "—"}</td>
                  <td>{item.role ?? "—"}</td>
                  <td>{truncatedMessage}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    {currentStatus === "PENDING" ? (
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                            onClick={() => handleAction(item.id, "approve")}
                            disabled={isLoading}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            onClick={() => handleAction(item.id, "reject")}
                            disabled={isLoading}
                          >
                            Reject
                          </button>
                        </div>
                        {rowErrors[item.id] ? (
                          <div className="text-xs text-red-600">{rowErrors[item.id]}</div>
                        ) : null}
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
