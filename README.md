# Vitals — coaching platform (v1 scaffold)

A single-coach client management app: scheduling, combined weight + progress-photo
check-ins, analytics, coach-set goals, in-app messaging, and a Cal.com-synced
calendar. Built as a Next.js PWA on top of Supabase (Postgres, Auth, Storage,
Realtime-ready). See the design concept artifact from earlier in this project for
the visual direction this UI follows — monospace numerals, one restrained teal
accent, light + dark.

## Stack

- **Next.js 15** (App Router, Server Actions) — deploys cleanly to Vercel
- **Supabase** — Postgres + Auth (magic link) + Storage (private buckets for
  photos/attachments). One project covers the whole backend, free tier to start.
- **Cal.com API** — coach-managed calendar sync (you book in Cal.com; this app
  mirrors your bookings and surfaces the Zoom link)
- Plain CSS design system in `app/globals.css` (no Tailwind) — same tokens as
  the approved design concept, both themes built in

## First-time setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) (free tier is fine for
one coach's client roster).

### 2. Run the schema migration

In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`. This creates
every table, RLS policy, the `is_coach()` helper, the auto-profile/auto-thread
triggers, and the two private storage buckets (`check-in-photos`,
`message-attachments`).

### 3. Configure auth redirect URLs

In **Authentication → URL Configuration**, add your site URL (e.g.
`http://localhost:3000` for local dev, your real domain for production) to both
the Site URL and Redirect URLs fields — the magic-link and invite emails need it
to send people back to `/auth/callback`.

### 4. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — same page, **server-only**, never expose to the
  client. Used to send client invite emails via `auth.admin.inviteUserByEmail`.
- `NEXT_PUBLIC_SITE_URL` — where this app is running

### 5. Install and run

```bash
npm install
npm run dev
```

### 6. Bootstrap yourself as the coach

Sign in once at `/login` with your own email (this creates your `profiles` row
with the default `role = 'client'`), then promote yourself in the Supabase SQL
editor:

```sql
update public.profiles set role = 'coach' where email = 'you@example.com';
```

**Do this before inviting any clients** — the auto-thread trigger looks up the
current coach at the moment a client profile is created, so clients invited
before you promote yourself won't get a message thread.

### 7. Connect Cal.com (My Calendar)

1. Create a free account at [cal.com](https://cal.com) and connect your Zoom
   account under **Apps → Zoom** so bookings auto-generate a Zoom link.
2. Generate an API key under **Settings → Developer → API Keys**.
3. Set `CAL_COM_API_KEY` in your env.
4. Bookings are matched to clients by the attendee's email — have clients book
   with the same email they use to log into the app. Hit **Sync now** on
   `/coach/calendar` to pull bookings in (auto-refreshes every 60s otherwise).

## What's built vs. what's stubbed

**Working end to end:** auth (magic link + invite), onboarding/consent, the
combined weight+photo check-in flow, the trend chart, photo gallery + compare,
the day/week schedule with a coach-side schedule builder, coach roster with
adherence flags, per-client goals + private notes, 1:1 messaging with image/
document attachments, Cal.com booking sync.

**Explicitly deferred (see the original scope doc):** food diary, client
self-booking, payment/billing, PDF export, client-proposed goal changes.

**Wired but needs finishing:**
- **Web push notifications** — the `push_subscriptions` table and env vars
  (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`) exist, but the service
  worker registration, permission-prompt UI, and the actual send-on-new-message
  logic (via the `web-push` npm package) aren't implemented yet. Worth its own
  pass once the core flows are validated with real users.
- **Recurrence model** — schedule items support `daily` and `weekly` only, and
  `weekly` fires on whatever weekday the coach created the item (see the
  comment in `lib/schedule.ts`). Fine for v1; revisit if you need the coach to
  pick an explicit weekday.

## Project structure

```
app/(client)/        Client-facing pages — dashboard, schedule, check-in, progress, messages
app/coach/            Coach dashboard — roster, client detail, calendar, messages
app/onboarding/       First-login consent + profile setup
app/login/, app/auth/ Magic-link auth
lib/actions/          Server Actions (writes)
lib/supabase/         Browser/server Supabase clients + middleware session refresh
supabase/migrations/  SQL schema + RLS
types/database.ts     Hand-written types — replace with `supabase gen types typescript`
                       once you're pointed at a real project
```
