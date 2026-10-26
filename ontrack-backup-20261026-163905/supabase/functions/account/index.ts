// OnTrack — `account` Edge Function
// -----------------------------------------------------------------------------
// Deploy with: supabase functions deploy account
// Required secrets (Project Settings -> Edge Functions -> account -> Secrets,
// or `supabase secrets set`). The admin client below accepts any of these,
// in priority order, so a working configuration is never silently ignored:
//   SUPABASE_URL               (auto-provided by the platform)
//   SUPABASE_SECRET_KEYS       (auto-provided on projects using the newer
//                                publishable/secret key system; JSON, e.g.
//                                {"default":"sb_secret_..."})
//   SUPABASE_SERVICE_ROLE_KEY  (legacy service_role JWT, if your project
//                                still uses the old key format)
//   ONTRACK_SECRET_KEY         (manual override, only used if neither of
//                                the above is present)
//   ACCOUNT_EMAIL_DOMAIN       (optional; defaults to accounts.ontrack.internal.
//                                Does not need to receive real mail — see
//                                SETUP.md for why.)
//
// This function is the ONLY place any of those keys is used, and the ONLY
// place an Access Code is ever looked up. It only uses documented,
// currently-supported Supabase Auth Admin APIs:
//   - auth.admin.createUser        (create a real, non-anonymous user)
//   - auth.admin.generateLink      (mint a magic-link token server-side,
//                                    WITHOUT sending an email)
//   - auth.admin.getUserById       (look up a user's internal email)
// The client never receives any of these keys or a raw admin capability —
// it receives a one-time token_hash, which it exchanges for a real session
// itself via the public, documented `supabase.auth.verifyOtp()` API.
//
// Actions (POST body: { action, ...params }):
//   "create"      -> {}                      : new account + access code
//   "redeem"      -> { code }                 : cross-device login by code
//   "regenerate"  -> { }  (Authorization: Bearer <user JWT> required)
//                                              : issue a new code for the
//                                                CALLER's own account only

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const ACCOUNT_EMAIL_DOMAIN = Deno.env.get('ACCOUNT_EMAIL_DOMAIN') || 'accounts.ontrack.internal';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
  });
}

function generateCodeBlock() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}
function generateCode() {
  return `OT-${generateCodeBlock()}-${generateCodeBlock()}`;
}

// Codes are always generated in canonical form (uppercase, no whitespace),
// but this is applied on BOTH the write side (handleCreate/handleRegenerate)
// and the read side (handleRedeem) before hashing, so the two can never
// diverge because of case or stray whitespace — even if generateCode() or
// its alphabet changes later.
function normalizeCode(code: unknown) {
  return String(code || '').trim().toUpperCase();
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Resolve the admin key from whichever secret is actually present, instead
// of assuming one fixed name — this is what caused the last drift (a
// working key was set under a different secret name than the code read).
// Only the SOURCE of the key is logged, never its value.
function resolveAdminKey() {
  const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeysRaw) {
    try {
      const parsed = JSON.parse(secretKeysRaw);
      if (parsed && parsed.default) {
        console.log('account fn: using SUPABASE_SECRET_KEYS.default');
        return parsed.default;
      }
    } catch (err) {
      console.error('account fn: SUPABASE_SECRET_KEYS was set but not valid JSON');
    }
  }
  if (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('account fn: using SUPABASE_SERVICE_ROLE_KEY');
    return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (Deno.env.get('ONTRACK_SECRET_KEY')) {
    console.log('account fn: using ONTRACK_SECRET_KEY');
    return Deno.env.get('ONTRACK_SECRET_KEY');
  }
  console.error('account fn: no admin key found in SUPABASE_SECRET_KEYS, SUPABASE_SERVICE_ROLE_KEY, or ONTRACK_SECRET_KEY');
  return null;
}

// Narrows Deno.env.get()'s `string | undefined` to `string` without an
// unsafe cast: if it's genuinely missing, fail fast with a clear message
// instead of silently handing `undefined` to createClient().
function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Required environment variable "${name}" is not set.`);
  }
  return value;
}

const admin = createClient(
  requireEnv('SUPABASE_URL'),
  resolveAdminKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function rateLimitOk(ip: string) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000).toISOString();
  const { count } = await admin
    .from('access_code_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', windowStart);
  await admin.from('access_code_attempts').insert({ ip });
  return (count || 0) < RATE_LIMIT_MAX_ATTEMPTS;
}

// Mints a real session token for an existing auth user via a
// server-generated (never emailed) magic link, without needing any
// undocumented admin session API.
async function mintSessionFor(email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data || !data.properties) throw new Error('generateLink failed: ' + (error ? error.message : 'no properties'));
  return { tokenHash: data.properties.hashed_token, email };
}

async function handleCreate() {
  let accessCode = normalizeCode(generateCode());
  let accessCodeHash = await sha256Hex(accessCode);

  // Extremely unlikely, but guard against a hash collision on a brand-new code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin.from('profiles').select('id').eq('access_code_hash', accessCodeHash).maybeSingle();
    if (!existing) break;
    accessCode = normalizeCode(generateCode());
    accessCodeHash = await sha256Hex(accessCode);
  }

  const email = `${crypto.randomUUID()}@${ACCOUNT_EMAIL_DOMAIN}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createErr || !created || !created.user) {
    return json({ error: 'account_creation_failed', detail: createErr ? createErr.message : null }, 500);
  }

  const { error: insertErr } = await admin.from('profiles').insert({
    id: created.user.id,
    access_code_hash: accessCodeHash
  });
  if (insertErr) {
    // Roll back the auth user so we don't leave an orphaned account behind.
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'profile_creation_failed', detail: insertErr.message }, 500);
  }

  // ---- Read-back verification ----
  // This is the actual fix. Rather than assume the insert we just made is
  // what a later lookup will see (which can silently fail to hold under
  // RLS/key misconfiguration, replica lag, or drift between what's
  // deployed and what we think is deployed), re-read the row with the
  // SAME query shape handleRedeem uses and byte-compare the hash before
  // ever telling the user "here is your code." If they don't match, this
  // is treated as a hard failure — never a false success.
  const { data: verifyRow, error: verifyErr } = await admin
    .from('profiles')
    .select('access_code_hash')
    .eq('id', created.user.id)
    .maybeSingle();

  if (verifyErr || !verifyRow || verifyRow.access_code_hash !== accessCodeHash) {
    console.error('account fn: post-insert verification mismatch', {
      userId: created.user.id,
      verifyErr: verifyErr ? verifyErr.message : null,
      gotHashPrefix: verifyRow ? String(verifyRow.access_code_hash).slice(0, 8) : null,
      expectedHashPrefix: accessCodeHash.slice(0, 8)
    });
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from('profiles').delete().eq('id', created.user.id);
    return json({ error: 'verification_failed', detail: 'Could not confirm the stored access code matches. No account was left behind — please try again.' }, 500);
  }

  let session;
  try {
    session = await mintSessionFor(email);
  } catch (err) {
    return json({ error: 'session_mint_failed', detail: String(err) }, 500);
  }

  return json({
    accessCode,
    userId: created.user.id,
    email: session.email,
    tokenHash: session.tokenHash
  });
}

async function handleRedeem(code: unknown, ip: string) {
  const normalized = normalizeCode(code);
  if (!/^OT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) {
    return json({ error: 'invalid_code_format' }, 400);
  }
  if (!(await rateLimitOk(ip))) {
    return json({ error: 'rate_limited' }, 429);
  }

  const hash = await sha256Hex(normalized);
  const { data: profile, error: lookupErr } = await admin
    .from('profiles')
    .select('id')
    .eq('access_code_hash', hash)
    .maybeSingle();

  if (lookupErr) {
    console.error('account fn: redeem lookup error', lookupErr.message);
  }
  if (lookupErr || !profile) {
    console.log('account fn: redeem not_found for hash prefix', hash.slice(0, 8));
    return json({ error: 'not_found' }, 404);
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profile.id);
  if (userErr || !userData || !userData.user) {
    return json({ error: 'account_lookup_failed' }, 500);
  }

  const userEmail = userData.user.email;
  if (!userEmail) {
    // Every account is created with a system-generated email (see
    // handleCreate), so this should never happen in practice — but the
    // Supabase User type marks `email` optional, and a session can't be
    // minted without one, so this is handled explicitly rather than
    // passing a possibly-undefined value through.
    console.error('account fn: profile has no auth email on record', { userId: profile.id });
    return json({ error: 'account_lookup_failed' }, 500);
  }

  let session;
  try {
    session = await mintSessionFor(userEmail);
  } catch (err) {
    return json({ error: 'session_mint_failed', detail: String(err) }, 500);
  }

  return json({
    userId: profile.id,
    email: session.email,
    tokenHash: session.tokenHash
  });
}

async function handleRegenerate(authHeader: string | null) {
  if (!authHeader) return json({ error: 'unauthenticated' }, 401);
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData || !userData.user) return json({ error: 'unauthenticated' }, 401);

  const userId = userData.user.id;
  let accessCode = normalizeCode(generateCode());
  let accessCodeHash = await sha256Hex(accessCode);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin.from('profiles').select('id').eq('access_code_hash', accessCodeHash).maybeSingle();
    if (!existing) break;
    accessCode = normalizeCode(generateCode());
    accessCodeHash = await sha256Hex(accessCode);
  }

  const { error: updateErr } = await admin.from('profiles').update({ access_code_hash: accessCodeHash }).eq('id', userId);
  if (updateErr) return json({ error: 'update_failed', detail: updateErr.message }, 500);

  // Same read-back verification as handleCreate.
  const { data: verifyRow, error: verifyErr } = await admin
    .from('profiles')
    .select('access_code_hash')
    .eq('id', userId)
    .maybeSingle();
  if (verifyErr || !verifyRow || verifyRow.access_code_hash !== accessCodeHash) {
    console.error('account fn: regenerate verification mismatch', { userId, verifyErr: verifyErr ? verifyErr.message : null });
    return json({ error: 'verification_failed', detail: 'Could not confirm the new code was saved. Please try again.' }, 500);
  }

  return json({ accessCode });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  try {
    if (body.action === 'create') return await handleCreate();
    if (body.action === 'redeem') return await handleRedeem(body.code, ip);
    if (body.action === 'regenerate') return await handleRegenerate(req.headers.get('authorization'));
    return json({ error: 'unknown_action' }, 400);
  } catch (err) {
    console.error('account function error', err);
    return json({ error: 'internal_error' }, 500);
  }
});