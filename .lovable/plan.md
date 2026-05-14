## Scope

Five workstreams shipped together. Payments deferred until you pick a monetization model.

---

### 1. Legal pages (admin-editable)

Four pages: **Terms of Service, Privacy Policy, Cookie Policy, Acceptable Use Policy**.

- Content stored in DB (not hardcoded), so you can edit anytime from the admin panel without a code change.
- New table `legal_documents` with slug (`terms`, `privacy`, `cookies`, `aup`), title, body (markdown), updated_at.
- Public routes: `/terms`, `/privacy`, `/cookies`, `/aup` — SSR with proper SEO meta.
- Admin route: `/admin/legal` — list of 4 docs with a markdown editor for each.
- Seed each doc with a Nigeria-flavored placeholder draft (NDPR mention, Lagos jurisdiction, generic contact). You replace the real text later in the admin panel.
- Footer links added on landing + auth pages.
- Cookie consent banner (simple accept/dismiss, stores choice in localStorage).

---

### 2. Content moderation (flag-only, manual review)

- New table `content_reports`: post_id, reporter_user_id, reason (enum: spam, inappropriate, copyright, misinformation, other), details (text), status (pending/reviewed/dismissed/removed), created_at, reviewed_at, reviewer_id.
- "Report" button on every public lesson (`/p/$slug`) — opens a dialog with reason + optional details. Logged-in users only.
- Lesson stays visible until you act (per your choice).
- New admin route `/admin/reports` — queue of pending reports, grouped by lesson, with counts. Actions: **Dismiss report**, **Unpublish lesson**, **Delete lesson**, **Mark reviewed**.
- Notification badge on admin nav when pending reports exist.
- Rate-limit: one report per (user, post) — DB unique constraint.

---

### 3. Founder analytics dashboard

New admin route `/admin/analytics` showing:

- **Users**: total signups, signups in last 7/30 days, daily signups sparkline.
- **Lessons**: total published, published this week, drafts in progress.
- **Engagement**: total views (last 30d), claps, comments, bookmarks.
- **Top lists**: top 10 lessons by views (30d), top 10 authors by lessons published.
- **Email health**: emails sent, failed, suppression list size (from existing `email_send_log`).

All powered by server functions querying existing tables — no new tracking infra (`lesson_views` already exists).

---

### 4. Help Center / FAQ

- Public route `/help` — searchable FAQ grouped by category (Getting Started, Writing Lessons, Account & Profile, Notifications & Email, Troubleshooting, Contact).
- Admin-editable FAQs (table `faq_items`: category, question, answer, sort_order, is_published) so you can add/remove/reorder without code.
- Admin route `/admin/faqs` to manage them.
- Seed with ~15 starter FAQs based on existing app features.
- "Contact support" section with mailto + WhatsApp link.

---

### 5. Landing-page + SEO improvements

- Per-route `head()` metadata audit on all public routes (`/`, `/login`, `/signup`, `/p/$slug`, `/help`, `/terms`, etc.) — unique title, description, og:title, og:description, canonical, og:url.
- JSON-LD: `Organization` on root, `Article` on lesson pages (already partly there — verify), `FAQPage` on `/help`.
- Update `public/robots.txt` to allow crawling + reference sitemap.
- Verify `sitemap.xml` includes new public routes (terms, privacy, help, etc.).
- Landing page polish: clearer hero CTA, social proof section (lesson count, user count — real numbers from DB), "How it works" 3-step strip, footer with legal + help links.
- Open Graph image for sharing (generic branded card; you can replace later).

---

### 6. Payments — deferred

Skipped per your answer ("not decided yet"). When you pick freemium / donations / subscription, ping me and I'll wire Paddle or Stripe in one focused pass.

---

## Technical notes

- All new tables get RLS: legal/FAQ public-read + admin-write; reports insertable by any authed user, readable only by admin + own.
- All admin pages live under existing `/admin/*` route group (already gated).
- Markdown rendering: add `react-markdown` (small, safe) for legal + FAQ content.
- Analytics queries run via `createServerFn` with `requireSupabaseAuth` + admin-role check (not `supabaseAdmin`).
- No new external services, no new secrets, no email infra changes.

---

## Order of execution

Single batch as you requested. Migrations first → admin UIs → public pages → SEO polish → seed content. Roughly one continuous build.

Approve the plan and I'll start building.