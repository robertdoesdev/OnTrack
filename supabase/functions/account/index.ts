// OnTrack — `account` Edge Function
// -----------------------------------------------------------------------------
// Deploy with: supabase functions deploy account
// Required secrets (Project Settings -> Edge Functions -> account -> Secrets,
// or `supabase secrets set`):
//   SUPABASE_URL               (auto-provided by the platform)
//   ONTRACK_SECRET_KEY  (Project Settings -> API -> service_role key —
//                                NEVER put this in any frontend file)
//   ACCOUNT_EMAIL_DOMAIN       (optional; defaults to accounts.ontrack.internal.
//                                Does not need to receive real mail — see
//                                SETUP.md for why.)
//
// This function is the ONLY place the service_role key is used, and the
// ONLY place an Access Code is ever looked up. It only uses documented,
// currently-supported Supabase Auth Admin APIs:
//   - auth.admin.createUser        (create a real, non-anonymous user)
//   - auth.admin.generateLink      (mint a magic-link token server-side,
//                                    WITHOUT sending an email)
//   - auth.admin.getUserById       (look up a user's internal email)
// The client never receives the service_role key or a raw admin
// capability — it receives a one-time token_hash, which it exchanges for
// a real session itself via the public, documented
// `supabase.auth.verifyOtp()` API. That's what makes this real cross-
// device authentication rather than a fake copy of localStorage.
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
function json(body, status = 200) {
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

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('ONTRACK_SECRET_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function rateLimitOk(ip) {
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
async function mintSessionFor(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data || !data.properties) throw new Error('generateLink failed: ' + (error ? error.message : 'no properties'));
  return { tokenHash: data.properties.hashed_token, email };
}

async function handleCreate() {
  let accessCode = generateCode();
  let accessCodeHash = await sha256Hex(accessCode);

  // Extremely unlikely, but guard against a hash collision on a brand-new code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin.from('profiles').select('id').eq('access_code_hash', accessCodeHash).maybeSingle();
    if (!existing) break;
    accessCode = generateCode();
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

async function handleRedeem(code, ip) {
  const normalized = String(code || '').trim().toUpperCase();
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

  if (lookupErr || !profile) {
    return json({ error: 'not_found' }, 404);
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profile.id);
  if (userErr || !userData || !userData.user) {
    return json({ error: 'account_lookup_failed' }, 500);
  }

  let session;
  try {
    session = await mintSessionFor(userData.user.email);
  } catch (err) {
    return json({ error: 'session_mint_failed', detail: String(err) }, 500);
  }

  return json({
    userId: profile.id,
    email: session.email,
    tokenHash: session.tokenHash
  });
}

async function handleRegenerate(authHeader) {
  if (!authHeader) return json({ error: 'unauthenticated' }, 401);
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData || !userData.user) return json({ error: 'unauthenticated' }, 401);

  const userId = userData.user.id;
  let accessCode = generateCode();
  let accessCodeHash = await sha256Hex(accessCode);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin.from('profiles').select('id').eq('access_code_hash', accessCodeHash).maybeSingle();
    if (!existing) break;
    accessCode = generateCode();
    accessCodeHash = await sha256Hex(accessCode);
  }

  const { error: updateErr } = await admin.from('profiles').update({ access_code_hash: accessCodeHash }).eq('id', userId);
  if (updateErr) return json({ error: 'update_failed', detail: updateErr.message }, 500);

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
