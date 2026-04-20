# Sprint 1 Repository Audit — Core User Loop Completion

**Audit Date:** April 20, 2026  
**Sprint:** 1 — Core User Loop (Discover → Save → Remind → Return)  
**Status:** INCOMPLETE - 1/5 tasks fully accepted

---

## Executive Summary

Sprint 1 requires completing the minimum sticky user loop. Current codebase is **MISSING critical functionality** for 2 of 5 tasks. Task 4 and 5 (feed alignment and follow-to-return) require detailed discovery. 

**Implementation Status:**
- ✅ Task 1 (Event reminders): **0% — NOT STARTED**
- ✅ Task 2 (Saved experience): **0% — NOT STARTED**
- ⚠️ Task 3 (Notification prefs): **20% — PARTIAL (prefs model exists, missing reminder/creator/nearby fields)**
- ❓ Task 4 (Explore feed): **UNTESTED — depends on existing feed infra**
- ❓ Task 5 (Follow-to-return): **UNTESTED — follow model exists, impact unclear**

---

## Task 1: Event Reminder System

**Priority:** CRITICAL  
**Acceptance:** User can set/receive 2h and 24h reminders, delete reminders, see reminder state on event detail

### Current Implementation Status: **0% — MISSING**

#### What Exists
- ✅ `EVENT_REMINDER_24H` notification type enum (prisma/schema.prisma:127)
- ✅ Email template `event-reminder-24h.tsx` referenced in EMAIL_SYSTEM.md
- ✅ Test coverage: `test/registration-notifications.test.ts` tests 24h reminder sweep deduplication
- ✅ Outbox worker has `enqueueReminderSweepWithDb` function

#### What's Missing
- ❌ `EventReminder` database model (no userId → eventId → triggerTime mapping)
- ❌ UI components: No reminder button/dropdown on event detail page
- ❌ API endpoints: No `/api/events/[id]/reminders` POST/DELETE routes
- ❌ Client action: No server action to create/delete reminders
- ❌ Cron job: No scheduled job to trigger reminder notifications at 24h/2h before
- ❌ Deep linking: No logic to handle reminder notification clicks with event deep link
- ❌ State management: No way to show "Reminder set ✓" on event detail UI

### Code Locations Checked
- [app/events/[slug]/page.tsx](app/events/[slug]/page.tsx#L1-L200): Event detail page — no reminder UI
- [components/events/event-detail-actions.tsx](components/events/event-detail-actions.tsx): Detail actions menu — only has calendar, share, attend — **NO REMIND BUTTON**
- [lib/cron-*.ts](lib): Multiple cron jobs exist, none for reminders
- [prisma/schema.prisma](prisma/schema.prisma): No EventReminder model

### Required Build Steps

#### 1. Create EventReminder Database Model
```sql
-- Add to prisma/schema.prisma after Event model
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
  @@index([sentAt]) // For querying unsent reminders
}
```

#### 2. Update User Model
Add relation: `reminders EventReminder[]`

#### 3. Update Event Model
Add relation: `reminders EventReminder[]`

#### 4. Create Migration
```bash
pnpm prisma migrate dev --name add_event_reminders
```

#### 5. Add Reminder Button to Event Detail
File: [components/events/event-detail-actions.tsx](components/events/event-detail-actions.tsx)

Create new component `EventReminderButton`:
- Show "Set reminder" when no reminder set
- Show dropdown with "2h before" and "24h before" options
- Show "Reminder set ✓" when reminder active
- Handle delete action
- Disable for past events

#### 6. Create API Endpoints
```
POST /api/events/[id]/reminders
  - Create EventReminder with reminderType param
  - Return { id, reminderType, createAt }
  - Return 401 if not authenticated

DELETE /api/events/[id]/reminders/[reminderId]
  - Delete EventReminder
  - Return 204
  - Return 401 if not authenticated
```

#### 7. Create Cron Job
File: `lib/cron-trigger-event-reminders.ts`

Function signature:
```typescript
export async function enqueueEventRemindersWithDb(
  db: PrismaClient,
  now: Date
): Promise<{ queued: number; skipped: number }>
```

Logic:
- Query EventReminders where triggerAt <= now AND sentAt IS NULL
- For each reminder, queue an outbox entry with type EVENT_REMINDER_24H
- Mark sentAt = now
- Return counts

#### 8. Wire Cron to API
File: `app/api/cron/reminders/route.ts`

```typescript
export async function GET(req: Request) {
  // Verify cron secret
  // Call enqueueEventRemindersWithDb(db, new Date())
  // Return { ok: true, queued: N }
}
```

#### 9. Add Reminder When Event is Saved
File: [components/events/save-event-button.tsx](components/events/save-event-button.tsx)

After saving event, show toast with "Set a reminder?" suggestion

#### 10. Add Acceptance Criteria Tests
File: `test/event-reminders.test.ts`

```typescript
test("user can create a 24h reminder", async (t) => {
  // Create event and user
  // POST /api/events/[id]/reminders with reminderType: "24H"
  // Assert EventReminder created with correct triggerAt
});

test("user can delete a reminder", async (t) => {
  // Create reminder
  // DELETE /api/events/[id]/reminders/[id]
  // Assert reminder deleted
});

test("reminder notification triggered at correct time", async (t) => {
  // Create reminder for event 24h from now
  // Call enqueueEventRemindersWithDb(db, 24h + 1min)
  // Assert outbox entry created with EVENT_REMINDER_24H
});
```

---

## Task 2: Dedicated Saved Experience

**Priority:** HIGH  
**Acceptance:** User can review saved content in one place, save/unsave state consistent

### Current Implementation Status: **0% — MISSING**

#### What Exists
- ✅ `/saved-searches` route exists ([app/saved-searches/](app/saved-searches/))
- ✅ `Favorite` model exists with `targetType: EVENT | ARTWORK | VENUE | ARTIST | COLLECTION`
- ✅ `SaveEventButton` component exists ([components/events/save-event-button.tsx](components/events/save-event-button.tsx))
- ✅ Event list pages show save state

#### What's Missing
- ❌ `/saved` route does NOT exist (different from `/saved-searches`)
- ❌ No dedicated page showing "saved events" + "saved galleries"
- ❌ No "Saved" nav link in main navigation
- ❌ Placeholder for saved galleries (GallerySource exists but not as saveable first-class objects)

### Code Locations Checked
- [app/](app/): `/saved` route missing — only `/saved-searches` exists
- [components/navigation/](components/navigation/): Need to check if "Saved" link exists
- [lib/db.ts](lib/db.ts): Query functions for favorites need to support sorting

### Required Build Steps

#### 1. Create `/saved` Route Structure
```
app/
  saved/
    page.tsx          # Main saved page
    loading.tsx       # Loading state
    saved-client.tsx  # Client component for interactivity
```

#### 2. Implement Saved Page Server Component
File: `app/saved/page.tsx`

```typescript
export default async function SavedPage() {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/saved");
  
  // Query saved events, sorted by startAt ASC (upcoming first)
  const savedEvents = await db.favorite.findMany({
    where: { userId: user.id, targetType: "EVENT" },
    include: { event: { include: { venue: true, images: {...} } } },
    orderBy: { event: { startAt: "asc" } },
  });
  
  // For future: galleries would go here
  
  return (
    <PageShell>
      <h1>Saved</h1>
      <SavedEventsSection events={savedEvents} />
      <SavedGalleriesPlaceholder /> {/* "Galleries coming soon" */}
    </PageShell>
  );
}
```

#### 3. Create SavedEventsSection Component
File: `components/saved/saved-events-section.tsx`

- Display events in grid/list
- Show upcoming date/time + venue
- Save button toggle
- Empty state: "No saved events yet"
- No pagination needed initially (show all)

#### 4. Create SavedGalleriesPlaceholder Component
File: `components/saved/saved-galleries-placeholder.tsx`

Display:
- "Galleries" section header
- "Coming in Sprint 2" placeholder
- Maybe render a few gallery samples from GallerySource

#### 5. Add Navigation Link
File: [components/navigation/main-nav.tsx](components/navigation/main-nav.tsx)

Add link: `/saved` with label "Saved"

#### 6. Add to Routes.md Documentation
```markdown
- `/saved` - Dedicated saved content hub (events, galleries)
```

#### 7. Add Acceptance Criteria Tests
File: `test/saved-page.test.ts`

```typescript
test("user can view saved events", async (t) => {
  // Create user, event, save event
  // GET /saved
  // Assert event appears in list
});

test("saved events sorted upcoming-first", async (t) => {
  // Create 3 events: past, soon, far future
  // Save all
  // GET /saved
  // Assert order: soon, far future (past filtered out)
});

test("user can unsave from saved page", async (t) => {
  // Create saved event
  // GET /saved
  // Click unsave
  // Assert event removed
});
```

---

## Task 3: Notification Preferences

**Priority:** HIGH  
**Acceptance:** Settings persist and affect behavior for reminders, creator updates, nearby

### Current Implementation Status: **20% — PARTIAL**

#### What Exists
- ✅ `UserNotificationPrefs` model exists ([prisma/schema.prisma](prisma/schema.prisma#L496-L506))
- ✅ `/app/preferences/page.tsx` exists with preference panels
- ✅ `PreferencesPanel` component renders UI
- ✅ Basic prefs: emailOnSubmissionResult, emailOnTeamInvite, weeklyDigest

#### What's Missing
- ❌ **eventRemindersEnabled** field (needed for Task 1)
- ❌ **emailOnFollowedCreatorUpdates** field (needed for Task 5)
- ❌ **emailOnNearbyRecommendations** field (needed for Task 4)
- ❌ **quietHoursStart / quietHoursEnd** fields (quiet hours logic)
- ❌ UI to toggle reminder notifications
- ❌ UI to toggle creator update notifications
- ❌ UI for quiet hours time picker
- ❌ Backend logic to check preferences before sending notifications

### Code Locations Checked
- [prisma/schema.prisma](prisma/schema.prisma#L496): UserNotificationPrefs has only 3 fields
- [components/personalization/preferences-panel.tsx](components/personalization/preferences-panel.tsx): Needs to add reminder/creator/nearby toggles
- [lib/notifications](lib/notifications): Need to add preference check middleware

### Required Build Steps

#### 1. Create Migration to Extend UserNotificationPrefs
```sql
-- Migration: add_user_notification_preferences
ALTER TABLE "UserNotificationPrefs" ADD COLUMN "eventRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserNotificationPrefs" ADD COLUMN "emailOnFollowedCreatorUpdates" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserNotificationPrefs" ADD COLUMN "emailOnNearbyRecommendations" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserNotificationPrefs" ADD COLUMN "quietHoursStart" TIME; -- NULL = no quiet hours
ALTER TABLE "UserNotificationPrefs" ADD COLUMN "quietHoursEnd" TIME;
```

#### 2. Update Prisma Schema
File: [prisma/schema.prisma](prisma/schema.prisma#L496)

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
  quietHoursStart                 DateTime? @db.Time // e.g., "22:00:00"
  quietHoursEnd                   DateTime? @db.Time // e.g., "08:00:00"
  
  createdAt                       DateTime @default(now())
  updatedAt                       DateTime @updatedAt
}
```

#### 3. Create Migration
```bash
pnpm prisma migrate dev --name extend_user_notification_prefs
```

#### 4. Update PreferencesPanel Component
File: [components/personalization/preferences-panel.tsx](components/personalization/preferences-panel.tsx)

Add sections:
- **Event Reminders**: Toggle emailOnEventRemindersEnabled
- **Followed Creators**: Toggle emailOnFollowedCreatorUpdates
- **Nearby Recommendations**: Toggle emailOnNearbyRecommendations
- **Quiet Hours**: Time range picker (start/end)

#### 5. Create Quiet Hours Utility Function
File: `lib/notifications/is-in-quiet-hours.ts`

```typescript
export function isInQuietHours(
  now: Date,
  prefs: UserNotificationPrefs
): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
  // Compare current time against range
  // Handle overnight ranges (e.g., 22:00 → 08:00)
}
```

#### 6. Create Preference Check Middleware
File: `lib/notifications/should-send-notification.ts`

```typescript
export async function shouldSendNotification(
  db: PrismaClient,
  userId: string,
  notificationType: NotificationType,
  now: Date
): Promise<boolean> {
  const prefs = await db.userNotificationPrefs.findUnique({
    where: { userId },
  });
  
  // Check if in quiet hours
  if (isInQuietHours(now, prefs)) return false;
  
  // Check type-specific preference
  if (notificationType === "EVENT_REMINDER_24H") 
    return prefs.eventRemindersEnabled;
  if (notificationType === "CREATOR_UPDATE")
    return prefs.emailOnFollowedCreatorUpdates;
  if (notificationType === "NEARBY_RECOMMENDATION")
    return prefs.emailOnNearbyRecommendations;
  
  return true;
}
```

#### 7. Wire Preference Check to Cron Job
Update `lib/cron-trigger-event-reminders.ts`:

```typescript
export async function enqueueEventRemindersWithDb(
  db: PrismaClient,
  now: Date
): Promise<{ queued: number; skipped: number }> {
  // ... existing logic ...
  
  for (const reminder of reminders) {
    const shouldSend = await shouldSendNotification(
      db,
      reminder.userId,
      "EVENT_REMINDER_24H",
      now
    );
    
    if (!shouldSend) {
      // Skip but don't mark as sent
      skipped++;
      continue;
    }
    
    // Queue notification
    queued++;
  }
}
```

#### 8. Add Acceptance Criteria Tests
File: `test/notification-preferences.test.ts`

```typescript
test("user can toggle event reminders", async (t) => {
  // Get user prefs
  // PATCH /api/user/notification-prefs with eventRemindersEnabled: false
  // Assert saved
});

test("reminders not sent if disabled", async (t) => {
  // Create user with eventRemindersEnabled: false
  // Create reminder and trigger sweep
  // Assert outbox entry NOT created
});

test("reminders not sent during quiet hours", async (t) => {
  // Set quiet hours 22:00-08:00
  // Create reminder that triggers at 23:00
  // Call enqueueEventRemindersWithDb(db, 23:00)
  // Assert outbox entry NOT created
});
```

---

## Task 4: Explore Feed Alignment

**Priority:** MEDIUM  
**Status:** NOT FULLY CHECKED — requires deeper codebase exploration

### Points to Verify
- [ ] Current `/for-you` feed composition
- [ ] Supported content types in feed (events, artists, galleries?)
- [ ] Feed ranking logic and diversification
- [ ] Recommendation rails: "Tonight", "This week", "From people you follow", "Nearby"
- [ ] Ranking reason visibility

### Placeholder
See [docs/artio_sprint_execution_bundle_for_codex/SPRINT_1_USER_CORE_LOOP.md](docs/artio_sprint_execution_bundle_for_codex/SPRINT_1_USER_CORE_LOOP.md#task-4-explore-feed-alignment) for acceptance criteria.

---

## Task 5: Follow-to-Return Loop

**Priority:** MEDIUM  
**Status:** NOT FULLY CHECKED — follow model exists, notification path unclear

### Points to Verify
- [ ] Follow model ([prisma/schema.prisma](prisma/schema.prisma#L2505)): userId → artistId or venueId
- [ ] Is following already wired into feed ranking?
- [ ] Notification when followed creator publishes new event?
- [ ] Preference gate for creator update emails?

### Placeholder
See [docs/artio_sprint_execution_bundle_for_codex/SPRINT_1_USER_CORE_LOOP.md](docs/artio_sprint_execution_bundle_for_codex/SPRINT_1_USER_CORE_LOOP.md#task-5-follow-to-return-loop) for acceptance criteria.

---

## Dependencies and Prerequisites

### Database Migration Order
1. Add EventReminder model
2. Extend UserNotificationPrefs with reminder/creator/nearby/quietHours fields
3. Run `pnpm prisma generate` to regenerate client
4. Run tests: `pnpm test`

### API Endpoints Required
```
POST   /api/events/[id]/reminders
DELETE /api/events/[id]/reminders/[reminderId]
PATCH  /api/user/notification-prefs
GET    /api/user/notification-prefs
GET    /api/cron/reminders
```

### Components to Create
```
components/
  events/
    event-reminder-button.tsx    # New: reminder toggle + menu
  saved/
    saved-events-section.tsx      # New: upcoming events list
    saved-galleries-placeholder.tsx # New: "coming soon"
  personalization/
    quiet-hours-picker.tsx        # New: time range selector
```

### Files to Modify
```
app/
  events/[slug]/page.tsx         # Add reminder button UI
  saved/
    page.tsx                      # NEW
    loading.tsx                   # NEW
    saved-client.tsx              # NEW
  api/
    user/
      notification-prefs/
        route.ts                  # NEW
    cron/
      reminders/
        route.ts                  # NEW
components/
  events/
    event-detail-actions.tsx      # Add EventReminderButton
  navigation/
    main-nav.tsx                  # Add /saved link
  personalization/
    preferences-panel.tsx         # Add reminder/creator/nearby/quiet toggles
lib/
  cron-trigger-event-reminders.ts # NEW
  notifications/
    is-in-quiet-hours.ts         # NEW
    should-send-notification.ts   # NEW
prisma/
  schema.prisma                   # Update models
```

---

## Non-Blocking Issues Found

1. **Stats header location** (Sprint 1 Task 1.5 from previous audit): Mention in handoff notes
2. **Trailing whitespace** in previous audit docs: Can clean up in separate commit
3. **Geocode export error** (pre-existing): Not blocking Sprint 1, noted in previous session

---

## Validation Checklist

- [ ] Create EventReminder database model and migration
- [ ] Extend UserNotificationPrefs model and migration  
- [ ] Implement EventReminderButton component
- [ ] Create reminder API endpoints (POST/DELETE)
- [ ] Create cron job to trigger reminders
- [ ] Implement notification preference checks
- [ ] Create /saved page and components
- [ ] Add /saved navigation link
- [ ] Unit tests for reminders (create, delete, trigger)
- [ ] Unit tests for preferences (toggle, quiet hours)
- [ ] Unit tests for /saved page (filter, sort, state consistency)
- [ ] E2E test: Set reminder → Receive notification → Deep link back to event
- [ ] E2E test: Save event → Unsave from /saved page → State consistent
- [ ] Deep dive Tasks 4 & 5 (feed alignment, follow-to-return)
- [ ] Typecheck: `pnpm typecheck`
- [ ] All tests pass: `pnpm test`

---

## Next Steps

1. **IMMEDIATE:** Start with EventReminder model and migrations (unblocks both Task 1 and 3)
2. **FOLLOWING:** Implement reminder UI and API endpoints
3. **PARALLEL:** Extend UserNotificationPrefs and UI
4. **THEN:** Build /saved page
5. **FINALLY:** Deep dive and complete Tasks 4 & 5

**Target:** All 5 acceptance criteria checkpoints met before moving to Sprint 2 (Gallery product)
