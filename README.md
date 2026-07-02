# Tasks & Calendar Dashboard

A tasks + calendar management app (Hebrew / RTL) with two-way Google Calendar sync
and webhook endpoints. Originally built on Base44 — **now fully independent** and
running on **Supabase** (database + auth) and **Vercel** (hosting + serverless API).

## Architecture

| Concern | Technology |
|--------|------------|
| UI | React + Vite + Tailwind + shadcn/ui (unchanged) |
| Database | Supabase Postgres (tables + Row Level Security) |
| Auth | Supabase Auth (email/password + optional Google login) |
| Serverless API | Vercel Functions in `/api` |
| Google Calendar | Google Cloud OAuth (your own credentials) |

The old `base44.entities.*`, `base44.auth.*` and `base44.functions.*` calls still work —
they're re-implemented in `src/api/base44Client.js` on top of Supabase, so the pages
were left almost untouched.

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the tables, triggers, and RLS policies.
3. In **Project Settings → API**, copy:
   - `Project URL` → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-side only, keep secret**)
4. (Optional) To simplify sign-up during testing: **Authentication → Providers → Email** and turn *Confirm email* off, or enable the **Google** provider for one-click login.

## 2. Google Calendar OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → configure it, add your email as a test user, add scopes `.../auth/calendar` and `.../auth/userinfo.email`.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized redirect URI: `https://YOUR_APP.vercel.app/api/auth/google/callback`
   - (for local dev also add `http://localhost:3000/api/auth/google/callback`)
5. Copy the Client ID / Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## 3. Environment variables

Copy `.env.example` to `.env.local` for local dev, and add the same values in
**Vercel → Project → Settings → Environment Variables** for production.

See [`.env.example`](.env.example) for the full list. Highlights:

- `OAUTH_STATE_SECRET` — any long random string (signs the OAuth state).
- `TASK_WEBHOOK_USERNAME` / `TASK_WEBHOOK_PASSWORD` — Basic Auth for the webhooks.
- `WEBHOOK_OWNER_USER_ID` — the Supabase user UID that owns rows created via webhook
  (find it in **Authentication → Users**). Required for the webhooks to work.

## 4. Local development

```bash
npm install
npm run dev            # Vite frontend on http://localhost:5173
```

To also run the `/api` serverless functions locally, use the Vercel CLI in a second terminal:

```bash
npm i -g vercel
vercel dev             # serves /api on http://localhost:3000
```

(The Vite dev server proxies `/api` to `http://localhost:3000`.)

## 5. Deploy to Vercel

```bash
npm i -g vercel
vercel                 # first deploy (or import the repo at vercel.com)
vercel --prod
```

Make sure all environment variables are set in the Vercel dashboard. Vercel
auto-detects the Vite build; the `/api` folder becomes serverless functions and
`vercel.json` routes all other paths to the SPA.

---

## Webhook usage

**Create a task** (`POST /api/functions/taskWebhook`, Basic Auth):

```
Authorization: Basic <base64(user:password)>
Content-Type: application/json

{ "title": "New task", "priority": "high", "due_at": "2026-01-10T10:00:00Z", "tags": ["a"] }
```

**Calendar** (`/api/functions/calendarWebhook`, Basic Auth): `GET` returns upcoming
events, `POST` triggers a Google Calendar sync for the owner user.

## WhatsApp AI assistant

Incoming WhatsApp messages are classified by an AI model (OpenAI `gpt-4.1-mini` by
default; set `AI_PROVIDER=gemini` to switch) into either a **calendar event** or a
**task**, following strict Hebrew date/time rules and the user's local timezone.

Flow (`POST /api/webhook/wasender`):

1. Wasender delivers the incoming message. The sender phone is matched to an
   **approved** user in `user_profiles`.
2. The message is classified relative to "today" in the user's timezone.
3. **Event** → inserted into `calendar_events` (and pushed to Google Calendar if the
   user is connected). **Task** → inserted into `tasks`. Both scoped to that user's
   `user_id`.
4. A Hebrew confirmation message is sent back over WhatsApp.

Setup: in the Wasender dashboard set the webhook URL to
`https://YOUR_APP.vercel.app/api/webhook/wasender` and enable the
`messages.received` event. Optionally set `WASENDER_WEBHOOK_SECRET` and pass it as
the `x-webhook-secret` header or `?secret=` query param. Add `OPENAI_API_KEY`
(or `GEMINI_API_KEY`) to the Vercel environment variables.

> Note: tasks and events use one shared table each with per-user `user_id` + Row
> Level Security — no separate table per client is needed.
