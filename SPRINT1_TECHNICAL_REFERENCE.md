# Sprint 1 Technical Reference — Implementation Guide

**Date:** April 20, 2026  
**Purpose:** Exact locations of reminder UI, trigger logic, testing procedures

---

## Current State Summary

### ❌ What Does NOT Yet Exist

#### 1. Event Reminder Database Model
- **Status:** MISSING
- **Would be in:** `prisma/schema.prisma`
- **Purpose:** Store user's reminder preferences for each event
- **Fields:** userId, eventId, reminderType (2H|24H), triggerAt, sentAt, createdAt, updatedAt

#### 2. Reminder UI Components  
- **Status:** MISSING
- **Location would be:** `components/events/event-reminder-button.tsx`
- **Usage:** In [EventDetailActions](components/events/event-detail-actions.tsx#L12)
- **Current show:** only Calendar, Share, Attend buttons — **NO REMINDER BUTTON**

#### 3. Reminder API Endpoints
- **Status:** MISSING
- **Would be at:**
  - `POST /api/events/[id]/reminders` - Create reminder
  - `DELETE /api/events/[id]/reminders/[reminderId]` - Delete reminder
  - `DELETE /api/events/[id]/reminders?type=24H` - Delete by type

#### 4. Reminder Cron Job
- **Status:** MISSING
- **Would be in:** `lib/cron-trigger-event-reminders.ts`
- **Function signature:** `enqueueEventRemindersWithDb(db, now)`
- **Purpose:** Scan EventReminder table, queue notifications at trigger time
- **API route would be:** `GET /api/cron/reminders` with CRON_SECRET token

#### 5. Extended UserNotificationPrefs
- **Current fields:** emailOnSubmissionResult, emailOnTeamInvite, weeklyDigest
- **Missing fields:**
  - `eventRemindersEnabled` (boolean)
  - `emailOnFollowedCreatorUpdates` (boolean)
  - `emailOnNearbyRecommendations` (boolean)
  - `quietHoursStart` (time)
  - `quietHoursEnd` (time)
- **Current UI:** [app/preferences/page.tsx](app/preferences/page.tsx#L1) has basic toggles, missing reminder options

#### 6. /saved Route
- **Status:** MISSING
- **Would be at:** `/app/saved/page.tsx`
- **Current similar route:** `/saved-searches` (different concept)
- **Purpose:** Dedicated hub showing saved events + galleries (placeholder)
- **Would include:** SavedEventsSection, SavedGalleriesPlaceholder components

---

## What DOES Exist & Can Be Reused

### ✅ Event Reminder Infrastructure (Partially)

**File:** [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md#L455)
```
EVENT_REMINDER_24H notification type enum
Template: event-reminder-24h.tsx
Email template defined and ready to use
```

**File:** [prisma/schema.prisma](prisma/schema.prisma#L127)
```typescript
enum NotificationType {
  // ... other types ...
  EVENT_REMINDER_24H
}
```

**File:** [test/registration-notifications.test.ts](test/registration-notifications.test.ts#L147)
- Test: `"24h reminder sweep deduplicates"`
- Uses: `enqueueReminderSweepWithDb()` 
- Shows pattern for trigger logic
- **NOTE:** Test uses `Outbox` model, not `EventReminder` (which doesn't exist)

### ✅ Event Detail Page Structure
**File:** [app/events/[slug]/page.tsx](app/events/[slug]/page.tsx#L40)
- Query event data
- Include venue, series, artists, images, ticketTiers
- Load user auth state
- Render detail actions

**File:** [components/events/event-detail-actions.tsx](components/events/event-detail-actions.tsx#L12)
```typescript
export function EventDetailActions({
  eventId,
  eventSlug,
  nextUrl,
  isAuthenticated,
  initialSaved,
  // ... other props ...
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SaveEventButton ... />
      <AttendEventButton ... />
      <DropdownMenu>
        {/* Calendar options */}
      </DropdownMenu>
      <ShareButton ... />
      {/* NO REMINDER BUTTON */}
    </div>
  );
}
```

### ✅ Save/Favorite Model Pattern
**File:** [prisma/schema.prisma](prisma/schema.prisma#L2480)
```typescript
model Favorite {
  id          String @id @default(cuid())
  userId      String @db.Uuid
  targetType  String // "EVENT" | "ARTWORK" | "VENUE" ...
  targetId    String
  createdAt   DateTime @default(now())
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, targetType, targetId])
  @@index([userId, targetType])
}
```

**Query pattern:** [app/events/[slug]/page.tsx](app/events/[slug]/page.tsx#L70)
```typescript
const savedEvent = user 
  ? await db.favorite.findUnique({
      where: { userId_targetType_targetId: { 
        userId: user.id, 
        targetType: "EVENT", 
        targetId: event.id 
      }},
      select: { id: true }
    })
  : null;
```

### ✅ Event Models & Relations
**File:** [prisma/schema.prisma](prisma/schema.prisma#L971)
```typescript
model Event {
  id          String @id @default(cuid())
  title       String
  startAt     DateTime
  endAt       DateTime?
  timezone    String?
  slug        String @unique
  isPublished Boolean @default(false)
  venueId     String? @db.Uuid
  venue       Venue?  @relation(fields: [venueId], references: [id])
  // ... 20 more fields ...
}
```

### ✅ User Model & Relations
**File:** [prisma/schema.prisma](prisma/schema.prisma#L424)
```typescript
model User {
  id                   String @id @default(uuid()) @db.Uuid
  email                String @unique
  name                 String?
  // ... many fields ...
  notificationPrefs    UserNotificationPrefs?
  favorites            Favorite[]
}
```
- Already has notifications relation + favorites
- Would add: `reminders EventReminder[]`

### ✅ Navigation Structure
**File:** [components/navigation/](components/navigation/)
- Main nav exists
- Needs: Link to `/saved` added
- Current links: See [ROUTES.md](ROUTES.md)

---

## Implementation Order (with File Locations)

### Step 1: Database Foundation
**Commit message:** `[Sprint1 Task1] Add EventReminder model and extend UserNotificationPrefs`

```
File: prisma/schema.prisma

1. Add EventReminder model (after Event model, line ~1040):
   - Define all fields
   - Add unique constraint
   - Add indexes for queries

2. Update User model (line ~424):
   - Add: reminders EventReminder[]

3. Update Event model (line ~971):
   - Add: reminders EventReminder[]

4. Update UserNotificationPrefs model (line ~496):
   - Add: eventRemindersEnabled Boolean
   - Add: emailOnFollowedCreatorUpdates Boolean
   - Add: emailOnNearbyRecommendations Boolean
   - Add: quietHoursStart DateTime?
   - Add: quietHoursEnd DateTime?

Then run: pnpm prisma migrate dev --name add_reminders_and_prefs
```

### Step 2: Reminder UI Component
**Commit message:** `[Sprint1 Task1] Create EventReminderButton component`

```
File: components/events/event-reminder-button.tsx (NEW)

Functions:
- EventReminderButton({ eventId, eventSlug, startAt, isAuthenticated, ... })
- setReminder(type: "2H" | "24H")
- removeReminder()

Calls:
- POST /api/events/[id]/reminders
- DELETE /api/events/[id]/reminders/[id]

Shows:
- "Set reminder" dropdown when none exist
- "Reminder set ✓" button when reminder exists
- Hidden for past events
```

### Step 3: Wire Button to Event Detail
**Commit message:** `[Sprint1 Task1] Add reminder button to event detail actions`

```
File: components/events/event-detail-actions.tsx

1. Import EventReminderButton
2. Add <EventReminderButton ... /> to JSX
3. Pass eventId, eventSlug, startAt from parent
4. Handle onReminderSet / onReminderRemoved callbacks
```

### Step 4: Create API Endpoints
**Commit message:** `[Sprint1 Task1] Add reminder API endpoints`

```
Files created:
- app/api/events/[id]/reminders/route.ts
  POST: Create/upsert reminder
  DELETE: Delete by type
  
- app/api/events/[id]/reminders/[reminderId]/route.ts
  DELETE: Delete specific reminder

Functions:
- POST: Validate event exists & is future
        Calculate triggerAt based on reminderType
        Upsert EventReminder
        
- DELETE: Verify user owns reminder
          Delete from database
```

### Step 5: Create Cron Job
**Commit message:** `[Sprint1 Task1] Add reminder trigger cron job`

```
Files created:
- lib/cron-trigger-event-reminders.ts
  Function: enqueueEventRemindersWithDb(db, now)
  
- app/api/cron/reminders/route.ts
  GET handler with CRON_SECRET validation

Logic:
1. Query EventReminder where triggerAt <= now AND sentAt IS NULL
2. For each reminder:
   - Check user prefs: eventRemindersEnabled
   - Check if in quiet hours
   - If should send: queue in outbox with type EVENT_REMINDER_24H
   - Set sentAt = now
3. Return { queued, skipped }
```

### Step 6: Extend Preferences Panel
**Commit message:** `[Sprint1 Task3] Add notification preferences UI`

```
File: components/personalization/preferences-panel.tsx

Add sections:
1. Event reminders toggle
2. Followed creator updates toggle
3. Nearby recommendations toggle
4. Quiet hours time picker

New components:
- components/personalization/quiet-hours-picker.tsx

New utilities:
- lib/notifications/is-in-quiet-hours.ts
- lib/notifications/should-send-notification.ts
```

### Step 7: Create /saved Route
**Commit message:** `[Sprint1 Task2] Create /saved route with saved events`

```
Files created:
- app/saved/page.tsx (server component)
- app/saved/loading.tsx
- components/saved/saved-events-section.tsx
- components/saved/saved-galleries-placeholder.tsx

Logic:
1. Query Favorite for user where targetType = "EVENT"
2. Join with Event model
3. Sort by event.startAt ASC (upcoming first)
4. Render in grid
5. Show empty state if none
6. Show "Coming soon" for galleries
```

### Step 8: Add Navigation
**Commit message:** `[Sprint1 Task2] Add /saved navigation link`

```
Files to update:
- components/navigation/main-nav.tsx: Add /saved link
- ROUTES.md: Document /saved route
- Any footer/header nav components
```

---

## Testing Scenarios & Commands

### Unit Test Files to Create

#### `test/event-reminders.test.ts`
```typescript
Test: "user can create a 24h reminder"
Test: "user can create a 2h reminder"
Test: "user can delete a reminder"
Test: "reminder triggers at correct time"
Test: "reminder skipped if user disabled them"
Test: "reminder skipped if in quiet hours"
Test: "multiple reminders across different users"
```

Run:
```bash
pnpm test -- event-reminders.test.ts
```

#### `test/notification-preferences.test.ts`
```typescript
Test: "user can update notification prefs"
Test: "quiet hours logic is correct"
Test: "reminders respect enablement flag"
Test: "quiet hours prevent notification"
```

Run:
```bash
pnpm test -- notification-preferences.test.ts
```

#### `test/saved-page.test.ts`
```typescript
Test: "shows saved events"
Test: "sorts upcoming-first"
Test: "shows empty state"
Test: "can unsave from page"
Test: "shows gallery placeholder"
```

Run:
```bash
pnpm test -- saved-page.test.ts
```

### End-to-End Testing (Manual)

#### Test 1: Set & Remove Reminder
```
1. Navigate to: http://localhost:3000/events/[any-future-event-slug]
2. Find "Set reminder" button in detail actions
   EXPECT: Located in <EventDetailActions /> near Calendar/Share
3. Click and select "24 hours before"
   EXPECT: Toast shows "Reminder set ✓"
   EXPECT: Button changes to show "Reminder set" with ✓ icon
4. Click "Change" dropdown
5. Select "Remove reminder"
   EXPECT: Badge disappears
   EXPECT: Button returns to "Set reminder"
```

#### Test 2: View Saved Events
```
1. Navigate to: http://localhost:3000/events/[slug]
2. Click "Save" button (top right)
   EXPECT: State changes to "Saved ✓"
3. Navigate to: http://localhost:3000/saved
   EXPECT: Page shows "Saved" title
   EXPECT: Events list shows saved event
   EXPECT: "Coming in Sprint 2" placeholder for galleries
4. Events sorted by startAt ASC (upcoming first)
5. Click event to view detail
6. Click "Unsave"
   EXPECT: Event removed from saved page
```

#### Test 3: Notification Preferences
```
1. Navigate to: http://localhost:3000/preferences
2. Find "Event reminders" toggle
   EXPECT: Located in preferences panel
3. Uncheck "Event reminders"
   EXPECT: Setting saves to database
   EXPECT: Refresh page — still unchecked
4. Check "Event reminders" again
   EXPECT: Setting persists
```

#### Test 4: Quiet Hours
```
1. Navigate to: http://localhost:3000/preferences
2. Set "Quiet hours" to 22:00 - 08:00
   EXPECT: Times save to UserNotificationPrefs
3. Set reminder for event tomorrow at 23:00
4. Trigger cron manually:
   curl "http://localhost:3000/api/cron/reminders" \
     -H "Authorization: Bearer $CRON_SECRET"
   EXPECT: Response shows { queued: 0, skipped: 1 }
   EXPECT: No outbox entry created
5. Set system time to 09:00
6. Trigger cron again
   EXPECT: Response shows { queued: 1, skipped: 0 }
   EXPECT: Outbox entry created with EVENT_REMINDER_24H
```

---

## Database Query Reference

### Query: Get User's Reminders for an Event
```typescript
const reminders = await db.eventReminder.findMany({
  where: {
    userId: user.id,
    eventId: event.id,
  },
});
```

### Query: Find Reminders to Trigger Now
```typescript
const reminders = await db.eventReminder.findMany({
  where: {
    triggerAt: { lte: now },
    sentAt: null,
  },
  include: {
    user: { select: { email: true } },
    event: { select: { title: true } },
  },
});
```

### Query: Check If User Has Reminders Enabled
```typescript
const prefs = await db.userNotificationPrefs.findUnique({
  where: { userId: user.id },
  select: { eventRemindersEnabled: true },
});
```

### Query: Get All Saved Events for User
```typescript
const savedFavorites = await db.favorite.findMany({
  where: { 
    userId: user.id, 
    targetType: "EVENT" 
  },
  include: {
    event: { include: { venue: true } },
  },
  orderBy: { event: { startAt: "asc" } },
});
```

---

## Component Tree after Implementation

```
app/events/[slug]/page.tsx
└─ EventDetailActions
   ├─ SaveEventButton
   ├─ EventReminderButton       [NEW]
   │  └─ POST /api/events/[id]/reminders
   │  └─ DELETE /api/events/[id]/reminders/[id]
   ├─ AttendEventButton
   └─ ShareButton

app/saved/page.tsx            [NEW]
└─ SavedEventsSection         [NEW]
   └─ EventRailCard (for each)

app/preferences/page.tsx
└─ PreferencesPanel
   └─ QuietHoursPicker        [NEW]

lib/
├─ cron-trigger-event-reminders.ts   [NEW]
│  └─ enqueueEventRemindersWithDb()
├─ notifications/
│  ├─ is-in-quiet-hours.ts          [NEW]
│  └─ should-send-notification.ts   [NEW]
```

---

## Error Handling & Edge Cases

### In EventReminderButton

```typescript
// Past events: Don't show reminder button
if (new Date(startAt) <= new Date()) {
  return null;
}

// Not authenticated: Log event
if (!isAuthenticated) {
  track("event_reminder_clicked_unauthenticated", { eventSlug });
  // Redirect to login
}

// Network error: Show error toast
if (!res.ok) {
  setError(res.json().message || "Failed to set reminder");
}
```

### In API Endpoints

```typescript
// Event not found or past
if (!event || new Date(event.startAt) <= new Date()) {
  return NextResponse.json(
    { message: "Event not found or past" }, 
    { status: 404 }
  );
}

// Invalid reminder type
if (!["2H", "24H"].includes(reminderType)) {
  return NextResponse.json(
    { message: "Invalid reminder type" }, 
    { status: 400 }
  );
}

// User not authenticated
if (!user) {
  return NextResponse.json(
    { message: "Unauthorized" }, 
    { status: 401 }
  );
}

// User trying to delete another user's reminder
const reminder = await db.eventReminder.delete({
  where: { id, userId: user.id }, // Will throw if not found
});
```

---

## Analytics Events to Track

```typescript
// In EventReminderButton
track("event_reminder_set", { eventSlug, type: "24H" | "2H" });
track("event_reminder_removed", { eventSlug });
track("event_reminder_clicked_unauthenticated", { eventSlug });
track("event_reminder_error", { eventSlug, error });

// In cron job (optional)
track("cron_reminders_executed", { queued: N, skipped: M });

// In SavedEventsSection
track("saved_events_viewed", { count: N });
track("saved_events_unsaved", { eventSlug });
```

---

## Success Validation Checklist

After implementing all phases:

- [ ] EventReminder table in database
- [ ] UserNotificationPrefs has all 5 new columns
- [ ] Event detail page has "Set reminder" button
- [ ] /api/events/[id]/reminders endpoints work
- [ ] /api/cron/reminders triggers reminders
- [ ] /saved route shows saved events
- [ ] /saved route shows gallery placeholder
- [ ] Navigation has /saved link
- [ ] Preferences page shows reminder toggle
- [ ] Preferences page shows quiet hours picker
- [ ] All unit tests pass
- [ ] Manual E2E scenarios pass
- [ ] No TypeScript errors
- [ ] No creator features modified
- [ ] All Analytics events tracked
