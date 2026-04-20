# Sprint 1 Execution Checklist — Core User Loop

**Goal:** Complete minimum sticky user loop: Discover → Save → Remind → Return

**Target Completion:** All acceptance checkpoints ✓  
**Current Status:** 0% — Not started

---

## Phase 0: Project Planning & Setup

### P0.1: Review Requirements
- [ ] Read [SPRINT_1_USER_CORE_LOOP.md](docs/artio_sprint_execution_bundle_for_codex/SPRINT_1_USER_CORE_LOOP.md)
- [ ] Read [ACCEPTANCE_CHECKPOINTS.md](docs/artio_sprint_execution_bundle_for_codex/ACCEPTANCE_CHECKPOINTS.md#sprint-1)
- [ ] Review [REPO_SPRINT_AUDIT_SPRINT1.md](REPO_SPRINT_AUDIT_SPRINT1.md)
- [ ] Confirm no changes to creator/recommendation/unrelated code

### P0.2: Local Setup  
```bash
cd /workspaces/artio
git checkout -b sprint-1/core-loop main
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm test
```

### P0.3: Establish Git Commit Structure
- One commit per database migration
- One commit per feature (Task 1 = reminder feature)
- One commit per UI section (Task 2, Task 3)
- Commit messages: `[Sprint1 Task#] Feature description`

---

## Phase 1: Database & Data Models

### P1.1: Create EventReminder Model [CRITICAL PATH]

**File:** `prisma/schema.prisma`

**Task:**
1. Locate Event model
2. Add after Event model:

```typescript
model EventReminder {
  id              String   @id @default(cuid())
  userId          String   @db.Uuid
  eventId         String
  reminderType    String   // "2H" | "24H"
  triggerAt       DateTime // When to send notification
  sentAt          DateTime? // NULL if not sent yet
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@unique([userId, eventId, reminderType])
  @@index([userId, triggerAt])
  @@index([sentAt])
}
```

3. Add to User model relation list:
```typescript
reminders EventReminder[]
```

4. Add to Event model relation list:
```typescript
reminders EventReminder[]
```

**Validation:**
```bash
pnpm prisma validate
```

**Commit:**
```
[Sprint1 Task1] Add EventReminder database model
```

---

### P1.2: Extend UserNotificationPrefs Model [CRITICAL PATH]

**File:** `prisma/schema.prisma`

**Task:**
1. Locate UserNotificationPrefs model (line ~496)
2. Replace model with:

```typescript
model UserNotificationPrefs {
  id                              String   @id @default(cuid())
  userId                          String   @unique @db.Uuid
  user                            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Existing
  emailOnSubmissionResult          Boolean  @default(true)
  emailOnTeamInvite               Boolean  @default(true)
  weeklyDigest                    Boolean  @default(false)
  
  // New for Sprint 1
  eventRemindersEnabled           Boolean  @default(true)
  emailOnFollowedCreatorUpdates   Boolean  @default(true)
  emailOnNearbyRecommendations    Boolean  @default(true)
  quietHoursStart                 DateTime? @db.Time
  quietHoursEnd                   DateTime? @db.Time
  
  createdAt                       DateTime @default(now())
  updatedAt                       DateTime @updatedAt
}
```

**Validation:**
```bash
pnpm prisma validate
```

**Commit:**
```
[Sprint1 Task3] Extend UserNotificationPrefs with reminder and creator prefs
```

---

### P1.3: Run Migrations

**Task:**
```bash
pnpm prisma migrate dev --name add_event_reminders_and_prefs
```

This creates TWO migrations:
- `add_event_reminders` (EventReminder table)
- `extend_user_notification_prefs` (UserNotificationPrefs columns)

**Expected output:**
```
✓ Prisma schema validated
✓ Created migration: migrations/[timestamp]_add_event_reminders_and_prefs/migration.sql
✓ Ran all pending migrations
```

**Validation:**
```bash
pnpm prisma generate
pnpm typecheck
```

**Commit:**
```
[Sprint1 Setup] Run database migrations for Event Reminders and Notification Preferences
```

---

## Phase 2: Task 1 — Event Reminder System

### T1.1: Create Reminder Button Component

**File:** `components/events/event-reminder-button.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Clock } from "lucide-react";
import { track } from "@/lib/analytics/client";

interface EventReminderButtonProps {
  eventId: string;
  eventSlug: string;
  startAt: Date;
  isAuthenticated: boolean;
  hasReminder2h?: boolean;
  hasReminder24h?: boolean;
  onReminderSet?: (type: "2H" | "24H") => void;
  onReminderRemoved?: () => void;
}

export function EventReminderButton({
  eventId,
  eventSlug,
  startAt,
  isAuthenticated,
  hasReminder2h,
  hasReminder24h,
  onReminderSet,
  onReminderRemoved,
}: EventReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEventPast = new Date(startAt) <= new Date();
  const hasAnyReminder = hasReminder2h || hasReminder24h;

  async function setReminder(type: "2H" | "24H") {
    if (!isAuthenticated) {
      track("event_reminder_clicked_unauthenticated", { eventSlug });
      return; // Should redirect to login
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderType: type }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to set reminder");
        return;
      }

      track("event_reminder_set", { eventSlug, type });
      // Show toast
      onReminderSet?.(type);
    } catch (e) {
      setError("Network error");
      console.error("Reminder error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function removeReminder() {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/reminders`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Failed to remove reminder");
        return;
      }

      track("event_reminder_removed", { eventSlug });
      onReminderRemoved?.();
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (isEventPast) {
    return null; // Don't show for past events
  }

  if (hasAnyReminder) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-green-600">
          <Clock className="h-4 w-4" />
          Reminder set
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={loading}>
              Change
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => removeReminder()} disabled={loading}>
              Remove reminder
            </DropdownMenuItem>
            {!hasReminder2h && (
              <DropdownMenuItem onClick={() => setReminder("2H")} disabled={loading}>
                Also add 2h reminder
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" disabled={loading}>
          <Bell className="h-4 w-4 mr-2" />
          Set reminder
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem onClick={() => setReminder("24H")} disabled={loading}>
          <div>24 hours before</div>
          <div className="text-xs text-muted-foreground">Tomorrow</div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setReminder("2H")} disabled={loading}>
          <div>2 hours before</div>
          <div className="text-xs text-muted-foreground">Just before</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Commit:**
```
[Sprint1 Task1] Add EventReminderButton component
```

---

### T1.2: Add Reminder Button to Event Detail

**File:** `components/events/event-detail-actions.tsx`

**Change:**
Import EventReminderButton and add to JSX:

```typescript
import { EventReminderButton } from "./event-reminder-button";

export function EventDetailActions({
  // ... existing props ...
  eventStartAt,
  eventId,
}: // ... existing + new props ...) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SaveEventButton /* ... */ />
      <EventReminderButton
        eventId={eventId}
        eventSlug={eventSlug}
        startAt={eventStartAt}
        isAuthenticated={isAuthenticated}
      />
      <AttendEventButton /* ... */ />
      {/* ... rest ... */}
    </div>
  );
}
```

**Commit:**
```
[Sprint1 Task1] Wire EventReminderButton into event detail page
```

---

### T1.3: Create Reminder API Endpoints

**File:** `app/api/events/[id]/reminders/route.ts` (NEW)

```typescript
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { reminderType } = body;

  if (!["2H", "24H"].includes(reminderType)) {
    return NextResponse.json({ message: "Invalid reminder type" }, { status: 400 });
  }

  // Verify event exists and is future
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, startAt: true },
  });

  if (!event || new Date(event.startAt) <= new Date()) {
    return NextResponse.json({ message: "Event not found or past" }, { status: 404 });
  }

  // Create or update reminder
  const reminder = await db.eventReminder.upsert({
    where: {
      userId_eventId_reminderType: {
        userId: user.id,
        eventId,
        reminderType,
      },
    },
    create: {
      userId: user.id,
      eventId,
      reminderType,
      triggerAt: new Date(
        new Date(event.startAt).getTime() - 
        (reminderType === "24H" ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000)
      ),
    },
    update: {
      sentAt: null, // Reset if already sent
    },
  });

  return NextResponse.json({
    id: reminder.id,
    reminderType: reminder.reminderType,
    triggerAt: reminder.triggerAt,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reminderType = searchParams.get("type") || "24H"; // Default to 24H

  await db.eventReminder.deleteMany({
    where: {
      userId: user.id,
      eventId,
      reminderType,
    },
  });

  return NextResponse.json({}, { status: 204 });
}
```

**File:** `app/api/events/[id]/reminders/[reminderId]/route.ts` (NEW)

```typescript
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  const { reminderId } = await params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const reminder = await db.eventReminder.delete({
    where: {
      id: reminderId,
      userId: user.id, // Ensure user owns reminder
    },
  }).catch(() => null);

  if (!reminder) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({}, { status: 204 });
}
```

**Commit:**
```
[Sprint1 Task1] Add reminder API endpoints (POST/DELETE)
```

---

### T1.4: Create Cron Job to Trigger Reminders

**File:** `lib/cron-trigger-event-reminders.ts` (NEW)

```typescript
import { PrismaClient } from "@prisma/client";

export async function enqueueEventRemindersWithDb(
  db: PrismaClient,
  now: Date
): Promise<{ queued: number; skipped: number }> {
  // Find reminders that should trigger now
  const reminders = await db.eventReminder.findMany({
    where: {
      triggerAt: { lte: now },
      sentAt: null,
    },
    include: {
      user: { select: { id: true, email: true } },
      event: { select: { id: true, title: true, startAt: true } },
    },
  });

  let queued = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    // Check if user has reminders enabled
    const prefs = await db.userNotificationPrefs.findUnique({
      where: { userId: reminder.userId },
      select: { eventRemindersEnabled: true },
    });

    if (prefs && !prefs.eventRemindersEnabled) {
      skipped++;
      continue;
    }

    // Queue notification in outbox
    await db.editorialNotificationLog.create({
      data: {
        userId: reminder.userId,
        type: "EVENT_REMINDER_24H", // TODO: handle 2H type
        targetId: reminder.event.id,
        sentAt: null,
      },
    });

    // Mark reminder as sent
    await db.eventReminder.update({
      where: { id: reminder.id },
      data: { sentAt: now },
    });

    queued++;
  }

  return { queued, skipped };
}
```

**File:** `app/api/cron/reminders/route.ts` (NEW)

```typescript
import { db } from "@/lib/db";
import { enqueueEventRemindersWithDb } from "@/lib/cron-trigger-event-reminders";
import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await enqueueEventRemindersWithDb(db, now);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    queued: result.queued,
    skipped: result.skipped,
  });
}
```

**Commit:**
```
[Sprint1 Task1] Add cron job to trigger event reminders
```

---

### T1.5: Create Reminder Tests

**File:** `test/event-reminders.test.ts` (NEW)

```typescript
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createDb } from "./fixtures/db";

describe("Event Reminders", () => {
  test("user can create a 24h reminder", async (t) => {
    const db = createDb();
    const user = await db.user.create({
      data: { email: "test@example.com", name: "Test User" },
    });

    const event = await db.event.create({
      data: {
        title: "Test Event",
        slug: "test-event",
        startAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h from now
        timezone: "UTC",
      },
    });

    const reminder = await db.eventReminder.create({
      data: {
        userId: user.id,
        eventId: event.id,
        reminderType: "24H",
        triggerAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    assert.ok(reminder.id);
    assert.equal(reminder.reminderType, "24H");
  });

  test("user can delete a reminder", async (t) => {
    const db = createDb();
    // ... create user, event, reminder ...
    
    await db.eventReminder.delete({ where: { id: reminder.id } });
    
    const exists = await db.eventReminder.findUnique({
      where: { id: reminder.id },
    });
    
    assert.equal(exists, null);
  });

  test("reminder triggers at correct time", async (t) => {
    const db = createDb();
    // ... create reminder ...
    
    const now = new Date(reminder.triggerAt.getTime() + 1000);
    const result = await enqueueEventRemindersWithDb(db, now);
    
    assert.equal(result.queued, 1);
  });

  test("reminder not sent if user disabled reminders", async (t) => {
    const db = createDb();
    // ... create user, event, reminder ...
    
    await db.userNotificationPrefs.update({
      where: { userId: user.id },
      data: { eventRemindersEnabled: false },
    });

    const now = new Date(reminder.triggerAt.getTime() + 1000);
    const result = await enqueueEventRemindersWithDb(db, now);
    
    assert.equal(result.queued, 0);
    assert.equal(result.skipped, 1);
  });
});
```

**Commit:**
```
[Sprint1 Task1] Add unit tests for event reminders
```

---

## Phase 3: Task 3 — Notification Preferences

### T3.1: Update Preferences Panel UI

**File:** `components/personalization/preferences-panel.tsx`

**Change:** Add new sections for reminder, creator, and nearby preferences.

```typescript
// Inside the form JSX, after existing preferences:

<div className="space-y-4">
  <h3 className="font-semibold">Notification Types</h3>
  
  <Label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={prefs.eventRemindersEnabled}
      onChange={(e) => handleChange("eventRemindersEnabled", e.target.checked)}
    />
    Event reminders (24h and 2h before)
  </Label>
  
  <Label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={prefs.emailOnFollowedCreatorUpdates}
      onChange={(e) => handleChange("emailOnFollowedCreatorUpdates", e.target.checked)}
    />
    Followed creator updates
  </Label>
  
  <Label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={prefs.emailOnNearbyRecommendations}
      onChange={(e) => handleChange("emailOnNearbyRecommendations", e.target.checked)}
    />
    Nearby event recommendations
  </Label>
</div>

<div className="space-y-4">
  <h3 className="font-semibold">Quiet Hours</h3>
  <p className="text-sm text-muted-foreground">
    No notifications between these times
  </p>
  
  <div className="flex gap-4">
    <div>
      <label className="text-sm">Start time</label>
      <input
        type="time"
        value={prefs.quietHoursStart ? format(prefs.quietHoursStart, "HH:mm") : ""}
        onChange={(e) => handleChange("quietHoursStart", e.target.value)}
      />
    </div>
    <div>
      <label className="text-sm">End time</label>
      <input
        type="time"
        value={prefs.quietHoursEnd ? format(prefs.quietHoursEnd, "HH:mm") : ""}
        onChange={(e) => handleChange("quietHoursEnd", e.target.value)}
      />
    </div>
  </div>
</div>
```

**Commit:**
```
[Sprint1 Task3] Add reminder and creator notification toggles to preferences UI
```

---

### T3.2: Create Quiet Hours Utility

**File:** `lib/notifications/is-in-quiet-hours.ts` (NEW)

```typescript
import type { UserNotificationPrefs } from "@prisma/client";

export function isInQuietHours(
  now: Date,
  prefs: UserNotificationPrefs | null | undefined
): boolean {
  if (!prefs || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }

  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const startTime = prefs.quietHoursStart.toString().slice(0, 5); // HH:mm
  const endTime = prefs.quietHoursEnd.toString().slice(0, 5);

  // Handle overnight ranges (e.g., 22:00 → 08:00)
  if (startTime < endTime) {
    // Normal range (e.g., 08:00 → 22:00)
    return nowTime >= startTime && nowTime < endTime;
  } else {
    // Overnight range (e.g., 22:00 → 08:00)
    return nowTime >= startTime || nowTime < endTime;
  }
}
```

**Commit:**
```
[Sprint1 Task3] Add quiet hours check utility
```

---

## Phase 4: Task 2 — Dedicated Saved Experience

### T2.1: Create /saved Route Structure

**Create directory structure:**
```
app/saved/
  page.tsx
  loading.tsx
  saved-client.tsx
```

**File:** `app/saved/page.tsx` (NEW)

```typescript
import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { db } from "@/lib/db";
import { PageShell } from "@/components/ui/page-shell";
import { SavedEventsSection } from "@/components/saved/saved-events-section";
import { SavedGalleriesPlaceholder } from "@/components/saved/saved-galleries-placeholder";

export default async function SavedPage() {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/saved");

  // Fetch saved events, sorted upcoming-first
  const savedFavorites = await db.favorite.findMany({
    where: { userId: user.id, targetType: "EVENT" },
    include: {
      event: {
        include: {
          venue: { select: { id: true, name: true } },
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
            include: { asset: { select: { url: true } } },
          },
        },
      },
    },
    orderBy: { event: { startAt: "asc" } },
  });

  const events = savedFavorites
    .filter((fav) => fav.event && !fav.event.deletedAt)
    .map((fav) => fav.event!);

  return (
    <PageShell className="page-stack">
      <h1 className="text-3xl font-semibold">Saved</h1>
      
      <div className="space-y-8">
        <SavedEventsSection events={events} userId={user.id} />
        <SavedGalleriesPlaceholder />
      </div>
    </PageShell>
  );
}

export async function generateMetadata() {
  return {
    title: "Saved Events | Artio",
    description: "Your saved events and galleries in one place.",
  };
}
```

**File:** `app/saved/loading.tsx` (NEW)

```typescript
import { PageShell } from "@/components/ui/page-shell";

export default function SavedLoading() {
  return (
    <PageShell className="page-stack">
      <h1 className="text-3xl font-semibold">Saved</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    </PageShell>
  );
}
```

**Commit:**
```
[Sprint1 Task2] Create /saved route with server component
```

---

### T2.2: Create SavedEventsSection Component

**File:** `components/saved/saved-events-section.tsx` (NEW)

```typescript
"use client";

import type { Event, Venue } from "@prisma/client";
import { EventRailCard } from "@/components/events/event-rail-card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";

interface SavedEventsSectionProps {
  events: (Event & {
    venue: Venue | null;
    images: any[];
  })[];
  userId: string;
}

export function SavedEventsSection({
  events,
  userId,
}: SavedEventsSectionProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-12 text-center">
        <h3 className="font-medium">No saved events yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Discover events and save them to view later.
        </p>
        <Button asChild>
          <a href="/events">Browse events</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Saved Events"
        subtitle={`${events.length} event${events.length === 1 ? "" : "s"}`}
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventRailCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
```

**Commit:**
```
[Sprint1 Task2] Add SavedEventsSection component
```

---

### T2.3: Create SavedGalleriesPlaceholder

**File:** `components/saved/saved-galleries-placeholder.tsx` (NEW)

```typescript
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";

export function SavedGalleriesPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SectionHeader title="Galleries" />
        <Badge variant="secondary">Coming in Sprint 2</Badge>
      </div>
      
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-12 text-center">
        <h3 className="font-medium">Gallery collections coming soon</h3>
        <p className="text-sm text-muted-foreground">
          Save and organize your favorite gallery exhibitions across venues.
        </p>
      </div>
    </div>
  );
}
```

**Commit:**
```
[Sprint1 Task2] Add SavedGalleriesPlaceholder component
```

---

### T2.4: Add /saved Link to Navigation

**File:** `components/navigation/main-nav.tsx`

**Change:** Add navigation item for /saved

```typescript
// In navigation items array:
{
  href: "/saved",
  label: "Saved",
  icon: "Bookmark",
}
```

**Also update:**
- [ROUTES.md](ROUTES.md): Add `/saved` route documentation
- Update any navigation menus in header/footer

**Commit:**
```
[Sprint1 Task2] Add /saved navigation link
```

---

## Phase 5: Validation & Testing

### V1: Database Integrity

```bash
# Check schema
pnpm prisma validate

# Generate client
pnpm prisma generate

# Run all migrations
pnpm prisma migrate status
```

---

### V2: Typecheck

```bash
pnpm typecheck
```

Expected: Zero errors (pre-existing geocode error is acceptable)

---

### V3: Unit Tests

```bash
pnpm test -- event-reminders.test.ts
pnpm test -- notification-preferences.test.ts
pnpm test
```

---

### V4: Manual E2E Testing

#### Scenario 1: Set Reminder
1. Navigate to [http://localhost:3000/events/[slug]](http://localhost:3000/events/[slug])
2. Find "Set Reminder" button in detail actions
3. Click and select "24 hours before"
4. Verify toast: "Reminder set ✓"
5. Verify state persists (refresh page = reminder still showing)

#### Scenario 2: Remove Reminder
1. On event with reminder set
2. Click "Change" dropdown
3. Select "Remove reminder"
4. Verify state cleared

#### Scenario 3: View Saved Events
1. Navigate to [http://localhost:3000/events/[slug]](http://localhost:3000/events/[slug])
2. Click "Save" button
3. Navigate to [http://localhost:3000/saved](http://localhost:3000/saved)
4. Verify event appears in list, sorted upcoming-first
5. Click event to navigate to detail
6. Unsave from detail
7. Navigate back to /saved — event removed

#### Scenario 4: Notification Preferences
1. Navigate to [http://localhost:3000/preferences](http://localhost:3000/preferences)
2. Toggle "Event reminders" off
3. Verify saved (refresh = setting persists)
4. Create reminder for event
5. Trigger cron: curl http://localhost:3000/api/cron/reminders?token=CRON_SECRET
6. Verify notification NOT queued (check database)
7. Toggle reminders back on
8. Verify notification IS queued

#### Scenario 5: Quiet Hours
1. Set quiet hours: 22:00 - 08:00
2. Create reminder for event at 23:30 (within quiet hours)
3. Trigger sweep at 23:30
4. Verify notification NOT queued
5. Trigger sweep at 09:00 (outside quiet hours)
6. Verify notification IS queued

---

### V5: Analytics

Verify tracking events:
- `event_reminder_set` - logged when reminder created
- `event_reminder_removed` - logged when reminder deleted
- `event_viewed` - already tracked

---

## Phase 6: Code Review Checklist

Before requesting review:

- [ ] All commits have descriptive messages
- [ ] No creator features touched
- [ ] No recommendation code modified
- [ ] No unrelated refactoring
- [ ] Database migrations idempotent
- [ ] All tests green: `pnpm test`
- [ ] Typecheck passes: `pnpm typecheck`
- [ ] Manual E2E scenarios work
- [ ] UI responsive on mobile
- [ ] Error handling comprehensive
- [ ] Accessibility: buttons have labels, form inputs labeled
- [ ] Analytics instrumented
- [ ] Documentation updated (ROUTES.md, code comments)

---

## Phase 7: Epic Validation

### Acceptance Checkpoint: Event Reminders
- [ ] User can create 2h reminder on event detail
- [ ] User can create 24h reminder on event detail
- [ ] User can remove reminder
- [ ] Reminder state visible on event detail (✓ when set)
- [ ] Reminder notification sent at correct time
- [ ] E2E test: Set reminder → receive notification → click notification → deep link to event

### Acceptance Checkpoint: Saved Experience
- [ ] /saved route exists
- [ ] Shows saved events
- [ ] Placeholder for galleries
- [ ] Upcoming-first sort
- [ ] Empty state
- [ ] Edit reminders on /saved detail link
- [ ] Save/unsave state consistent across detail and /saved pages

### Acceptance Checkpoint: Notification Preferences
- [ ] User can toggle event reminders
- [ ] User can toggle followed creator emails
- [ ] User can toggle nearby recommendations
- [ ] User can set quiet hours
- [ ] Settings persist (database)
- [ ] Behavior respects settings (no emails during quiet hours, if disabled)

### Acceptance Checkpoint: Feed & Follow (TBD - Phase 2)
- [ ] Explore feed shows correct content types
- [ ] Ranking reason visible
- [ ] Following impacts feed
- [ ] Followed creator notifications work

---

## Final Commit & Review

```bash
# Ensure all changes are committed
git status

# Create pull request
git push origin sprint-1/core-loop
# Open PR on GitHub

# In PR description:
- Reference accepted acceptance checkpoints
- List all commits in feature
- Mention E2E scenarios tested
- Confirm no creator/recommendation/unrelated changes
```

---

## Success Criteria

✅ **Complete when:**
- All 5 acceptance checkpoints from ACCEPTANCE_CHECKPOINTS.md are checked
- All unit tests pass
- Manual E2E scenarios validated
- Code review approved
- No new TypeScript errors
- No creator features modified
