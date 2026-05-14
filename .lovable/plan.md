# Admin Space — port from original

The DB already has the right scaffolding (`user_roles` with `app_role`, `platform_announcements`, `settings` key/value, `universities`, `lesson_views`). I'll build the admin UI on top of it and add the few server fns needed for privileged actions. Adapted from the screenshots — "Pending Grades" is dropped (no quizzes/voice subs in this project) and "Courses" becomes "Lessons" (matches our `posts` table).

## Routes

`/admin` layout, gated by `has_role(uid, 'admin')`. Non-admins → `/dashboard`.

Tabs:
- `/admin` — Overview
- `/admin/users` — Users
- `/admin/lessons` — Lessons
- `/admin/announcements` — Announcements
- `/admin/settings` — Platform settings

## 1. Overview

Stat cards (matching screenshot): Total Users, Lessons (total), Published, Drafts, Total Views (7d), Total Claps.

Sub-sections:
- **Users by Role** — counts for admin / lecturer / participant
- **Recent sign-ups** — last 5 profiles with role badge
- **Top lessons this week** — top 5 by `lesson_views` in last 7d
- Refresh button

## 2. Users

- Search by name / email / department
- List rows: avatar, full name (`title surname othernames`), email, department + joined-ago, role badge, role dropdown, delete button
- Role dropdown writes to `user_roles` (admin / lecturer / participant)
- Delete: server fn calls `supabaseAdmin.auth.admin.deleteUser` (cascades to profile/posts via existing FKs)
- Self-protection: cannot demote or delete your own account

## 3. Lessons

- Search by title / author
- Filters: All / Published / Draft / Anonymous
- Row: cover thumb, title, author display name, status badge, views count, created-ago, delete button
- Unpublish toggle (sets `published_at` to null / now())

## 4. Announcements

- Composer: title + body → "Send to Everyone"
  - Inserts into `platform_announcements`
  - Server fn fans out a `notifications` row for every user (uses `supabaseAdmin` to bypass the no-INSERT policy on `notifications`)
- Past announcements list with delete (admin RLS already allows it)

## 5. Settings

Backed by the existing `settings` key/value table:
- **Maintenance Mode** — toggle (`maintenance_on`) + custom banner message (`maintenance_message`). Banner shown site-wide for non-admins on `__root` / `_authenticated`.
- **Platform Contact Email** (`contact_email`) — shown in footer.
- **Default Anonymous Publishing** (`default_anonymous_global`) — toggle.
- **Featured Tags** (`featured_tags`) — comma list shown on landing.

Each row has its own Save button matching the screenshot pattern.

## Technical details

**Server fns** (new — `src/lib/admin.functions.ts`, all check `has_role(userId,'admin')` first):
- `adminListUsers()` — joins profiles + roles + post counts
- `adminSetUserRole({ userId, role })` — replaces the row in `user_roles`
- `adminDeleteUser({ userId })` — `supabaseAdmin.auth.admin.deleteUser`
- `adminBroadcastAnnouncement({ title, body })` — insert announcement + bulk-insert notifications for every `profiles.user_id`
- `adminGetOverview()` — stat aggregates
- `adminListLessons({ search, filter })` — join posts + profile + view count
- `adminTogglePublish({ postId })` — flip `published_at`

**Routes added:**
- `src/routes/_authenticated/admin.tsx` (layout + admin guard + tabs UI matching screenshot)
- `src/routes/_authenticated/admin.index.tsx` (Overview)
- `src/routes/_authenticated/admin.users.tsx`
- `src/routes/_authenticated/admin.lessons.tsx`
- `src/routes/_authenticated/admin.announcements.tsx`
- `src/routes/_authenticated/admin.settings.tsx`

**Frontend touches:**
- `_authenticated.tsx` — read maintenance setting; show banner for non-admins. (Admin nav item is already wired.)
- `index.tsx` — show maintenance banner; surface featured tags chip row.

**No DB migration needed** — every required table already exists.

## Out of scope (next round)
- Audit log of admin actions
- Per-user activity drill-down
- Bulk actions (multi-select)
- Email-log viewer (the `email_send_log` table already exists; add a 6th tab if you want it)
