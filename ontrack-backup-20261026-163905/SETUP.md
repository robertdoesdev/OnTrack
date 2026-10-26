# Connecting Supabase (cross-device accounts)

OnTrack works fully on one device with zero setup. This file documents
what's needed to turn on **real cross-device accounts** and exactly how
that architecture works.

## What I could not do

I have no network access in the environment I built this in — the
Supabase host is explicitly blocked by an egress proxy
(`x-deny-reason: host_not_allowed`), and there's no local Postgres. That
means I could not:

- Run `supabase-schema.sql` against your project
- Deploy the `account` Edge Function
- Execute a single real auth/RLS/sync test against your actual database

Everything below is built and reasoned through carefully, and everything
that's testable *without* a network call (the entire local/offline path —
profile creation, onboarding, habit/completion persistence, the access
screen flows, graceful failure when the cloud isn't reachable) has been
tested directly in a browser. The cloud path has **not** been executed
against a live project. See "What you need to verify" below.

## Why the architecture changed from the last pass

The previous version used Supabase **anonymous auth** as the identity
behind an Access Code. That doesn't work for cross-device login: an
anonymous session belongs to one browser, and there is no supported way
for a *different* browser to "become" that same anonymous user. It also
called `auth.admin.createSession(...)`, which isn't a documented,
guaranteed-available Admin API — exactly the kind of thing that could
silently break.

This pass replaces both:

- **Every OnTrack account is a real, non-anonymous Supabase Auth user**,
  identified by a system-generated email the person never sees or types
  (e.g. `8f2c1e40-...@accounts.ontrack.internal`). They only ever see
  their Access Code.
- **Access Codes are never stored in plaintext.** `profiles.access_code_hash`
  stores a SHA-256 hash. The plaintext code is shown to the user exactly
  once (at creation or regeneration) and then never again — OnTrack
  itself can't display it later, by design.
- **Cross-device login uses only documented, current Supabase Auth Admin
  APIs**: `auth.admin.createUser`, `auth.admin.generateLink`, and
  `auth.admin.getUserById`, called from an Edge Function holding the
  service_role key. The client never receives that key — it receives a
  one-time `token_hash`, which it exchanges for a real session itself via
  the public `supabase.auth.verifyOtp()` API. No email is ever actually
  sent; `generateLink` only *mints* the token.

## Final authentication architecture

```
Device                          Edge Function "account"        Database
------                          ------------------------        --------
"+ New profile" (local)          (not involved)                 localStorage only

"Connect to the cloud" ───POST {action:"create"}──▶
                                  generate access code
                                  hash it (SHA-256)
                                  auth.admin.createUser(email)
                                  insert profiles row
                                  auth.admin.generateLink()
                          ◀── {accessCode, email, tokenHash} ───
supabase.auth.verifyOtp(email, tokenHash) → real session
push local data to Supabase (checked per-table)

"Use Access Code" ───POST {action:"redeem", code}──▶
                                  rate-limit check (per IP)
                                  hash the code, look up profiles
                                  auth.admin.getUserById()
                                  auth.admin.generateLink()
                          ◀── {email, tokenHash} ───
supabase.auth.verifyOtp(email, tokenHash) → real session
fetch full profile state from Supabase, hydrate DataStore

Profile → "Regenerate code" ───POST {action:"regenerate"} + Bearer JWT──▶
                                  verify JWT → caller's own user id only
                                  generate + hash new code, update row
                          ◀── {accessCode} ───
```

RLS on every table (`using (auth.uid() = user_id)`) means a normal client
request — authenticated or not — can never look up a profile by access
code; only the Edge Function (service_role, bypasses RLS) can, and it
only returns a session token, never another user's data directly.

## Cloud hydration (startup)

`init()` in `app.js` is sequenced, not fire-and-forget:

1. Check `isSupabaseConfigured()` (all of `url`, `anonKey`,
   `accountFunctionUrl` must be set).
2. If configured, check for an existing Supabase session
   (`auth.getSession()`).
3. If a session exists, **fetch the full cloud profile and hydrate
   `state` before the app renders anything** — the splash screen shows
   "Loading your account…" during this. The cloud session always wins
   over whatever local profile was previously active on the device.
4. If the fetch fails, a clear error screen appears (retry, or sign out
   and use the device locally) — it never silently falls back to showing
   stale local data as if it were current.
5. If there's no cloud session, the app falls back to local/offline mode
   exactly as before.

## Sync errors are never silent

`SupabaseAdapter.pushFullState()` checks the response of every table
write individually and returns `{ ok, failedTables }`. `DataStore`
records the outcome in `syncStatus`, and Profile → "Access code &
account" shows it honestly: "Synced," or "Not fully synced — `<tables>`
didn't save to the cloud yet. It's safe in this browser and will retry."
The app never claims a save succeeded when it didn't.

## Local → cloud migration

"Connect to the cloud" in Profile (only shown for a local-only profile):

1. Calls `action: "create"` to get a real cloud identity + Access Code.
2. Establishes a session for it.
3. Pushes the *existing* local profile's data (habits, completions,
   priorities, friction, skills, weekly reviews, challenges, settings)
   under the new cloud identity, checking every table write.
4. Only on full success does the local UI switch over to the cloud
   identity. On any failure, the local profile is left completely
   untouched, signs back out of the half-created cloud session, and shows
   the error — nothing is deleted, nothing is silently declared migrated.

`localStorage.clear()` is never used anywhere in this flow.

## Profile switching vs. the cloud session

Clicking a different local profile in the picker calls
`ensureCloudSignedOutIfSwitchingIdentity()` first, which signs out of
Supabase if the current cloud session belongs to a *different* account
than the one being switched to. This prevents the local UI from ever
showing one profile while Supabase still thinks a different user is
authenticated.

## What you need to do

1. **Run `supabase-schema.sql`** in the SQL Editor. It's idempotent and
   safe to re-run; if this project ever had the earlier plaintext
   `access_code` column, the script hashes existing values into
   `access_code_hash` before dropping the old column — no codes are
   silently invalidated.
2. **Enable email auth stays default-on**; you do NOT need to enable
   Anonymous Sign-ins for this version (that requirement is gone).
3. **Deploy the Edge Function:**
   ```
   supabase login
   supabase link --project-ref sefhzmllopzmdiwfedgz
   supabase functions deploy account
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```
   (`SUPABASE_URL` is provided automatically; `ACCOUNT_EMAIL_DOMAIN` is
   optional — defaults to `accounts.ontrack.internal`, which never needs
   to receive real mail since no email is ever actually sent.)
4. **Fill in `supabase-config.js`** with the deployed function's URL:
   ```js
   accountFunctionUrl: 'https://sefhzmllopzmdiwfedgz.supabase.co/functions/v1/account'
   ```
   (`url` and `anonKey` are already filled in with the credentials you gave me.)
5. Reload. Profile will now offer "Connect to the cloud."

## What you need to verify (I could not test these)

- **`auth.admin.generateLink({ type: 'magiclink', email })`** returning
  `data.properties.hashed_token` in the exact shape the Edge Function
  expects, on your project's current GoTrue version.
- **`supabase.auth.verifyOtp({ email, token_hash, type: 'magiclink' })`**
  successfully establishing a session client-side from that token.
- **RLS**: create two accounts and confirm neither can read the other's
  rows (should be structurally guaranteed by the `auth.uid() = user_id`
  policies, but I could not run this against your actual database).
- **The full cross-device flow** end-to-end: create on Device A, redeem
  the same code on Device B, confirm identical data appears, make a
  change on B, confirm it appears back on A.
- **Rate limiting**: confirm `access_code_attempts` actually throttles
  repeated bad codes from one IP as expected.

## What's still local-only by design

- A profile created with "+ New Profile" stays local-only until someone
  explicitly clicks "Connect to the cloud." This is intentional — trying
  the app never requires a network call.
- Push notifications are not implemented. `sw.js` only caches the app
  shell for offline loads and installability; Settings says so rather
  than implying delivery works.
