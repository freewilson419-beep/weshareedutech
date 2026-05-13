## Goal
Port the full WeShare-EduTeach app (originally a pnpm monorepo: React + Vite + wouter + Express + Drizzle + Clerk on Replit) into this Lovable Cloud + TanStack Start project, replacing the entire backend with Lovable Cloud (Supabase Auth + Postgres + Storage) and `createServerFn`.

## Scope (confirmed by user)
- Full port: all pages and features
- Auth: Lovable Cloud (email/password + Google)
- Media: Lovable Cloud Storage bucket (not base64)
- Notifications: in-app + email (Resend) + web push (VAPID)

## What gets removed / replaced
- Drop: `wouter`, Clerk, Express, Drizzle, Orval, the entire monorepo workspace (`artifacts/*`, `lib/*`, `pnpm-workspace.yaml`, `replit.md`, `nixpacks.toml`, `railway.toml`, `netlify.toml`).
- Replace router → TanStack file routes in `src/routes/`.
- Replace API client (Orval/React Query hooks against Express) → `createServerFn` + direct Supabase calls.
- Replace base64 media → Supabase Storage signed-URL uploads.
- Keep: shadcn UI components (already installed here), the page UX, schema shapes, business logic (heuristic AI grading, quiz flow, voice recorder).

## Database (15 tables, all with RLS)
profiles, universities, courses, enrollments, course_invites, posts, announcements, comments, submissions, quizzes, quiz_attempts, push_subscriptions, notifications, platform_announcements, settings.

Key changes from original:
- `profiles.user_id` → `uuid` referencing `auth.users`.
- Roles in a separate `user_roles` table (`student | lecturer | admin`) with `has_role()` security-definer fn.
- Trigger to auto-create empty profile on signup; app gates on profile-completion via `/onboarding`.
- Storage bucket `submissions` (private, signed URLs) for voice/video.

## Routes (TanStack file-based)
Public: `/`, `/login`, `/signup`, `/reset-password`.
Pathless layout `_authenticated` (beforeLoad redirect):
- `/onboarding`, `/dashboard`, `/courses`, `/courses/$id`, `/posts/$id`, `/scores`, `/analytics`.
Nested `_authenticated/_admin/admin` (role-gated).
API server routes under `/api/public/*` for Resend webhook + push subscribe + VAPID public-key.

## Server functions (`src/lib/*.functions.ts`)
profile, courses, enrollments, posts, comments, announcements, submissions (incl. signed upload URL + AI grade heuristic), quizzes, quiz attempts, scores, analytics, admin, notifications, push.

## Notifications
- In-app: `notifications` table + bell component with realtime channel.
- Email: Lovable Email (default) sending via TanStack server route — triggered on new lesson published, enrollment, new comment.
- Web push: VAPID keys in secrets, `push_subscriptions` table, push on same events.

## Files to remove (from current project)
`src/routes/index.tsx` placeholder content (replaced with landing page).

## Order of work (incremental delivery)
1. Schema + RLS + storage bucket + auth-trigger migrations.
2. Landing page + auth (login/signup/reset/Google) + onboarding + auth layout.
3. Dashboard + Courses (list, detail, create, enroll, invite).
4. Posts (create with slides, list, detail) + Comments + Announcements.
5. Submissions: voice/video recorder → Storage upload → heuristic AI grade + lecturer override.
6. Quizzes (MCQ + type-answer) + attempts + grading.
7. Scores + Analytics pages.
8. Notifications (in-app + bell + realtime).
9. Email notifications (Lovable Email).
10. Web push (VAPID, subscribe, send).
11. Admin panel (users, universities, platform announcements, settings).
12. Cleanup, SEO, verify build.

## Decisions baked in
- TanStack Router, not wouter.
- Supabase Auth (email + Google), not Clerk; profile + roles in separate tables.
- Storage bucket for media; max ~25 MB per submission via signed upload.
- Lovable Email default (per Lovable best practice), with fallback option to Resend connector if you prefer your existing RESEND_API_KEY.
- VAPID keys requested as secrets when we reach push step.

## Risks / what I need from you later
- Confirm Lovable Email (recommended) vs your existing Resend key.
- A short app name/title and a primary brand color (or I'll pick a calm academic blue).
- For push: I'll generate VAPID keys via a one-off script and store them as secrets.

This plan is large — I'll deliver in the 12 steps above so you can preview after each. Approve and I'll start with step 1 (schema + auth scaffold).