"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type InquiryRow = {
  id: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  message: string | null;
  artwork: {
    title: string;
    slug: string | null;
  };
};

export default function ArtworkInquiriesClient({ inquiries, thirtyDayCount }: { inquiries: InquiryRow[]; thirtyDayCount: number }) {
  const statTone = thirtyDayCount >= 10
    ? "text-emerald-600"
    : thirtyDayCount >= 5
      ? "text-amber-600"
      : "text-muted-foreground";

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-background p-5">
        <p className={`text-3xl font-bold ${statTone}`}>{thirtyDayCount} inquiries in the last 30 days</p>
        <p className="mt-1 text-sm text-muted-foreground">Gate B condition B1: target ≥ 10</p>
        <div className="mt-3">
          <Badge variant="outline">Gate B measurement instrument</Badge>
        </div>
      </section>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Artwork</TableHead>
              <TableHead>Buyer name</TableHead>
              <TableHead>Buyer email</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.map((inquiry) => {
              const truncatedMessage = inquiry.message
                ? (inquiry.message.length > 80 ? `${inquiry.message.slice(0, 80)}…` : inquiry.message)
                : "—";

              return (
                <TableRow key={inquiry.id}>
                  <TableCell className="whitespace-nowrap">{new Date(inquiry.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {inquiry.artwork.slug ? (
                      <Link className="underline-offset-2 hover:underline" href={`/artwork/${inquiry.artwork.slug}`}>
                        {inquiry.artwork.title}
                      </Link>
                    ) : (
                      inquiry.artwork.title
                    )}
                  </TableCell>
                  <TableCell>{inquiry.buyerName}</TableCell>
                  <TableCell>
                    <a className="underline-offset-2 hover:underline" href={`mailto:${inquiry.buyerEmail}`}>{inquiry.buyerEmail}</a>
                  </TableCell>
                  <TableCell className="max-w-[360px] truncate" title={inquiry.message ?? ""}>{truncatedMessage}</TableCell>
                </TableRow>
              );
            })}
            {inquiries.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground" colSpan={5}>No inquiries yet.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
