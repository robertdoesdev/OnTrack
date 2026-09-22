/* =========================================================================
   OnTrack — Supabase configuration
   -------------------------------------------------------------------------
   `url` and `anonKey` below are this project's real, frontend-safe
   credentials (the publishable/anon key — safe to ship to the browser;
   Row Level Security is what actually protects each user's data, see
   supabase-schema.sql). Nothing secret lives in this file.

   `accountFunctionUrl` still needs YOUR project ref filled in below, once
   the `account` Edge Function is deployed (see SETUP.md) — it can't be
   guessed from the project URL. Until that's set, the app runs entirely
   on localStorage: it never silently pretends to be cloud-connected.
   ========================================================================= */
window.ONTRACK_SUPABASE_CONFIG = {
  url: 'https://sefhzmllopzmdiwfedgz.supabase.co',
  anonKey: 'sb_publishable_B122Zf2H1prNv7TU0-Y2ew_2QSDEm12',

  // e.g. 'https://sefhzmllopzmdiwfedgz.functions.supabase.co/account'
  accountFunctionUrl: 'https://sefhzmllopzmdiwfedgz.supabase.co/functions/v1/account'
};
