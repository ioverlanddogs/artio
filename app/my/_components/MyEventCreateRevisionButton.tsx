"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enqueueToast } from "@/lib/toast";

export default function MyEventCreateRevisionButton({ eventId }: { eventId: string }) {
  const router = useRouter();

  function onCreateRevision() {
    enqueueToast({ title: "Edit this event and save changes to prepare a revision.", variant: "success" });
    router.push(`/my/events/${eventId}`);
  }

  return (
    <Button type="button" variant="link" className="h-auto p-0" onClick={onCreateRevision}>
      Create revision
    </Button>
  );
}
