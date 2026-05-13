# Big dashboard upgrade

Four feature blocks, shipped in one pass.

## 1. User profile & settings page

New route: `/settings` (with sub-tabs: Profile, Account, Preferences).

- **Profile picture upload** — new `avatar_url` column on `profiles`, uploaded to existing `post-media` bucket under `avatars/{user_id}/...`. Avatar shows in sidebar, dashboard hero, article author meta, and comments.
- **Edit personal info** — title, surname, othernames, username, department, affiliation, phone, whatsapp.
- **Account** — email (read-only display), change password, sign out from all devices.
- **Preferences** — default to publishing anonymously (toggle), interest tags (used by recommendations).

## 2. Anonymous publishing

- New `is_anonymous` boolean on `posts` (default false).
- Compose page gets a "Publish anonymously" toggle (defaults from preference).
- On article page + feeds, anonymous posts show "Anonymous contributor" instead of author name and a generic avatar. Author can still edit their own anonymous posts (linkage stays via `author_user_id`, just hidden from UI).
- Author analytics still attribute views to the real author.

## 3. Personalization on dashboard

- **Continue reading** strip — track scroll progress per lesson in a new `reading_progress` table (`user_id`, `post_id`, `progress_pct`, `updated_at`). Resume the most recent unfinished one with a progress bar.
- **For you** rail — lessons whose tags overlap with: tags from posts you bookmarked + tags from posts you've read >50% + interest tags from preferences. Falls back to "trending this week" if signal is thin.
- **Trending this week** — top 6 published lessons by view count in the last 7 days.

## 4. Author analytics

- **Per-lesson sparkline** on `My lessons` page — 14-day daily view counts using existing `lesson_views`, rendered with recharts (already installed).
- **Top performing lesson** card on dashboard — your most-viewed lesson with view count + clap count.
- **Audience snapshot** — total unique readers (distinct `visitor_hash`), avg views/lesson, % of lessons that got ≥1 clap.

## Technical details

**DB migration:**
- `profiles`: add `avatar_url text default ''`, `interest_tags text[] default '{}'`, `default_anonymous boolean default false`.
- `posts`: add `is_anonymous boolean default false`.
- New `reading_progress` table with RLS (own rows only) + unique `(user_id, post_id)`.
- Storage RLS: extend `post-media` policies to allow `avatars/{auth.uid()}/*` writes.

**Routes added:**
- `src/routes/_authenticated/settings.tsx` (layout with tabs)
- `src/routes/_authenticated/settings.profile.tsx`
- `src/routes/_authenticated/settings.account.tsx`
- `src/routes/_authenticated/settings.preferences.tsx`

**Components:**
- `src/components/avatar-upload.tsx` — uses existing `media-manager` storage pattern.
- `src/components/lesson-sparkline.tsx` — 14-day mini chart.
- `src/components/anon-author.tsx` — render helper that respects `is_anonymous`.

**Edits:**
- `_authenticated.tsx` — add Settings nav item + show avatar in sidebar.
- `dashboard.tsx` — add "Continue reading", "For you", "Trending", "Top lesson" sections.
- `compose.tsx` — anonymous toggle, default from preference.
- `my-lessons.tsx` — per-row sparkline + view count.
- `p.$slug.tsx` — record reading progress on scroll, hide author when anonymous.
- `index.tsx` (public feed) — hide author when anonymous.

**No new dependencies** — recharts, supabase storage, and shadcn tabs are already in the project.

## Out of scope (next round)

Streaks, XP/badges, leaderboard, follows, activity feed, AI writing prompts, reader heatmaps. Happy to ship any of these next.
