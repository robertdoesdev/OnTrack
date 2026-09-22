/* =========================================================================
   ONTRACK — app.js
   A personal system: understand what matters, see what's getting in the
   way, build a system, execute today, learn from friction, review weekly.
   Vanilla JS, no build step. Local-first; Supabase becomes the source of
   truth for an account once configured (see supabase-config.js).
   ========================================================================= */

const STORAGE_KEY = 'ontrack_data';
const SESSION_KEY = 'ontrack_session';
const LEGACY_DATA_KEY = 'four_keys_data';
const LEGACY_SESSION_KEY = 'four_keys_session';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS = { DONE: 'done', ADJUSTED: 'adjusted', MISSED: 'missed' };
const STATUS_HELP = {
  done: 'Completed as planned.',
  adjusted: 'Completed a smaller or modified version of the planned habit \u2014 for example a 10-minute workout instead of the planned 30 minutes. It still counts toward your consistency.',
  missed: "Didn't happen. Worth a quick note on why, so patterns can show up in Friction."
};

/* -------------------------------------------------------------------------
   ONBOARDING CATALOG — categories stay broad on purpose; the flow around
   them is what changed (see the wizard further down).
   ------------------------------------------------------------------------- */
const ONBOARDING_CATEGORIES = [
  {
    id: 'mind_focus', title: 'Mind & Focus',
    items: ["Procrastination", "Brain fog", "Doomscrolling", "Overthinking", "Short attention span",
      "Feeling mentally scattered", "Lack of discipline", "Inconsistent routines", "Burnout", "Feeling stuck",
      "Decision paralysis", "Perfectionism", "Fear of failure", "Fear of wasting time",
      "Difficulty starting things", "Difficulty finishing things", "Constantly seeking stimulation",
      "Feeling behind in life"]
  },
  {
    id: 'identity_self', title: 'Identity & Self',
    items: ["Low self-confidence", "Comparing myself to everyone", "Not knowing who I am", "People-pleasing",
      "Caring too much about what people think", "Struggling with self-expression",
      "Feeling like I'm living for other people", "Difficulty setting boundaries", "Becoming whoever I'm around",
      "Feeling disconnected from myself", "Wanting to reinvent myself", "Finding my personal style",
      "Building my identity", "Becoming more independent"]
  },
  {
    id: 'dating_relationships', title: 'Dating & Relationships',
    items: ["Getting over an ex", "Missing someone I shouldn't", "Dating anxiety", "Fear of rejection",
      "Fear of commitment", "Fear of intimacy", "Getting attached too quickly", "Avoiding emotional intimacy",
      "Situationships", "Toxic relationship patterns", "Setting relationship boundaries",
      "Communication problems", "Jealousy", "Trust issues", "Feeling lonely while dating",
      "Not knowing what I want from relationships", "Choosing unavailable people",
      "People-pleasing in relationships", "Struggling to let go", "Learning to be alone"]
  },
  {
    id: 'sexuality_identity', title: 'Sexuality & Identity', private: true,
    note: "You don't need to choose a label. You can change or remove this later.",
    items: ["Exploring my sexuality", "Questioning my sexuality", "Understanding my attraction",
      "Understanding romantic vs sexual attraction", "Figuring out what I'm comfortable with",
      "Setting sexual boundaries", "Communicating boundaries", "Navigating dating while figuring myself out",
      "Feeling confused about labels", "Feeling pressure to choose a label",
      "Feeling different from people around me", "Dealing with shame or stigma", "Understanding consent",
      "Learning about healthy sexual relationships", "Balancing sexuality with my personal values",
      "Feeling confident expressing my boundaries"]
  },
  {
    id: 'social_life', title: 'Social Life',
    items: ["Social anxiety", "Making new friends", "Maintaining friendships", "Feeling like the third wheel",
      "Feeling left out", "Fear of being judged", "Fear of embarrassment", "Struggling to start conversations",
      "Struggling to keep conversations going", "Finding my people", "Feeling lonely in a crowd",
      "Feeling like nobody really knows me", "People-pleasing", "Setting boundaries with friends",
      "Losing friends", "Outgrowing friendships", "Becoming more socially confident"]
  },
  {
    id: 'digital_life', title: 'Digital Life',
    items: ["Doomscrolling", "Phone addiction", "Social media comparison", "Constantly checking notifications",
      "FOMO", "Internet rabbit holes", "Porn consumption", "Excessive gaming", "Staying up scrolling",
      "Seeking validation online", "Obsessing over likes/views", "Comparing my life to people online",
      "Difficulty being offline", "Digital distractions while studying/working"]
  },
  {
    id: 'money_independence', title: 'Money & Independence',
    items: ["Bad spending habits", "Impulse buying", "Saving money", "Budgeting", "Financial anxiety",
      "Not knowing where my money goes", "Depending too much on others", "Wanting financial independence",
      "Finding ways to earn", "Fear of financial instability", "Balancing enjoyment and saving"]
  },
  {
    id: 'school_career', title: 'School & Career',
    items: ["Academic procrastination", "Exam anxiety", "Falling behind", "Poor time management",
      "Can't focus while studying", "Study consistency", "Feeling academically average",
      "Pressure from family", "Choosing a career", "Feeling lost about my future",
      "Fear of graduating without a plan", "Building useful skills", "Finding internships",
      "Building a portfolio", "Feeling behind my peers", "Not knowing what I'm good at"]
  },
  {
    id: 'lifestyle', title: 'Lifestyle',
    items: ["Poor sleep", "Irregular sleep schedule", "Lack of exercise", "Inconsistent eating", "Low energy",
      "Spending too much time indoors", "Poor daily routine", "Hygiene consistency",
      "Taking better care of myself", "Building healthier routines", "Wanting more energy",
      "Difficulty maintaining routines"]
  },
  {
    id: 'emotional_regulation', title: 'Emotional Regulation',
    items: ["Anger", "Irritability", "Emotional outbursts", "Holding things in", "Getting triggered easily",
      "Difficulty communicating when upset", "Taking things personally", "Emotional impulsivity",
      "Difficulty calming down", "Avoiding difficult conversations"]
  },
  {
    id: 'purpose_life', title: 'Purpose & Life',
    items: ["Feeling directionless", "Feeling behind", "Not knowing what I want", "Lack of motivation",
      "Feeling like I'm wasting my potential", "Fear of wasting my 20s", "Wanting to become more disciplined",
      "Building a meaningful life", "Finding things I actually care about", "Becoming independent",
      "Figuring out what success means to me", "Creating a vision for my life"]
  }
];
function findCategory(catId) { return ONBOARDING_CATEGORIES.find(c => c.id === catId); }

/* Contextual "what's getting in your way" options, tailored per category so
   the question feels like it understands the person rather than collecting
   a generic label. */
const CATEGORY_BLOCKERS = {
  mind_focus: ["Procrastination", "Difficulty concentrating", "Overthinking", "Lack of discipline",
    "Don't know where to start", "Getting distracted easily"],
  identity_self: ["Overthinking", "Caring too much what others think", "People-pleasing",
    "Don't know where to start", "Inconsistent routines"],
  dating_relationships: ["Overthinking", "Fear of rejection", "Fear of commitment",
    "Don't know where to start", "Choosing unavailable people"],
  sexuality_identity: ["Overthinking", "Pressure to have an answer right away", "Fear of judgment",
    "Don't know where to start"],
  social_life: ["Overthinking", "Fear of rejection", "Don't know where to start",
    "Don't meet enough people", "Prefer staying alone", "Difficulty maintaining friendships"],
  digital_life: ["Too much scrolling", "Constant notifications", "Can't stay focused",
    "Gaming", "Social media", "Phone dependence"],
  money_independence: ["Inconsistent income", "Overspending", "Difficulty saving",
    "Don't know where to start", "Lack of opportunities"],
  school_career: ["Procrastination", "Difficulty concentrating", "Too much workload",
    "Poor time management", "Lack of motivation", "Don't know where to start"],
  lifestyle: ["Inconsistent routines", "Low energy", "Poor time management",
    "Don't know where to start", "Difficulty maintaining routines"],
  emotional_regulation: ["Overthinking", "Difficulty expressing emotions", "Avoiding difficult situations",
    "Inconsistent routines", "Difficulty calming down"],
  purpose_life: ["Lack of motivation", "Don't know where to start", "Overthinking",
    "Fear of failure", "Difficulty maintaining routines"]
};

/* -------------------------------------------------------------------------
   CATEGORY PRESET LIBRARY
   Each category can seed: habits, skills, watchFor ("things to watch for" —
   NOT real friction history), and frictionPatterns (used only to inform
   intervention copy, never written as real friction records).
   ------------------------------------------------------------------------- */
const CATEGORY_PRESETS = {
  mind_focus: {
    habits: ["Start the most avoided task for 10 minutes", "Work in one 25-minute focus sprint",
      "Nightly plan for tomorrow's top 3 tasks", "Zero phone for the first 20 minutes awake"],
    skills: ["Task initiation", "Sustained focus"],
    watchFor: ["Waiting until you \"feel ready\" to start", "Reorganizing/planning instead of starting",
      "Reaching for your phone the moment a task gets hard"],
    frictionPatterns: ["Poor planning", "Distraction", "Avoidance"]
  },
  identity_self: {
    habits: ["Write one honest journal entry about what you want", "Say no to one thing that isn't you",
      "Spend 15 minutes on something purely for yourself"],
    skills: ["Self-expression", "Boundary setting"],
    watchFor: ["Agreeing with the last person who spoke", "Deciding based on what others will think"],
    frictionPatterns: ["Overthinking", "Avoidance"]
  },
  dating_relationships: {
    habits: ["Journal your feelings after any date or interaction", "Practice stating one boundary clearly",
      "Limit dating-app usage to a set window", "Do one thing today solely for your own fulfillment"],
    skills: ["Boundary setting", "Discerning intentions"],
    watchFor: ["Ignoring a clear red flag for quick validation", "Checking an ex's activity or old messages",
      "Fixating on response times"],
    frictionPatterns: ["Overthinking", "No motivation"]
  },
  sexuality_identity: {
    habits: ["Write privately about what felt true today", "Name one boundary you want to hold this week"],
    skills: ["Self-understanding", "Communicating boundaries"],
    watchFor: ["Pressuring yourself to have an answer right away", "Comparing your timeline to someone else's"],
    frictionPatterns: ["Overthinking", "Avoidance"]
  },
  social_life: {
    habits: ["Initiate one short conversation today", "Hold eye contact for a few seconds in one interaction",
      "Message one friend you haven't spoken to in a while"],
    skills: ["Conversation initiation", "Active listening"],
    watchFor: ["Using your phone as a social shield", "Replaying an interaction on a loop afterward"],
    frictionPatterns: ["Distraction", "Don't know where to start"]
  },
  digital_life: {
    habits: ["No phone in the first 20 minutes of the day", "Use grayscale mode during work/study hours",
      "One screen-free hour before bed"],
    skills: ["Attention control", "Digital boundaries"],
    watchFor: ["Checking notifications the instant you wake up", "Opening an app out of boredom, not intent"],
    frictionPatterns: ["Distraction", "Phone dependence"]
  },
  money_independence: {
    habits: ["Log every purchase for the day", "Wait 24 hours before a non-essential purchase",
      "Review spending once a week"],
    skills: ["Budgeting", "Delayed gratification"],
    watchFor: ["Buying something to match what others have", "Avoiding looking at your balance"],
    frictionPatterns: ["Avoidance", "Overspending"]
  },
  school_career: {
    habits: ["Study in one uninterrupted 25-minute block", "Spend 15 minutes on your portfolio or resume",
      "Write tomorrow's top study priority tonight"],
    skills: ["Time management", "Deep work"],
    watchFor: ["Opening social apps mid-study session", "Waiting for motivation instead of starting"],
    frictionPatterns: ["Distraction", "Poor time management"]
  },
  lifestyle: {
    habits: ["Lights out by a consistent time", "20-minute walk outside", "Drink water before your first coffee"],
    skills: ["Routine building", "Energy management"],
    watchFor: ["Staying up scrolling past your bedtime target", "Skipping meals when busy"],
    frictionPatterns: ["Fatigue", "Inconsistent routines"]
  },
  emotional_regulation: {
    habits: ["10-minute decompression after a stressful event", "Note today's emotional trigger in one line",
      "Pause 10 seconds before responding when upset"],
    skills: ["Emotional regulation", "De-escalation"],
    watchFor: ["Responding immediately while still activated", "Holding a grudge instead of naming it"],
    frictionPatterns: ["Overthinking", "Difficulty calming down"]
  },
  purpose_life: {
    habits: ["Spend 20 minutes on a long-term goal", "Weekly review of what mattered this week",
      "Read 10 pages toward something you care about"],
    skills: ["Self-reflection", "Long-term thinking"],
    watchFor: ["Chasing short-term distraction over long-term goals", "Letting fear of failure stall a start"],
    frictionPatterns: ["Lack of motivation", "Don't know where to start"]
  }
};

const FRICTION_REASONS = ["Fatigue", "Forgot", "Busy", "No motivation", "Distraction", "Too difficult",
  "Poor planning", "Unexpected event", "Environment", "Overthinking", "Avoidance", "Other"];

const INTERVENTIONS = {
  "Fatigue": "Consider moving this habit to a higher-energy part of your day.",
  "Forgot": "Try attaching it to an existing routine, or setting a reminder.",
  "Busy": "Create a smaller version that fits into a 10\u201315 minute window.",
  "No motivation": "Lower the bar for today \u2014 a token version still counts as adjusted.",
  "Distraction": "Remove the most immediate source of distraction before starting.",
  "Too difficult": "Break it into a smaller first step you can't say no to.",
  "Poor planning": "Decide the exact time and place the night before.",
  "Unexpected event": "Build a little slack into your week for the unplannable.",
  "Environment": "Change your surroundings so the habit is the easy option.",
  "Overthinking": "Set a 2-minute timer and start before you're ready.",
  "Avoidance": "Name what you're avoiding, then do the smallest piece of it.",
  "Other": "Log what happened \u2014 patterns often show up after a few entries."
};

/* -------------------------------------------------------------------------
   STATE SHAPE
   users[userId] = {
     id, name, avatar, accessCode, createdAt, lastSeen, onboarded,
     habits: [{id,name,description,category,frequency:{type,days},createdAt,active,reminder}],
     completions: { "habitId__YYYY-MM-DD": "done"|"adjusted"|"missed" },
     skills: [{id,name,description,progress,hours,relatedProblem,evidence:[{id,date,text}]}],
     friction: [{id,habitId,habitNameSnapshot,date,reason,note}],
     watchFor: [string],
     priorities: [{key,catId,label,isTop}],   -- feeds Today's Challenge
     onboardingSelections: { problems, blockers, completedAt },
     weeklyReviews: [{weekKey,reflection,answers,createdAt,snapshot}],
     challenges: { "YYYY-MM-DD": {habitId, text, completed} },
     settings: { appearance, notifications:{...}, privacy:{...} }
   }
   No `groups` — OnTrack is a personal product, not a social one.
   ------------------------------------------------------------------------- */
function defaultState() {
  return {
    version: 3,
    session: { activeUserId: null },
    users: {}
  };
}

let state = defaultState();
let pendingMissCell = null;
let onboard = { step: 1, problems: [], priorities: [], blockers: [] };
let currentTab = 'today';
let habitsSubTab = 'grid'; // 'grid' | 'skills'

const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth() + 1;

/* ---------- ID generation ---------- */
function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function genUuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ---------- Date helpers ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function dateKey(year, month, day) { return `${year}-${pad2(month)}-${pad2(day)}`; }
function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function todayKey() { const d = new Date(); return dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
function parseDateKey(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
function isoWeekKey(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const week1 = new Date(dt.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((dt - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${dt.getFullYear()}-W${pad2(weekNo)}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* =========================================================================
   DATA LAYER — StorageAdapter + SupabaseAdapter + DataStore

     UI  →  OnTrack logic  →  DataStore  →  Adapter  →  localStorage / Supabase

   DataStore picks StorageAdapter (localStorage) by default. If
   supabase-config.js provides a URL + anon key, DataStore instead uses
   SupabaseAdapter, and localStorage becomes a local cache the app reads
   instantly on load while the network round-trip completes. This file
   never hardcodes credentials — see supabase-config.js and SETUP.md.
   ========================================================================= */
const StorageAdapter = {
  read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(`Could not read "${key}" from local storage.`, err);
      return null;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`Could not write "${key}" to local storage.`, err);
      return false;
    }
  },
  readRaw(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  },
  writeRaw(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (err) { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; } catch (err) { return false; }
  }
};

/* ---------- Supabase adapter (only active once fully configured) ----------
   supabase-config.js defines window.ONTRACK_SUPABASE_CONFIG =
   { url, anonKey, accountFunctionUrl }. Until all three are filled in,
   isSupabaseConfigured() is false and the app runs entirely on
   StorageAdapter (localStorage), exactly as before.

   Auth model: no anonymous Supabase Auth. Anonymous sessions are tied to
   one browser and can't be "logged into" from another device, which is
   exactly what Access Codes need to do — so every OnTrack account is a
   real (non-anonymous) Supabase Auth user, identified by a system-
   generated email the person never sees or types. Sign-in happens via a
   server-minted magic-link token (Edge Function `account`, using only
   documented Admin APIs: createUser / generateLink / getUserById),
   redeemed client-side with the public, documented
   supabase.auth.verifyOtp() call. See SETUP.md for the full writeup. */
function isSupabaseConfigured() {
  const cfg = window.ONTRACK_SUPABASE_CONFIG;
  return !!(cfg && cfg.url && cfg.anonKey && cfg.accountFunctionUrl
    && !cfg.url.includes('YOUR_') && !cfg.anonKey.includes('YOUR_'));
}

let supabaseClient = null;
function getSupabaseClient() {
  const cfg = window.ONTRACK_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey) return null;
  if (supabaseClient) return supabaseClient;
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('Supabase config is set but the supabase-js library did not load.');
    return null;
  }
  supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
  return supabaseClient;
}

// Calls the `account` Edge Function. Never touches the service_role key —
// that only exists server-side. Returns { ok, data } or { ok:false, status, error }.
async function callAccountFunction(action, payload, authToken) {
  const cfg = window.ONTRACK_SUPABASE_CONFIG;
  if (!cfg || !cfg.accountFunctionUrl) return { ok: false, status: 0, error: 'not_configured' };
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(cfg.accountFunctionUrl, {
      method: 'POST', headers, body: JSON.stringify({ action, ...payload })
    });
    let body = null;
    try { body = await res.json(); } catch (err) { /* non-JSON error body */ }
    if (!res.ok) return { ok: false, status: res.status, error: (body && body.error) || 'request_failed' };
    return { ok: true, data: body };
  } catch (err) {
    console.error(`account function call ("${action}") failed`, err);
    return { ok: false, status: 0, error: 'network_error' };
  }
}

/* Maps between this app's in-memory user shape (unchanged from the
   localStorage era, so every render/calc function keeps working as-is)
   and the normalized Supabase tables described in supabase-schema.sql. */
const SupabaseAdapter = {
  async getSessionUserId() {
    const sb = getSupabaseClient();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.user.id : null;
  },

  async signOut() {
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
  },

  // Exchanges a server-minted magic-link token for a real client session.
  // This is the one documented, public API that turns "the Edge Function
  // vouched for this email" into an actual signed-in Supabase session —
  // no service_role key or undocumented admin call on the client side.
  async establishSession(email, tokenHash) {
    const sb = getSupabaseClient();
    if (!sb) return { ok: false, reason: 'no_client' };
    const { error } = await sb.auth.verifyOtp({ email, token_hash: tokenHash, type: 'magiclink' });
    if (error) { console.error('verifyOtp failed', error); return { ok: false, reason: 'session_failed' }; }
    return { ok: true };
  },

  // ---- New cloud account. Optionally migrates an existing local user's
  // data up immediately afterward (see migrateLocalUserToCloud). ----
  async createCloudAccount() {
    const result = await callAccountFunction('create', {});
    if (!result.ok || !result.data) return { ok: false, reason: result.error || 'create_failed' };
    const { accessCode, userId, email, tokenHash } = result.data;
    const session = await this.establishSession(email, tokenHash);
    if (!session.ok) return session;
    return { ok: true, userId, accessCode };
  },

  // ---- Cross-device login by Access Code. ----
  async redeemAccessCode(code) {
    const result = await callAccountFunction('redeem', { code });
    if (!result.ok) {
      if (result.status === 429) return { ok: false, reason: 'rate_limited' };
      if (result.status === 404 || result.status === 400) return { ok: false, reason: 'invalid_code' };
      return { ok: false, reason: result.error || 'redeem_failed' };
    }
    const { userId, email, tokenHash } = result.data;
    const session = await this.establishSession(email, tokenHash);
    if (!session.ok) return session;
    return { ok: true, userId };
  },

  // ---- Issue a new code for the CURRENTLY authenticated account only.
  // The Edge Function verifies the bearer token server-side; it cannot be
  // used to change another account's code. ----
  async regenerateAccessCode() {
    const sb = getSupabaseClient();
    if (!sb) return { ok: false, reason: 'no_client' };
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData && sessionData.session && sessionData.session.access_token;
    if (!token) return { ok: false, reason: 'unauthenticated' };
    const result = await callAccountFunction('regenerate', {}, token);
    if (!result.ok) return { ok: false, reason: result.error || 'regenerate_failed' };
    return { ok: true, accessCode: result.data.accessCode };
  },

  // ---- Full profile fetch: reassembles the normalized tables back into
  // this app's existing nested user object shape. `knownAccessCode` is
  // the plaintext code from this same create/redeem/regenerate call, if
  // any — the server never stores or returns plaintext codes, so this is
  // the only way `user.accessCode` gets populated (see the note in
  // SETUP.md on why codes aren't retrievable after the fact). ----
  async fetchProfileState(userId, knownAccessCode) {
    const sb = getSupabaseClient();
    if (!sb) return { ok: false, reason: 'no_client' };
    const [profileRes, habitsRes, complRes, frictionRes, prioritiesRes, skillsRes, reviewsRes, challengesRes] = await Promise.all([
      sb.from('profiles').select('*').eq('id', userId).single(),
      sb.from('habits').select('*').eq('user_id', userId),
      sb.from('habit_completions').select('*').eq('user_id', userId),
      sb.from('friction_items').select('*').eq('user_id', userId),
      sb.from('priorities').select('*').eq('user_id', userId),
      sb.from('skills').select('*').eq('user_id', userId),
      sb.from('weekly_reviews').select('*').eq('user_id', userId),
      sb.from('challenges').select('*').eq('user_id', userId)
    ]);
    const failures = [profileRes, habitsRes, complRes, frictionRes, prioritiesRes, skillsRes, reviewsRes, challengesRes]
      .filter(r => r.error).map(r => r.error.message);
    if (profileRes.error || !profileRes.data) {
      console.error('Could not fetch cloud profile', profileRes.error);
      return { ok: false, reason: 'fetch_failed', detail: profileRes.error };
    }
    if (failures.length) {
      console.error('Some cloud tables failed to load', failures);
      return { ok: false, reason: 'partial_fetch_failed', detail: failures };
    }
    const p = profileRes.data;

    const user = newUserShell(p.name);
    user.id = p.id;
    user.accessCode = knownAccessCode || null;
    user.avatar = p.avatar_url || null;
    user.createdAt = new Date(p.created_at).getTime();
    user.lastSeen = p.last_seen ? new Date(p.last_seen).getTime() : null;
    user.onboarded = !!p.onboarded;
    user.settings = p.settings || user.settings;
    user.cloudSynced = true;
    user.lastSyncedAt = p.last_synced_at ? new Date(p.last_synced_at).getTime() : null;

    user.habits = (habitsRes.data || []).map(h => ({
      id: h.id, name: h.name, description: h.description || '', category: h.category || '',
      frequency: h.frequency || { type: 'daily' }, createdAt: new Date(h.created_at).getTime(),
      active: h.active !== false, reminder: h.reminder || null
    }));

    user.completions = {};
    (complRes.data || []).forEach(c => { user.completions[`${c.habit_id}__${c.date}`] = c.status; });

    user.friction = (frictionRes.data || []).map(f => ({
      id: f.id, habitId: f.habit_id, habitNameSnapshot: f.habit_name_snapshot || '',
      date: f.date, reason: f.reason, note: f.note || ''
    }));

    user.priorities = (prioritiesRes.data || []).map(pr => ({
      key: `${pr.category}::${pr.label}`, catId: pr.category, label: pr.label, isTop: !!pr.is_top
    }));

    user.skills = (skillsRes.data || []).map(s => ({
      id: s.id, name: s.name, description: s.description || '', progress: s.progress || 0,
      hours: s.hours || 0, relatedProblem: s.related_problem || '', evidence: s.evidence || []
    }));

    user.weeklyReviews = (reviewsRes.data || []).map(r => ({
      weekKey: r.week_key, reflection: r.reflection || '', answers: r.answers || {},
      createdAt: new Date(r.created_at).getTime(), snapshot: r.snapshot || {}
    }));

    user.challenges = {};
    (challengesRes.data || []).forEach(c => {
      user.challenges[c.date] = { habitId: c.habit_id, text: c.text, completed: !!c.completed };
    });

    return { ok: true, user };
  },

  // ---- Push: upserts every collection and CHECKS every response. Unlike
  // the earlier version, a failure here is never swallowed — the caller
  // gets back exactly which tables failed, so the UI can say so instead
  // of claiming "Saved" when the cloud write didn't actually happen. ----
  async pushFullState(user) {
    const sb = getSupabaseClient();
    if (!sb) return { ok: false, failedTables: ['(no client)'] };
    const failedTables = [];
    const record = async (table, promise) => {
      const { error } = await promise;
      if (error) { console.error(`Cloud sync failed writing "${table}"`, error); failedTables.push(table); }
    };

    await record('profiles', sb.from('profiles').upsert({
      id: user.id, name: user.name, avatar_url: user.avatar,
      onboarded: user.onboarded, settings: user.settings,
      last_seen: new Date().toISOString(), last_synced_at: new Date().toISOString()
    }));

    if (user.habits.length) {
      await record('habits', sb.from('habits').upsert(user.habits.map(h => ({
        id: h.id, user_id: user.id, name: h.name, description: h.description, category: h.category,
        frequency: h.frequency, active: h.active, reminder: h.reminder,
        created_at: new Date(h.createdAt).toISOString(), updated_at: new Date().toISOString()
      }))));
    }

    const complRows = Object.keys(user.completions).map(key => {
      const [habitId, date] = key.split('__');
      return { user_id: user.id, habit_id: habitId, date, status: user.completions[key], updated_at: new Date().toISOString() };
    });
    if (complRows.length) {
      await record('habit_completions', sb.from('habit_completions').upsert(complRows, { onConflict: 'habit_id,date' }));
    }

    if (user.friction.length) {
      await record('friction_items', sb.from('friction_items').upsert(user.friction.map(f => ({
        id: f.id, user_id: user.id, habit_id: f.habitId, habit_name_snapshot: f.habitNameSnapshot,
        date: f.date, reason: f.reason, note: f.note
      }))));
    }

    if (user.priorities && user.priorities.length) {
      await record('priorities', sb.from('priorities').upsert(user.priorities.map(pr => ({
        user_id: user.id, category: pr.catId, label: pr.label, is_top: !!pr.isTop
      })), { onConflict: 'user_id,category,label' }));
    }

    if (user.skills.length) {
      await record('skills', sb.from('skills').upsert(user.skills.map(s => ({
        id: s.id, user_id: user.id, name: s.name, description: s.description, progress: s.progress,
        hours: s.hours, related_problem: s.relatedProblem, evidence: s.evidence, updated_at: new Date().toISOString()
      }))));
    }

    if (user.weeklyReviews.length) {
      await record('weekly_reviews', sb.from('weekly_reviews').upsert(user.weeklyReviews.map(r => ({
        user_id: user.id, week_key: r.weekKey, reflection: r.reflection, answers: r.answers || {},
        snapshot: r.snapshot
      })), { onConflict: 'user_id,week_key' }));
    }

    const challengeRows = Object.keys(user.challenges || {}).map(date => ({
      user_id: user.id, date, habit_id: user.challenges[date].habitId,
      text: user.challenges[date].text, completed: !!user.challenges[date].completed
    }));
    if (challengeRows.length) {
      await record('challenges', sb.from('challenges').upsert(challengeRows, { onConflict: 'user_id,date' }));
    }

    return { ok: failedTables.length === 0, failedTables };
  }
};

/* ---------- DataStore ----------
   The single seam everything else talks to. Local writes always hit
   StorageAdapter first so the app is instantly usable and never blocks on
   the network. When a cloud session exists, every save also (debounced)
   pushes to Supabase and the result — success, partial failure, or
   offline — is tracked on state.session.syncStatus so the UI can be
   honest about it instead of always claiming "Saved." */
const DataStore = {
  adapter: StorageAdapter,

  loadState() {
    const parsed = this.adapter.read(STORAGE_KEY);
    if (parsed && parsed.users) return parsed;
    return null;
  },
  saveState(nextState) {
    const ok = this.adapter.write(STORAGE_KEY, nextState);
    this.maybeSyncToCloud();
    return ok;
  },

  getSessionUserId() { return this.adapter.readRaw(SESSION_KEY); },
  setSessionUserId(userId) { return this.adapter.writeRaw(SESSION_KEY, userId); },
  clearSession() { return this.adapter.remove(SESSION_KEY); },

  readLegacyState() { return this.adapter.read(LEGACY_DATA_KEY); },
  readLegacySessionKey() { return this.adapter.readRaw(LEGACY_SESSION_KEY); },
  clearLegacy() { this.adapter.remove(LEGACY_DATA_KEY); this.adapter.remove(LEGACY_SESSION_KEY); },

  // Debounced push to Supabase so a burst of local saves (ticking off
  // several habits in a row) doesn't spam the network. Not awaited by
  // callers — the local write already happened — but the OUTCOME is
  // recorded and reflected in the UI, never silently discarded.
  _syncTimer: null,
  maybeSyncToCloud() {
    if (!isSupabaseConfigured()) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(async () => {
      const u = getUser();
      if (!u || !u.cloudSynced) return;
      const sessionUserId = await SupabaseAdapter.getSessionUserId();
      if (sessionUserId !== u.id) {
        // The local "active" user no longer matches the authenticated
        // Supabase session (e.g. signed out elsewhere). Never push under
        // the wrong identity.
        setSyncStatus('signed_out');
        return;
      }
      const result = await SupabaseAdapter.pushFullState(u);
      setSyncStatus(result.ok ? 'synced' : 'error', result.failedTables);
    }, 1200);
  }
};

// Tracks and surfaces cloud sync outcome. 'local' = no cloud account on
// this profile at all (fully expected, not an error).
let syncStatus = { state: 'local', failedTables: [], at: null };
function setSyncStatus(newState, failedTables) {
  syncStatus = { state: newState, failedTables: failedTables || [], at: Date.now() };
  if (currentTab === 'profile') populateProfileForm();
}


/* =========================================================================
   PERSISTENCE + MIGRATION
   ========================================================================= */
function saveData() {
  return DataStore.saveState(state);
}

function loadData() {
  const parsed = DataStore.loadState();
  if (parsed) {
    state = parsed;
    backfillAccessCodes();
    return true;
  }
  return false;
}

/* ---------- Access codes ----------
   A short, human-typeable code that identifies an account. Format
   OT-XXXX-XXXX (letters/digits, ambiguous characters like 0/O/1/I/L
   excluded) so it reads clearly out loud or off a screen. */
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateAccessCodeCandidate() {
  const block = () => {
    let s = '';
    for (let i = 0; i < 4; i++) s += ACCESS_CODE_ALPHABET[Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length)];
    return s;
  };
  return `OT-${block()}-${block()}`;
}

function genAccessCode() {
  let code = generateAccessCodeCandidate();
  let guard = 0;
  while (Object.values(state.users).some(u => u.accessCode === code) && guard < 50) {
    code = generateAccessCodeCandidate();
    guard++;
  }
  return code;
}

function backfillAccessCodes() {
  let changed = false;
  Object.values(state.users).forEach(u => {
    if (!u.accessCode) { u.accessCode = genAccessCode(); changed = true; }
  });
  if (changed) saveData();
}

function findUserByAccessCode(code) {
  const norm = String(code || '').trim().toUpperCase();
  if (!norm) return null;
  return Object.values(state.users).find(u => u.accessCode === norm) || null;
}

function newUserShell(name) {
  return {
    id: genId('user'),
    name: name || 'You',
    avatar: null,
    accessCode: null,
    createdAt: Date.now(),
    lastSeen: null,
    onboarded: false,
    cloudSynced: false,
    lastSyncedAt: null,
    habits: [],
    completions: {},
    skills: [],
    friction: [],
    watchFor: [],
    priorities: [],
    onboardingSelections: null,
    weeklyReviews: [],
    challenges: {},
    settings: {
      appearance: 'system',
      notifications: { habitReminders: true, challengeReminders: true, weeklyReview: true, dailyCheckin: false },
      privacy: { dataVisibility: true }
    }
  };
}

/* Legacy schema (v1, pre-rebuild): a single 'four_keys_data' key with
   hardcoded friend1..friend8 profiles, index-based habit logs, and a
   stake system. We migrate what we reasonably can and discard the rest
   (stake data, unused demo slots) rather than silently destroying real
   history. */
const LEGACY_KEYS = {
  "AX7K2M": "user", "BQ4L9P": "friend1", "CR8N3T": "friend2", "DZ5V6H": "friend3",
  "EY1J8R": "friend4", "FW3S2L": "friend5", "GH2M7X": "friend6", "JK9P4L": "friend7",
  "MN6R1Q": "friend8"
};
const LEGACY_KEYS_REVERSE = Object.fromEntries(Object.entries(LEGACY_KEYS).map(([code, pKey]) => [pKey, code]));

function migrateLegacyIfPresent() {
  let legacyRaw;
  try {
    legacyRaw = localStorage.getItem(LEGACY_DATA_KEY);
  } catch (err) {
    return false;
  }
  if (!legacyRaw) return false;

  let legacy;
  try {
    legacy = JSON.parse(legacyRaw);
  } catch (err) {
    console.error('Legacy OnTrack data was unreadable; skipping migration.', err);
    return false;
  }
  if (!legacy || !legacy.profiles) return false;

  let lastSessionCode = null;
  try { lastSessionCode = localStorage.getItem(LEGACY_SESSION_KEY); } catch (err) { /* ignore */ }
  const lastSessionProfileKey = lastSessionCode ? LEGACY_KEYS[lastSessionCode] : null;

  let migratedAny = false;
  let firstMigratedUserId = null;

  Object.keys(legacy.profiles).forEach(pKey => {
    const oldProfile = legacy.profiles[pKey];
    if (!oldProfile) return;
    if (/^friend\d+$/.test(pKey) && !oldProfile.onboarded) return;
    if (!oldProfile.onboarded && !(oldProfile.habits && oldProfile.habits.length)) return;

    const user = newUserShell(oldProfile.name || 'Migrated profile');
    user.avatar = oldProfile.avatar || null;
    user.onboarded = !!oldProfile.onboarded;
    user.lastSeen = oldProfile.lastSeen || null;
    user.accessCode = LEGACY_KEYS_REVERSE[pKey] || genAccessCode();

    const idxToId = {};
    (oldProfile.habits || []).forEach((habitName, idx) => {
      const h = {
        id: genUuid(), name: habitName, description: '', category: '',
        frequency: { type: 'daily' }, createdAt: Date.now(), active: true, reminder: null
      };
      user.habits.push(h);
      idxToId[idx] = h.id;
    });

    const statusMap = { '\u2713': STATUS.DONE, '~': STATUS.ADJUSTED, '\u2715': STATUS.MISSED };
    Object.keys(oldProfile.logs || {}).forEach(key => {
      const parts = key.split('-');
      if (parts.length !== 4) return;
      const [hIdxStr, y, m, d] = parts;
      const habitId = idxToId[Number(hIdxStr)];
      if (!habitId) return;
      const status = statusMap[oldProfile.logs[key]];
      if (!status) return;
      user.completions[`${habitId}__${dateKey(Number(y), Number(m), Number(d))}`] = status;
    });

    (oldProfile.skills || []).forEach(s => {
      user.skills.push({
        id: genUuid(), name: s.name || 'Skill', description: '',
        progress: s.progress || 0, hours: s.hours || 0, relatedProblem: '', evidence: []
      });
    });

    (oldProfile.friction || []).forEach(f => {
      if (f && f.seed) {
        if (f.reason) user.watchFor.push(f.reason);
        return;
      }
      if (!f || !f.date) return;
      const habitId = f.habit ? (user.habits.find(h => h.name === f.habit) || {}).id : null;
      user.friction.push({
        id: genUuid(), habitId: habitId || null, habitNameSnapshot: f.habit || '',
        date: f.date, reason: f.reason || 'Other', note: ''
      });
    });

    // Discard: stake settings/history, group membership. No equivalent —
    // and none needed, per the current product direction.
    state.users[user.id] = user;
    migratedAny = true;

    if (pKey === lastSessionProfileKey || (!firstMigratedUserId && user.onboarded)) {
      firstMigratedUserId = user.id;
    }
  });

  if (migratedAny) {
    state.session.activeUserId = firstMigratedUserId || Object.values(state.users)[0].id;
    saveData();
    DataStore.clearLegacy();
  }
  return migratedAny;
}

// v2 -> v3 in-place migration: drops the removed `groups` collection and
// each user's group-only fields (groupId, activityLog, old onboarding
// impact ratings, the old 5-item priority cap) without touching anything
// else. Existing habits/completions/skills/friction/IDs are untouched.
function migrateV2ToV3IfNeeded() {
  if (!state || state.version >= 3) return false;
  delete state.groups;
  Object.values(state.users || {}).forEach(u => {
    delete u.groupId;
    delete u.activityLog;
    if (!Array.isArray(u.priorities)) {
      const sel = u.onboardingSelections;
      u.priorities = (sel && Array.isArray(sel.priorities))
        ? sel.priorities.map(key => {
          const [catId, ...rest] = String(key).split('::');
          return { key, catId, label: rest.join('::'), isTop: true };
        })
        : [];
    }
    if (u.onboardingSelections) delete u.onboardingSelections.impact;
    if (!u.challenges) u.challenges = {};
    if (u.settings && u.settings.notifications) {
      delete u.settings.notifications.groupActivity;
      if (u.settings.notifications.challengeReminders === undefined) u.settings.notifications.challengeReminders = true;
    }
    if (u.settings) {
      u.settings.privacy = { dataVisibility: true };
    }
  });
  state.version = 3;
  saveData();
  return true;
}

function getUser() {
  return state.users[state.session.activeUserId] || null;
}

function touchLastSeen() {
  const u = getUser();
  if (!u) return;
  u.lastSeen = Date.now();
  saveData();
}

/* =========================================================================
   HABIT DUE / CONSISTENCY / STREAK — single source of truth.
   Today, Habits, Progress, and habit detail all call these same functions
   so the numbers never disagree with each other.
   ========================================================================= */
function isHabitDue(habit, date) {
  if (!habit.frequency || habit.frequency.type === 'daily') return true;
  if (habit.frequency.type === 'weekly') {
    const days = habit.frequency.days || [];
    return days.length === 0 ? true : days.includes(date.getDay());
  }
  return true;
}

function getCompletion(user, habitId, dStr) {
  return user.completions[`${habitId}__${dStr}`] || null;
}

function setCompletion(user, habitId, dStr, status) {
  const key = `${habitId}__${dStr}`;
  if (status) user.completions[key] = status;
  else delete user.completions[key];
}

function habitDueDatesInRange(habit, to) {
  const dates = [];
  const start = new Date(habit.createdAt);
  start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : new Date();
  end.setHours(0, 0, 0, 0);
  if (end < start) return dates;
  let cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 3660) {
    if (isHabitDue(habit, cursor)) dates.push(new Date(cursor));
    cursor = addDays(cursor, 1);
    guard++;
  }
  return dates;
}

function calcConsistency(user, opts) {
  opts = opts || {};
  const habits = opts.habitId
    ? [user.habits.find(h => h.id === opts.habitId)].filter(Boolean)
    : user.habits.filter(h => h.active !== false);

  let expected = 0, done = 0, adjusted = 0, missed = 0;
  habits.forEach(habit => {
    let dueDates = habitDueDatesInRange(habit, opts.to);
    if (opts.from) {
      const fromTime = new Date(opts.from).setHours(0, 0, 0, 0);
      dueDates = dueDates.filter(d => d.getTime() >= fromTime);
    }
    dueDates.forEach(d => {
      const dStr = dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const status = getCompletion(user, habit.id, dStr);
      expected++;
      if (status === STATUS.DONE) done++;
      else if (status === STATUS.ADJUSTED) adjusted++;
      else if (status === STATUS.MISSED) missed++;
    });
  });

  if (expected === 0) return null;
  const pct = Math.round(((done + adjusted) / expected) * 100);
  return { pct, expected, done, adjusted, missed };
}

function calcCurrentStreak(user, habitId) {
  const habit = user.habits.find(h => h.id === habitId);
  if (!habit) return 0;
  const createdDate = new Date(habit.createdAt);
  createdDate.setHours(0, 0, 0, 0);
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const isToday = (d) => d.getTime() === new Date().setHours(0, 0, 0, 0);
  let streak = 0;
  let guard = 0;
  while (cursor >= createdDate && guard < 3660) {
    guard++;
    if (isHabitDue(habit, cursor)) {
      const dStr = dateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
      const status = getCompletion(user, habit.id, dStr);
      if (status === STATUS.DONE || status === STATUS.ADJUSTED) {
        streak++;
      } else if (isToday(cursor) && !status) {
        // give today the benefit of the doubt, keep walking backward
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function calcLongestStreak(user, habitId) {
  const habit = user.habits.find(h => h.id === habitId);
  if (!habit) return 0;
  const dueDates = habitDueDatesInRange(habit, new Date());
  let longest = 0, run = 0;
  dueDates.forEach(d => {
    const dStr = dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const status = getCompletion(user, habit.id, dStr);
    if (status === STATUS.DONE || status === STATUS.ADJUSTED) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  });
  return longest;
}

function overallCleanDaySet(user) {
  if (user.habits.length === 0) return new Set();
  const earliest = user.habits.reduce((min, h) => Math.min(min, h.createdAt), Date.now());
  const start = new Date(earliest);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const clean = new Set();
  let cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 3660) {
    guard++;
    const dStr = dateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const dueHabits = user.habits.filter(h => new Date(h.createdAt).setHours(0, 0, 0, 0) <= cursor.getTime() && isHabitDue(h, cursor));
    if (dueHabits.length > 0) {
      const allGood = dueHabits.every(h => {
        const s = getCompletion(user, h.id, dStr);
        return s === STATUS.DONE || s === STATUS.ADJUSTED;
      });
      if (allGood) clean.add(dStr);
    }
    cursor = addDays(cursor, 1);
  }
  return clean;
}

function calcOverallStreaks(user) {
  const cleanDates = overallCleanDaySet(user);
  if (cleanDates.size === 0) return { current: 0, longest: 0 };
  const sorted = [...cleanDates].sort();
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round((parseDateKey(sorted[i]) - parseDateKey(sorted[i - 1])) / 86400000);
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const key = dateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    if (cleanDates.has(key)) { current++; cursor = addDays(cursor, -1); } else break;
  }
  return { current, longest };
}

function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Never';
  const diffMs = Date.now() - lastSeen;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(lastSeen);
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/* =========================================================================
   INIT / SESSION / ACCESS SCREEN
   Local-first: always shows something instantly from the local cache. If
   Supabase is configured, "I already have an account" additionally tries
   a real cross-device code redemption before falling back to the local
   profile list.
   ========================================================================= */
function hideSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('splash-hide');
  setTimeout(() => splash.remove(), 450);
}

function showSplashStatus(text) {
  const el = document.querySelector('.splash-tagline');
  if (el) el.textContent = text;
}

// Cloud hydration is sequenced, not fire-and-forget: if a Supabase
// session exists, its data is fetched and applied to `state` BEFORE the
// app renders anything, so the UI never shows local data and then
// silently swaps it out later. If the fetch fails, the person sees a
// clear retry/offline choice instead of stale data presented as current.
async function hydrateFromCloudIfSignedIn() {
  if (!isSupabaseConfigured()) return { status: 'not_configured' };
  const sb = getSupabaseClient();
  if (!sb) return { status: 'not_configured' };

  const { data: sessionData } = await sb.auth.getSession();
  const cloudUserId = sessionData && sessionData.session ? sessionData.session.user.id : null;
  if (!cloudUserId) return { status: 'no_session' };

  showSplashStatus('Loading your account\u2026');
  const result = await SupabaseAdapter.fetchProfileState(cloudUserId);
  if (!result.ok) {
    console.error('Cloud hydration failed', result);
    return { status: 'error', reason: result.reason };
  }

  // The cloud session is authoritative: it replaces whatever local
  // profile the device previously had active, rather than the two
  // silently coexisting (requirement: never show User B locally while
  // the Supabase session is still User A).
  const cloudUser = result.user;
  const cached = state.users[cloudUser.id];
  if (cached && cached.accessCode && !cloudUser.accessCode) cloudUser.accessCode = cached.accessCode;
  state.users[cloudUser.id] = cloudUser;
  state.session.activeUserId = cloudUser.id;
  saveData();
  setSyncStatus('synced');
  return { status: 'ok' };
}

async function init() {
  loadData();
  migrateLegacyIfPresent();
  migrateV2ToV3IfNeeded();
  backfillAccessCodes();
  setupEventListeners();
  setupCrossTabSync();
  applyAppearance();
  registerServiceWorker();

  const minSplash = new Promise(resolve => setTimeout(resolve, 550));
  const hydration = hydrateFromCloudIfSignedIn();
  const [, hydrationResult] = await Promise.all([minSplash, hydration]);

  if (hydrationResult.status === 'ok') {
    afterLogin();
  } else if (hydrationResult.status === 'error') {
    hideSplash();
    renderCloudErrorScreen(hydrationResult.reason);
  } else {
    // 'no_session' or 'not_configured' -> local/offline mode, as designed.
    const sessionUserId = DataStore.getSessionUserId();
    if (sessionUserId && state.users[sessionUserId]) {
      state.session.activeUserId = sessionUserId;
      afterLogin();
    } else if (state.session.activeUserId && state.users[state.session.activeUserId]) {
      afterLogin();
    } else {
      renderAccessScreen();
    }
  }
  hideSplash();
}

function renderCloudErrorScreen(reason) {
  const accessScreen = document.getElementById('access-screen');
  accessScreen.classList.remove('hidden');
  accessScreen.style.display = 'flex';
  const card = document.getElementById('access-card');
  card.innerHTML = `
    <p class="eyebrow">Connection problem</p>
    <h1 class="auth-title">Couldn't load your account</h1>
    <p class="auth-sub">Your data is safe in your cloud account, but this device couldn't reach it just now${reason ? ` (${escapeHtml(String(reason))})` : ''}. Check your connection and try again.</p>
    <button type="button" class="btn-primary mt-14" id="cloud-retry-btn">Try again</button>
    <button type="button" class="btn-secondary full-width mt-10" id="cloud-signout-btn">Sign out and use this device locally</button>
  `;
  document.getElementById('cloud-retry-btn').addEventListener('click', () => location.reload());
  document.getElementById('cloud-signout-btn').addEventListener('click', async () => {
    await SupabaseAdapter.signOut();
    state.session.activeUserId = null;
    DataStore.clearSession();
    renderAccessScreen();
  });
}

function afterLogin() {
  const u = getUser();
  if (!u) { renderAccessScreen(); return; }
  u.lastSeen = Date.now();
  DataStore.setSessionUserId(u.id);
  saveData();
  showApp();
}

function renderAccessScreen(isSwitch) {
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('onboarding-screen').classList.add('hidden');
  const accessScreen = document.getElementById('access-screen');
  accessScreen.classList.remove('hidden');
  accessScreen.style.display = 'flex';

  const users = Object.values(state.users).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  const card = document.getElementById('access-card');

  if (users.length === 0 && !isSwitch) {
    renderCreateProfileForm(card, true);
    return;
  }

  card.innerHTML = `
    <p class="eyebrow">OnTrack</p>
    <h1 class="auth-title">${isSwitch ? 'Switch profile' : "Welcome back"}</h1>
    <p class="auth-sub">Choose a profile on this device, or use your access code to open a cloud account.</p>
    ${users.length ? `<div class="profile-picker-list">
      ${users.map(u => `
        <button type="button" class="profile-pick-btn" data-uid="${u.id}">
          <span class="avatar avatar-md">${avatarMarkup(u)}</span>
          <span class="profile-pick-name">${escapeHtml(u.name)}</span>
          <span class="profile-pick-badge ${u.cloudSynced ? 'is-cloud' : ''}">${u.cloudSynced ? 'Cloud' : 'Local only'}</span>
        </button>
      `).join('')}
    </div>` : '<p class="empty-note mb-8">No profiles on this device yet.</p>'}

    <button type="button" class="btn-secondary full-width" id="use-access-code-btn">Use Access Code</button>
    <button type="button" class="btn-primary mt-10" id="new-profile-btn">+ New profile</button>
  `;
  card.querySelectorAll('.profile-pick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await ensureCloudSignedOutIfSwitchingIdentity(btn.dataset.uid);
      state.session.activeUserId = btn.dataset.uid;
      afterLogin();
    });
  });
  document.getElementById('new-profile-btn').addEventListener('click', () => renderCreateProfileForm(card, false));
  document.getElementById('use-access-code-btn').addEventListener('click', () => renderAccessCodeEntry(card));
}

// Guards requirement #10: a local UI switch must never leave a stale
// Supabase session pointing at a different account than what's shown.
async function ensureCloudSignedOutIfSwitchingIdentity(targetLocalUserId) {
  if (!isSupabaseConfigured()) return;
  const sessionUserId = await SupabaseAdapter.getSessionUserId();
  if (sessionUserId && sessionUserId !== targetLocalUserId) {
    await SupabaseAdapter.signOut();
  }
}

function renderAccessCodeEntry(card) {
  const cloudNote = isSupabaseConfigured()
    ? "This opens your account from any device \u2014 the same data will appear here."
    : "Cross-device access codes need a connected Supabase account, which this deployment hasn't configured yet. A code created on this device will only work on this device for now.";
  card.innerHTML = `
    <p class="eyebrow">Use Access Code</p>
    <h1 class="auth-title">Enter your access code</h1>
    <p class="auth-sub">${cloudNote}</p>
    <input type="text" id="access-code-input" class="input-field access-code-field" placeholder="OT-XXXX-XXXX" maxlength="12" autocomplete="off">
    <button type="button" class="btn-primary" id="access-code-submit">Continue</button>
    <p id="access-code-error" class="error-msg hidden"></p>
    <button type="button" class="btn-secondary full-width mt-10" id="back-to-picker-btn">Back</button>
  `;
  document.getElementById('back-to-picker-btn').addEventListener('click', () => renderAccessScreen(true));
  wireAccessCodeSubmit();
}

async function wireAccessCodeSubmit() {
  const codeInput = document.getElementById('access-code-input');
  const submitBtn = document.getElementById('access-code-submit');
  if (!codeInput || !submitBtn) return;

  const submitCode = async () => {
    const raw = codeInput.value.trim();
    const errorEl = document.getElementById('access-code-error');
    errorEl.classList.add('hidden');

    // A profile created locally on THIS device (never connected to the
    // cloud) can still be reopened here without any network call.
    const localMatch = findUserByAccessCode(raw);
    if (localMatch && !localMatch.cloudSynced) {
      state.session.activeUserId = localMatch.id;
      afterLogin();
      return;
    }

    if (!isSupabaseConfigured()) {
      errorEl.textContent = "That access code didn't match a profile on this device.";
      errorEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking\u2026';
    const result = await SupabaseAdapter.redeemAccessCode(raw);
    if (!result.ok) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue';
      errorEl.textContent = result.reason === 'rate_limited'
        ? 'Too many attempts \u2014 try again in a few minutes.'
        : "That access code didn't match an account.";
      errorEl.classList.remove('hidden');
      return;
    }

    const fetchResult = await SupabaseAdapter.fetchProfileState(result.userId);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue';
    if (!fetchResult.ok) {
      errorEl.textContent = 'Signed in, but could not load your data. Check your connection and try again.';
      errorEl.classList.remove('hidden');
      return;
    }
    state.users[fetchResult.user.id] = fetchResult.user;
    state.session.activeUserId = fetchResult.user.id;
    setSyncStatus('synced');
    afterLogin();
  };

  submitBtn.addEventListener('click', submitCode);
  codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase(); });
  codeInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') submitCode(); });
}

function renderCreateProfileForm(card, isFirstEver) {
  card.innerHTML = `
    <p class="eyebrow">${isFirstEver ? 'Welcome' : 'New profile'}</p>
    <h1 class="auth-title">${isFirstEver ? 'Build the life you\u2019re working toward' : 'Create a profile'}</h1>
    <p class="auth-sub">${isFirstEver
      ? 'OnTrack helps you understand what matters, spot what\u2019s getting in the way, and actually do something about it. Give your profile a name to start.'
      : 'This creates a new, separate local profile on this device.'}</p>
    <input type="text" id="new-profile-name" class="input-field" style="text-align:left;letter-spacing:normal;" placeholder="Your name" autocomplete="off">
    <button id="create-profile-btn" type="button" class="btn-primary">Continue</button>
    <p id="profile-error" class="error-msg hidden">Enter a name to continue.</p>
    <button type="button" class="btn-secondary full-width mt-10" id="back-to-picker-btn">${isFirstEver ? 'Use Access Code instead' : 'Back'}</button>
  `;
  const submit = () => {
    const val = document.getElementById('new-profile-name').value.trim();
    if (!val) { document.getElementById('profile-error').classList.remove('hidden'); return; }
    createLocalProfile(val);
  };
  document.getElementById('create-profile-btn').addEventListener('click', submit);
  document.getElementById('new-profile-name').addEventListener('keyup', (e) => { if (e.key === 'Enter') submit(); });
  document.getElementById('back-to-picker-btn').addEventListener('click', () => {
    if (isFirstEver) renderAccessCodeEntry(card);
    else renderAccessScreen(false);
  });
}

// Creates a LOCAL-ONLY profile — no network call, works fully offline.
// It gets a real access code that works on this device immediately; it
// only becomes usable from another device after connecting to the cloud
// from Profile (see startCloudConnection()).
function createLocalProfile(name) {
  const user = newUserShell(name);
  user.accessCode = genAccessCode();
  state.users[user.id] = user;
  state.session.activeUserId = user.id;
  saveData();
  renderAccessCodeReveal(user, { justConnected: false });
}

function renderAccessCodeReveal(user, opts) {
  opts = opts || {};
  const card = document.getElementById('access-card');
  const cloudLine = user.cloudSynced
    ? "This code works from any device \u2014 use \u201cUse Access Code\u201d on Device B to open this same account."
    : "This device only, for now. Connect this profile to the cloud from Profile \u2192 Access Code to use it elsewhere.";
  card.innerHTML = `
    <p class="eyebrow">${opts.justConnected ? 'Connected' : 'Profile created'}</p>
    <h1 class="auth-title">Save your access code</h1>
    <p class="auth-sub">This is the only time OnTrack will show it to you in full. ${cloudLine} It can't be recovered if it's lost \u2014 you'd need to regenerate a new one.</p>
    <div class="access-code-reveal">${escapeHtml(user.accessCode)}</div>
    <button type="button" class="btn-secondary full-width" id="access-code-copy-btn">Copy code</button>
    <button type="button" class="btn-primary mt-10" id="access-code-continue">I've saved it \u2014 continue</button>
  `;
  document.getElementById('access-code-copy-btn').addEventListener('click', (e) => copyAccessCode(user.accessCode, e.target));
  document.getElementById('access-code-continue').addEventListener('click', afterLogin);
}

function copyAccessCode(code, btn) {
  const done = () => { if (btn) { const t = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = t; }, 1500); } };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done).catch(done);
  } else {
    done();
  }
}

// Local-only profile -> real cloud account, migrating existing data up.
// Called from Profile. Never destroys local data: on any failure, the
// profile stays exactly as it was, local-only.
let lastConnectionMessage = null;

async function startCloudConnection() {
  const u = getUser();
  if (!u || u.cloudSynced) return;
  if (!isSupabaseConfigured()) {
    lastConnectionMessage = { type: 'error', text: 'Cloud sync is not configured for this deployment yet. See SETUP.md.' };
    renderAccessCodeSection(u);
    return;
  }
  lastConnectionMessage = { type: 'pending', text: 'Connecting\u2026' };
  renderAccessCodeSection(u);

  const created = await SupabaseAdapter.createCloudAccount();
  if (!created.ok) {
    console.error('Cloud account creation failed', created);
    lastConnectionMessage = { type: 'error', text: 'Could not connect. Check your connection and try again.' };
    renderAccessCodeSection(u);
    return;
  }

  // Migrate this profile's existing local data up under the new cloud
  // identity, then verify the push actually succeeded before switching
  // the local UI over to the cloud user.
  const localData = u;
  const newUserId = created.userId;
  const migratedUser = JSON.parse(JSON.stringify(localData));
  migratedUser.id = newUserId;
  migratedUser.accessCode = created.accessCode;
  migratedUser.cloudSynced = true;

  const pushResult = await SupabaseAdapter.pushFullState(migratedUser);
  if (!pushResult.ok) {
    // Keep the OLD local-only profile as the active one; do not switch
    // over to a half-migrated cloud account, and never touch local data.
    await SupabaseAdapter.signOut();
    lastConnectionMessage = {
      type: 'error',
      text: `Connected, but some data didn't upload (${escapeHtml(pushResult.failedTables.join(', '))}). Your local copy is untouched \u2014 try again.`
    };
    renderAccessCodeSection(u);
    return;
  }

  delete state.users[localData.id];
  state.users[newUserId] = migratedUser;
  state.session.activeUserId = newUserId;
  setSyncStatus('synced');
  saveData();
  renderAccessCodeReveal(migratedUser, { justConnected: true });
}

function switchProfile() {
  touchLastSeen();
  DataStore.clearSession();
  state.session.activeUserId = null;
  document.getElementById('app-screen').classList.add('hidden');
  renderAccessScreen(true);
}

function setupCrossTabSync() {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const incoming = JSON.parse(e.newValue);
      if (incoming && incoming.users) state = incoming;
    } catch (err) {
      console.error('Could not read update from another tab.', err);
      return;
    }
    if (currentTab === 'today') renderToday();
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* PWA offline shell is optional */ });
  }
}

/* ---------- Appearance ---------- */
function applyAppearance() {
  const u = getUser();
  const pref = u ? u.settings.appearance : 'system';
  let effective = pref;
  if (pref === 'system') {
    effective = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', effective);
}

/* =========================================================================
   ONBOARDING WIZARD (4 steps)
   1. What are you working on?          -- pick across categories
   2. What matters most right now?      -- no cap; star a few as top
   3. What's getting in your way?       -- contextual to categories picked
   4. Your starting system is ready.
   ========================================================================= */
function startOnboarding() {
  onboard = { step: 1, problems: [], priorities: [], blockers: [] };
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('access-screen').classList.add('hidden');
  const screen = document.getElementById('onboarding-screen');
  screen.classList.remove('hidden');
  screen.style.display = 'flex';
  renderOnboardStep();
}

function onboardProgressDots() {
  let dots = '<div class="onboard-progress">';
  for (let i = 1; i <= 4; i++) dots += `<span class="onboard-dot ${i <= onboard.step ? 'active' : ''}"></span>`;
  return dots + '</div>';
}

function renderOnboardStep() {
  const card = document.getElementById('onboarding-card');
  if (onboard.step === 1) renderOnboardStep1(card);
  else if (onboard.step === 2) renderOnboardStep2(card);
  else if (onboard.step === 3) renderOnboardStep3(card);
  else renderOnboardStep4(card);
}

function problemKey(catId, label) { return `${catId}::${label}`; }

function renderOnboardStep1(card) {
  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">First-time setup</p>
    <h2>What are you working on?</h2>
    <p class="onboard-sub">Pick whatever feels relevant right now. You can change this later.</p>
    <div class="onboard-categories" id="onboard-categories">
      ${ONBOARDING_CATEGORIES.map(cat => `
        <div class="onboard-category ${cat.private ? 'is-private' : ''}" data-cat="${cat.id}">
          <button type="button" class="onboard-category-head" data-cat="${cat.id}">
            <span>${escapeHtml(cat.title)}${cat.private ? ' <span class="private-badge">Private</span>' : ''}</span>
            <span class="onboard-category-count" id="count-${cat.id}"></span>
          </button>
          ${cat.private ? `<p class="hint-text onboard-private-note">${escapeHtml(cat.note)}</p>` : ''}
          <div class="onboard-items hidden" id="items-${cat.id}">
            ${cat.items.map(item => `
              <label class="onboard-item"><input type="checkbox" data-cat="${cat.id}" value="${escapeHtml(item)}"> ${escapeHtml(item)}</label>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <button type="button" class="btn-primary mt-14" id="onboard-next-1" disabled>Continue</button>
  `;

  card.querySelectorAll('.onboard-category-head').forEach(head => {
    head.addEventListener('click', () => {
      document.getElementById(`items-${head.dataset.cat}`).classList.toggle('hidden');
    });
  });
  card.querySelectorAll('.onboard-items input[type=checkbox]').forEach(cb => {
    if (onboard.problems.find(p => p.key === problemKey(cb.dataset.cat, cb.value))) cb.checked = true;
    cb.addEventListener('change', () => {
      const key = problemKey(cb.dataset.cat, cb.value);
      if (cb.checked) {
        if (!onboard.problems.find(p => p.key === key)) {
          onboard.problems.push({ key, catId: cb.dataset.cat, label: cb.value });
        }
      } else {
        onboard.problems = onboard.problems.filter(p => p.key !== key);
      }
      updateOnboardCounts();
      document.getElementById('onboard-next-1').disabled = onboard.problems.length === 0;
    });
  });
  updateOnboardCounts();
  document.getElementById('onboard-next-1').disabled = onboard.problems.length === 0;
  document.getElementById('onboard-next-1').addEventListener('click', () => {
    // Anything unstarred yet defaults into step 2 as "relevant" (not top).
    if (onboard.priorities.length === 0) {
      onboard.priorities = onboard.problems.map(p => ({ ...p, isTop: false }));
    }
    onboard.step = 2;
    renderOnboardStep();
  });
}

function updateOnboardCounts() {
  ONBOARDING_CATEGORIES.forEach(cat => {
    const n = onboard.problems.filter(p => p.catId === cat.id).length;
    const el = document.getElementById(`count-${cat.id}`);
    if (el) el.textContent = n > 0 ? String(n) : '';
  });
}

function renderOnboardStep2(card) {
  // Keep priorities in sync with whatever is (still) selected in step 1.
  onboard.priorities = onboard.problems.map(p => {
    const existing = onboard.priorities.find(pr => pr.key === p.key);
    return { ...p, isTop: existing ? existing.isTop : false };
  });

  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">Step 2</p>
    <h2>What matters most right now?</h2>
    <p class="onboard-sub">Everything you picked stays relevant. Star the ones you want to treat as top priorities \u2014 those are what OnTrack will build your first system and challenges around.</p>
    <div class="onboard-priority-list" id="priority-list">
      ${onboard.priorities.map(p => `
        <div class="priority-row ${p.isTop ? 'is-top' : ''}" data-key="${escapeHtml(p.key)}">
          <button type="button" class="priority-star" data-key="${escapeHtml(p.key)}" title="Mark as top priority">${p.isTop ? '\u2605' : '\u2606'}</button>
          <span class="priority-label">${escapeHtml(p.label)}</span>
          <span class="priority-cat-tag">${escapeHtml(findCategory(p.catId) ? findCategory(p.catId).title : '')}</span>
        </div>
      `).join('')}
    </div>
    <p class="hint-text" id="priority-count-note"></p>
    <div class="flex-gap-8 mt-14">
      <button type="button" class="btn-secondary" id="onboard-back-2">Back</button>
      <button type="button" class="btn-primary" id="onboard-next-2">Continue</button>
    </div>
  `;
  const updateNote = () => {
    const n = onboard.priorities.filter(p => p.isTop).length;
    document.getElementById('priority-count-note').textContent = n > 0
      ? `${n} top ${n === 1 ? 'priority' : 'priorities'} \u00b7 ${onboard.priorities.length} relevant areas total`
      : `No top priorities starred yet \u2014 that's okay, but starring a few helps OnTrack focus your first system.`;
  };
  card.querySelectorAll('.priority-star').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = onboard.priorities.find(pr => pr.key === btn.dataset.key);
      if (!p) return;
      p.isTop = !p.isTop;
      btn.textContent = p.isTop ? '\u2605' : '\u2606';
      btn.closest('.priority-row').classList.toggle('is-top', p.isTop);
      updateNote();
    });
  });
  updateNote();
  document.getElementById('onboard-back-2').addEventListener('click', () => { onboard.step = 1; renderOnboardStep(); });
  document.getElementById('onboard-next-2').addEventListener('click', () => { onboard.step = 3; renderOnboardStep(); });
}

function renderOnboardStep3(card) {
  const touchedCategories = [...new Set(onboard.problems.map(p => p.catId))];
  const options = [...new Set(touchedCategories.flatMap(catId => CATEGORY_BLOCKERS[catId] || []))];

  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">Step 3</p>
    <h2>What's getting in the way right now?</h2>
    <p class="onboard-sub">Based on what you picked. This feeds your friction system, so OnTrack can tell you why things keep slipping \u2014 not just that they did.</p>
    <div class="onboard-items" id="blocker-items">
      ${options.map(b => `
        <label class="onboard-item"><input type="checkbox" value="${escapeHtml(b)}" ${onboard.blockers.includes(b) ? 'checked' : ''}> ${escapeHtml(b)}</label>
      `).join('')}
    </div>
    <div class="flex-gap-8 mt-14">
      <button type="button" class="btn-secondary" id="onboard-back-3">Back</button>
      <button type="button" class="btn-primary" id="onboard-next-3">Generate my system</button>
    </div>
  `;
  card.querySelectorAll('#blocker-items input').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) onboard.blockers.push(cb.value);
      else onboard.blockers = onboard.blockers.filter(b => b !== cb.value);
    });
  });
  document.getElementById('onboard-back-3').addEventListener('click', () => { onboard.step = 2; renderOnboardStep(); });
  document.getElementById('onboard-next-3').addEventListener('click', () => {
    generateSystemFromOnboarding();
    onboard.step = 4;
    renderOnboardStep();
  });
}

function renderOnboardStep4(card) {
  const u = getUser();
  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">Ready</p>
    <h2>Your starting system is ready.</h2>
    <p class="onboard-sub">Based on your top priorities, OnTrack generated a focused set of habits, skills, and things to watch for. Edit or remove anything \u2014 this is just a starting point.</p>
    <div class="onboard-summary">
      <div class="onboard-summary-block">
        <p class="input-label">Habits</p>
        <ul>${u.habits.map(h => `<li>${escapeHtml(h.name)}</li>`).join('') || '<li class="empty-note-inline">None yet \u2014 add your own on the Habits page.</li>'}</ul>
      </div>
      <div class="onboard-summary-block">
        <p class="input-label">Skills I'm Building</p>
        <ul>${u.skills.map(s => `<li>${escapeHtml(s.name)}</li>`).join('') || '<li class="empty-note-inline">None yet.</li>'}</ul>
      </div>
      <div class="onboard-summary-block">
        <p class="input-label">Things to watch for</p>
        <ul>${u.watchFor.map(w => `<li>${escapeHtml(w)}</li>`).join('') || '<li class="empty-note-inline">None yet.</li>'}</ul>
      </div>
    </div>
    <button type="button" class="btn-primary mt-14" id="onboard-finish">Go to Today</button>
  `;
  document.getElementById('onboard-finish').addEventListener('click', () => {
    document.getElementById('onboarding-screen').classList.add('hidden');
    showApp();
  });
}

// Top priorities determine which categories seed content (capped so the
// user doesn't get "homework"): up to 2 habits + 1 skill + up to 2
// watch-fors per touched category, overall habit count capped at 8. If
// nothing was starred as a top priority, every selected area contributes.
function generateSystemFromOnboarding() {
  const u = getUser();
  if (!u) return;

  u.habits = [];
  u.skills = [];
  u.watchFor = [];
  u.friction = [];
  u.priorities = onboard.priorities.map(p => ({ key: p.key, catId: p.catId, label: p.label, isTop: !!p.isTop }));

  const topOnes = u.priorities.filter(p => p.isTop);
  const touchedCategories = [...new Set((topOnes.length ? topOnes : u.priorities).map(p => p.catId))];
  const seenHabitNames = new Set();
  const seenSkillNames = new Set();

  touchedCategories.forEach(catId => {
    const preset = CATEGORY_PRESETS[catId];
    if (!preset) return;
    preset.habits.slice(0, 2).forEach(name => {
      if (u.habits.length >= 8 || seenHabitNames.has(name)) return;
      seenHabitNames.add(name);
      u.habits.push({
        id: genUuid(), name, description: '', category: catId,
        frequency: { type: 'daily' }, createdAt: Date.now(), active: true, reminder: null
      });
    });
    preset.skills.slice(0, 1).forEach(name => {
      if (seenSkillNames.has(name)) return;
      seenSkillNames.add(name);
      u.skills.push({ id: genUuid(), name, description: '', progress: 0, hours: 0, relatedProblem: catId, evidence: [] });
    });
    preset.watchFor.slice(0, 2).forEach(w => { if (!u.watchFor.includes(w)) u.watchFor.push(w); });
  });

  u.onboardingSelections = {
    problems: onboard.problems.map(p => p.key),
    blockers: onboard.blockers,
    completedAt: Date.now()
  };

  u.onboarded = true;
  saveData();
}

/* =========================================================================
   APP SHELL / TAB SWITCHING
   Four top-level destinations: Today, Habits (with a Skills sub-view),
   Progress (with Friction + Weekly Review folded in), Profile.
   ========================================================================= */
function showApp() {
  const u = getUser();
  document.getElementById('access-screen').classList.add('hidden');
  const onboardScreen = document.getElementById('onboarding-screen');

  if (!u) { renderAccessScreen(); return; }
  if (!u.onboarded) {
    startOnboarding();
    return;
  }
  onboardScreen.classList.add('hidden');
  onboardScreen.style.display = 'none';
  const appScreen = document.getElementById('app-screen');
  appScreen.classList.remove('hidden');
  appScreen.style.display = 'block';

  document.getElementById('active-user-name').innerText = u.name;
  applyAppearance();
  refreshAvatarDisplays();
  switchTab('today');
}

const ALL_TABS = ['today', 'habits', 'progress', 'profile'];

function switchTab(tab, clickedBtn) {
  currentTab = tab;
  ALL_TABS.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== tab);
  });

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  if (tab === 'today') renderToday();
  if (tab === 'habits') renderHabitsTab();
  if (tab === 'progress') renderProgressTab();
  if (tab === 'profile') populateProfileForm();
}

/* =========================================================================
   TODAY — the center of the product.
   A. compact greeting/context
   B. Today's Challenge (derived from priorities/habits/friction)
   C. Today's actions (condensed check-off list, not the full matrix)
   D. a short progress snapshot
   E. secondary quick actions
   ========================================================================= */

// Picks (or reuses) a meaningful challenge for today, derived from the
// user's own data rather than anything random:
//  1. If today's challenge was already generated, reuse it (and reflect
//     completion state live).
//  2. Prefer a habit tied to a top priority that hasn't been done today
//     and has recent friction against it (the thing actually slipping).
//  3. Otherwise, a habit tied to any top priority not yet done today.
//  4. Otherwise, the least-consistent active habit not yet done today.
//  5. If literally everything today is already done, congratulate instead.
function getOrCreateTodayChallenge(u) {
  const dStr = todayKey();
  u.challenges = u.challenges || {};
  const existing = u.challenges[dStr];
  if (existing) {
    if (existing.habitId) {
      const status = getCompletion(u, existing.habitId, dStr);
      existing.completed = status === STATUS.DONE || status === STATUS.ADJUSTED;
    }
    return existing;
  }

  const dueToday = u.habits.filter(h => h.active !== false && isHabitDue(h, new Date()));
  const notDoneToday = dueToday.filter(h => {
    const s = getCompletion(u, h.id, dStr);
    return s !== STATUS.DONE && s !== STATUS.ADJUSTED;
  });

  if (notDoneToday.length === 0) {
    if (dueToday.length === 0) return null;
    return { habitId: null, text: "Everything on today's list is already done. Nice.", completed: true, isCelebration: true };
  }

  const topCatIds = new Set((u.priorities || []).filter(p => p.isTop).map(p => p.catId));
  const recentFrictionHabitIds = new Set(
    u.friction.filter(f => parseDateKey(f.date) >= addDays(new Date(), -14)).map(f => f.habitId)
  );

  let chosen = notDoneToday.find(h => topCatIds.has(h.category) && recentFrictionHabitIds.has(h.id));
  if (!chosen) chosen = notDoneToday.find(h => topCatIds.has(h.category));
  if (!chosen) {
    chosen = notDoneToday
      .map(h => ({ h, c: calcConsistency(u, { habitId: h.id }) }))
      .sort((a, b) => (a.c ? a.c.pct : -1) - (b.c ? b.c.pct : -1))[0].h;
  }

  const topPriority = (u.priorities || []).find(p => p.catId === chosen.category && p.isTop)
    || (u.priorities || []).find(p => p.catId === chosen.category);
  const priorityLine = topPriority ? `You said ${topPriority.label.toLowerCase()} matters right now.` : "Here's a meaningful next step.";

  const challenge = { habitId: chosen.id, text: priorityLine, actionText: chosen.name, completed: false };
  u.challenges[dStr] = challenge;
  saveData();
  return challenge;
}

function renderToday() {
  const u = getUser();
  const container = document.getElementById('today-container');
  if (!u || !container) return;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (u.name || '').split(' ')[0] || u.name;
  const dStr = todayKey();

  if (u.habits.length === 0) {
    container.innerHTML = `
      <div class="panel today-empty-panel">
        <p class="eyebrow">${escapeHtml(MONTH_NAMES[now.getMonth()])} ${now.getDate()}</p>
        <h2 class="today-greeting">${greeting}, ${escapeHtml(firstName)}.</h2>
        <p class="empty-note mt-10">No habits yet \u2014 nothing to act on today.</p>
        <button type="button" class="btn-primary today-cta" id="today-add-habit-cta">Build your first one</button>
      </div>`;
    document.getElementById('today-add-habit-cta').addEventListener('click', () => switchTab('habits', document.querySelector('.nav-btn[data-tab="habits"]')));
    return;
  }

  const dueToday = u.habits.filter(h => h.active !== false && isHabitDue(h, now));
  const doneCount = dueToday.filter(h => {
    const s = getCompletion(u, h.id, dStr);
    return s === STATUS.DONE || s === STATUS.ADJUSTED;
  }).length;
  const pct = dueToday.length > 0 ? Math.round((doneCount / dueToday.length) * 100) : 0;
  const { current } = calcOverallStreaks(u);
  const cons = calcConsistency(u, {});
  const friction = frictionAnalytics(u, 7);
  const topFriction = friction.top;
  const challenge = getOrCreateTodayChallenge(u);
  const topPriority = (u.priorities || []).find(p => p.isTop) || (u.priorities || [])[0];

  container.innerHTML = `
    <div class="panel today-header-panel">
      <p class="eyebrow">${escapeHtml(MONTH_NAMES[now.getMonth()])} ${now.getDate()}</p>
      <h2 class="today-greeting">${greeting}, ${escapeHtml(firstName)}.</h2>
    </div>

    ${challenge ? `
    <div class="panel today-challenge-panel ${challenge.completed ? 'is-complete' : ''}">
      <p class="today-challenge-label">${challenge.isCelebration ? "Today's challenge" : "Today's challenge"}</p>
      ${challenge.actionText ? `<p class="today-challenge-context">${escapeHtml(challenge.text)}</p>` : ''}
      <p class="today-challenge-action">${escapeHtml(challenge.actionText || challenge.text)}</p>
      ${challenge.habitId ? `
        <button type="button" class="btn-primary today-challenge-btn" id="today-challenge-btn" ${challenge.completed ? 'disabled' : ''}>
          ${challenge.completed ? '\u2713 Done' : 'Start challenge'}
        </button>` : ''}
    </div>` : ''}

    <div class="panel">
      <div class="today-actions-head">
        <span class="panel-title mb-0">Today's actions</span>
        <span class="today-progress-pct">${doneCount}/${dueToday.length} \u00b7 ${pct}%</span>
      </div>
      <div class="progress-bar-bg today-progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div id="today-habit-list" class="today-habit-list">
        ${dueToday.map(h => {
          const s = getCompletion(u, h.id, dStr);
          const mark = s === STATUS.DONE ? '\u2713' : s === STATUS.ADJUSTED ? '~' : s === STATUS.MISSED ? '\u2715' : '\u25CB';
          const cls = s === STATUS.DONE ? 'status-done' : s === STATUS.ADJUSTED ? 'status-adjusted' : s === STATUS.MISSED ? 'status-missed' : '';
          return `<div class="today-habit-row">
            <button type="button" class="today-habit-toggle ${cls}" data-habit="${h.id}">${mark}</button>
            <span class="today-habit-name">${escapeHtml(h.name)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="today-stat-row">
      <div class="today-stat-chip"><span class="stat-value">${current}</span><span class="stat-label">Streak</span></div>
      <div class="today-stat-chip"><span class="stat-value">${cons ? cons.pct + '%' : '\u2014'}</span><span class="stat-label">Consistency</span></div>
      <div class="today-stat-chip"><span class="stat-value today-stat-chip-text">${topPriority ? topPriority.label : '\u2014'}</span><span class="stat-label">Active priority</span></div>
      <div class="today-stat-chip"><span class="stat-value today-stat-chip-text">${topFriction ? topFriction.reason : '\u2014'}</span><span class="stat-label">Friction this week</span></div>
    </div>

    <div class="today-quick-actions">
      <button type="button" class="btn-secondary" data-tab="habits" id="qa-add-habit">Habits</button>
      <button type="button" class="btn-secondary" data-tab="progress" id="qa-view-progress">Progress</button>
      <button type="button" class="btn-secondary" data-tab="progress" id="qa-log-friction">Friction</button>
    </div>
  `;

  container.querySelectorAll('.today-habit-toggle').forEach(btn => {
    btn.addEventListener('click', () => cycleCompletion(btn.dataset.habit, dStr, true));
  });
  container.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, document.querySelector(`.nav-btn[data-tab="${btn.dataset.tab}"]`)));
  });
  const challengeBtn = document.getElementById('today-challenge-btn');
  if (challengeBtn) {
    challengeBtn.addEventListener('click', () => {
      cycleCompletion(challenge.habitId, dStr, true);
    });
  }
}

/* =========================================================================
   HABITS — long-term management. The monthly grid stays; Today never
   duplicates it. A Skills sub-view lives here too (habits = do
   repeatedly, skills = get better at over time; both are "management",
   distinct from Today's execution).
   ========================================================================= */
function renderHabitsTab() {
  const gridSection = document.getElementById('habits-grid-section');
  const skillsSection = document.getElementById('habits-skills-section');
  document.querySelectorAll('.habits-subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === habitsSubTab));
  if (gridSection) gridSection.classList.toggle('hidden', habitsSubTab !== 'grid');
  if (skillsSection) skillsSection.classList.toggle('hidden', habitsSubTab !== 'skills');
  if (habitsSubTab === 'grid') renderHabits(); else renderSkills();
}

function switchHabitsSubTab(sub) {
  habitsSubTab = sub;
  renderHabitsTab();
}

function renderMonthLabel() {
  const label = document.getElementById('month-label');
  if (label) label.innerText = `${MONTH_NAMES[viewMonth - 1]} ${viewYear}`;
}

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
  if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
  renderHabits();
}

function jumpToToday() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth() + 1;
  renderHabits();
}

function renderHabits() {
  const u = getUser();
  const header = document.getElementById('grid-header');
  const body = document.getElementById('grid-body');
  if (!u || !header || !body) return;

  renderMonthLabel();

  const total = daysInMonth(viewYear, viewMonth);
  const now = new Date();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;
  const todayDay = now.getDate();

  header.innerHTML = '<th class="sticky-col">Habit</th>';
  for (let i = 1; i <= total; i++) {
    const isToday = isCurrentMonth && i === todayDay;
    header.innerHTML += `<th class="${isToday ? 'is-today' : ''}">${i}</th>`;
  }

  body.innerHTML = '';
  if (u.habits.length === 0) {
    body.innerHTML = `<tr><td class="sticky-col empty-note" colspan="${total + 1}">No habits yet &mdash; add one below.</td></tr>`;
    return;
  }

  u.habits.forEach((habit, hIdx) => {
    const tr = document.createElement('tr');
    const isFirst = hIdx === 0;
    const isLast = hIdx === u.habits.length - 1;
    const cons = calcConsistency(u, { habitId: habit.id });
    tr.innerHTML = `<td class="sticky-col">
      <div class="habit-cell">
        <span class="habit-name" data-hid="${habit.id}" title="Click for details">${escapeHtml(habit.name)}</span>
        <span class="habit-cell-pct">${cons ? cons.pct + '%' : ''}</span>
        <div class="habit-actions">
          <button type="button" class="habit-action-btn" data-action="up" data-hid="${habit.id}" ${isFirst ? 'disabled' : ''} title="Move up">&uarr;</button>
          <button type="button" class="habit-action-btn" data-action="down" data-hid="${habit.id}" ${isLast ? 'disabled' : ''} title="Move down">&darr;</button>
          <button type="button" class="habit-action-btn habit-delete-btn" data-action="delete" data-hid="${habit.id}" title="Delete habit">&times;</button>
        </div>
      </div>
    </td>`;
    for (let day = 1; day <= total; day++) {
      const dStr = dateKey(viewYear, viewMonth, day);
      const val = getCompletion(u, habit.id, dStr);
      let mark = '', classCss = '';
      if (val === STATUS.DONE) { mark = '\u2713'; classCss = 'status-done'; }
      if (val === STATUS.ADJUSTED) { mark = '~'; classCss = 'status-adjusted'; }
      if (val === STATUS.MISSED) { mark = '\u2715'; classCss = 'status-missed'; }
      const isToday = isCurrentMonth && day === todayDay;
      const title = val ? `${STATUS_HELP[val]}` : '';
      tr.innerHTML += `<td class="${isToday ? 'is-today' : ''}"><div class="cell-toggle ${classCss}" data-hid="${habit.id}" data-date="${dStr}" title="${escapeHtml(title)}">${mark}</div></td>`;
    }
    body.appendChild(tr);
  });
}

function cycleCompletion(habitId, dStr, rerenderToday) {
  const u = getUser();
  const curr = getCompletion(u, habitId, dStr);
  let next;
  if (!curr) next = STATUS.DONE;
  else if (curr === STATUS.DONE) next = STATUS.ADJUSTED;
  else if (curr === STATUS.ADJUSTED) {
    next = STATUS.MISSED;
    pendingMissCell = { habitId, dStr };
    openFailureModal();
  } else next = null;

  setCompletion(u, habitId, dStr, next);
  saveData();
  if (rerenderToday) renderToday(); else if (habitsSubTab === 'grid') renderHabits();
  if (currentTab === 'today') renderToday();
}

function openFailureModal() {
  const btnWrap = document.getElementById('failure-reason-buttons');
  btnWrap.innerHTML = FRICTION_REASONS.map(r => `<button class="modal-btn" type="button" data-reason="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('');
  btnWrap.querySelectorAll('.modal-btn').forEach(btn => btn.addEventListener('click', () => submitFailureReason(btn.dataset.reason)));
  document.getElementById('failure-note-input').value = '';
  document.getElementById('failure-modal').classList.remove('hidden');
}

function submitFailureReason(reason) {
  if (!pendingMissCell) { document.getElementById('failure-modal').classList.add('hidden'); return; }
  const u = getUser();
  const habit = u.habits.find(h => h.id === pendingMissCell.habitId);
  const note = document.getElementById('failure-note-input').value.trim();
  u.friction.push({
    id: genUuid(), habitId: pendingMissCell.habitId,
    habitNameSnapshot: habit ? habit.name : '', date: pendingMissCell.dStr,
    reason, note
  });
  pendingMissCell = null;
  document.getElementById('failure-modal').classList.add('hidden');
  saveData();
  if (habitsSubTab === 'grid') renderHabits();
  if (currentTab === 'today') renderToday();
  if (currentTab === 'progress') renderFrictionSection();
}

function addHabit() {
  const input = document.getElementById('new-habit-input');
  const val = input.value.trim();
  if (!val) return;
  const u = getUser();
  u.habits.push({
    id: genUuid(), name: val, description: '', category: '',
    frequency: { type: 'daily' }, createdAt: Date.now(), active: true, reminder: null
  });
  input.value = '';
  saveData();
  renderHabits();
  if (currentTab === 'today') renderToday();
}

function moveHabit(habitId, direction) {
  const u = getUser();
  const idx = u.habits.findIndex(h => h.id === habitId);
  const newIdx = idx + direction;
  if (idx < 0 || newIdx < 0 || newIdx >= u.habits.length) return;
  const tmp = u.habits[idx];
  u.habits[idx] = u.habits[newIdx];
  u.habits[newIdx] = tmp;
  saveData();
  renderHabits();
}

function deleteHabit(habitId) {
  const u = getUser();
  const habit = u.habits.find(h => h.id === habitId);
  if (!habit) return;
  if (!confirm(`Delete "${habit.name}"? This also removes its logged history.`)) return;
  u.habits = u.habits.filter(h => h.id !== habitId);
  Object.keys(u.completions).forEach(key => { if (key.startsWith(habitId + '__')) delete u.completions[key]; });
  u.friction = u.friction.filter(f => f.habitId !== habitId);
  saveData();
  renderHabits();
  if (currentTab === 'today') renderToday();
}

function renameHabit(habitId, newName) {
  const val = newName.trim();
  if (!val) return;
  const u = getUser();
  const h = u.habits.find(hh => hh.id === habitId);
  if (h) h.name = val;
  saveData();
}

function startRenameHabit(habitId, spanEl) {
  const u = getUser();
  const habit = u.habits.find(h => h.id === habitId);
  if (!habit) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'habit-rename-input';
  input.value = habit.name;
  spanEl.replaceWith(input);
  input.focus();
  input.select();
  let cancelled = false;
  const commit = () => { if (cancelled) return; renameHabit(habitId, input.value); renderHabits(); };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { cancelled = true; renderHabits(); }
  });
  input.addEventListener('blur', commit);
}

/* ---------- Habit detail modal ---------- */
function openHabitDetail(habitId) {
  const u = getUser();
  const habit = u.habits.find(h => h.id === habitId);
  if (!habit) return;
  const cons = calcConsistency(u, { habitId });
  const current = calcCurrentStreak(u, habitId);
  const longest = calcLongestStreak(u, habitId);
  const hFriction = u.friction.filter(f => f.habitId === habitId);
  const reasonCounts = {};
  hFriction.forEach(f => { reasonCounts[f.reason] = (reasonCounts[f.reason] || 0) + 1; });
  const topReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  document.getElementById('habit-detail-body').innerHTML = `
    <div class="panel-title modal-title-margin">${escapeHtml(habit.name)}</div>
    <div class="stat-grid mb-8">
      <div class="stat-box"><span class="stat-value">${cons ? cons.pct + '%' : '\u2014'}</span><span class="stat-label">Consistency</span></div>
      <div class="stat-box"><span class="stat-value">${current}</span><span class="stat-label">Current streak</span></div>
      <div class="stat-box"><span class="stat-value">${longest}</span><span class="stat-label">Longest streak</span></div>
      <div class="stat-box"><span class="stat-value">${cons ? cons.done + cons.adjusted : 0}</span><span class="stat-label">Total completions</span></div>
      <div class="stat-box"><span class="stat-value">${cons ? cons.missed : 0}</span><span class="stat-label">Missed</span></div>
      <div class="stat-box"><span class="stat-value">${cons ? cons.adjusted : 0}</span><span class="stat-label">Adjusted</span></div>
    </div>
    <p class="hint-text mb-8"><strong>Adjusted</strong> = ${STATUS_HELP.adjusted}</p>
    <p class="input-label mb-8">Common friction</p>
    ${topReasons.length ? topReasons.map(([r, n]) => `<p class="hint-text">${escapeHtml(r)} &mdash; ${n}x</p>`).join('') : '<p class="empty-note">No friction logged for this habit yet.</p>'}
    <div class="mt-14">
      <label class="input-label" for="habit-detail-name">Name</label>
      <input type="text" id="habit-detail-name" class="inline-input full-width" value="${escapeHtml(habit.name)}">
      <label class="input-label mt-10" for="habit-detail-desc">Description</label>
      <input type="text" id="habit-detail-desc" class="inline-input full-width" value="${escapeHtml(habit.description || '')}">
      <label class="toggle-row mt-10"><input type="checkbox" id="habit-detail-active" ${habit.active !== false ? 'checked' : ''}> Active</label>
      <div class="flex-gap-8 mt-14">
        <button type="button" class="btn-secondary" id="habit-detail-save">Save changes</button>
        <button type="button" class="btn-secondary btn-danger" id="habit-detail-delete">Delete habit</button>
      </div>
    </div>
  `;
  document.getElementById('habit-detail-save').addEventListener('click', () => {
    habit.name = document.getElementById('habit-detail-name').value.trim() || habit.name;
    habit.description = document.getElementById('habit-detail-desc').value.trim();
    habit.active = document.getElementById('habit-detail-active').checked;
    saveData();
    renderHabits();
    document.getElementById('habit-detail-modal').classList.add('hidden');
  });
  document.getElementById('habit-detail-delete').addEventListener('click', () => {
    deleteHabit(habitId);
    document.getElementById('habit-detail-modal').classList.add('hidden');
  });
  document.getElementById('habit-detail-modal').classList.remove('hidden');
}

/* =========================================================================
   SKILLS I'M BUILDING — distinct from habits: something you're actively
   trying to get better at, not something you repeat daily. Connected back
   to the priority area it came from so its purpose stays visible.
   ========================================================================= */
function skillLevelLabel(progress) {
  if (progress >= 75) return 'Strong';
  if (progress >= 50) return 'Functional';
  if (progress >= 25) return 'Developing';
  return 'Novice';
}

function renderSkills() {
  const u = getUser();
  const container = document.getElementById('skills-container');
  if (!u || !container) return;
  container.innerHTML = '';

  if (u.skills.length === 0) {
    container.innerHTML = '<p class="empty-note">No skills yet. A skill is something you\'re actively trying to get better at (not something you repeat daily like a habit) \u2014 add one below, or generate one from your priorities during onboarding.</p>';
    return;
  }

  u.skills.forEach(skill => {
    const cat = findCategory(skill.relatedProblem);
    const card = document.createElement('div');
    card.className = 'panel skill-card';
    card.innerHTML = `
      <div class="skill-header">
        <span class="skill-title">${escapeHtml(skill.name)}</span>
        <button class="btn-secondary skill-remove-btn" type="button" data-sid="${skill.id}">Remove</button>
      </div>
      ${cat ? `<span class="skill-connected-tag">Connected to: ${escapeHtml(cat.title)}</span>` : ''}
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${skill.progress}%"></div></div>
      <div class="skill-meta">${skillLevelLabel(skill.progress)} &middot; ${skill.progress}%</div>
      <div class="flex-gap-8 mb-8">
        <button class="btn-secondary add-hrs-btn" type="button" data-sid="${skill.id}" data-hrs="0.5">+0.5h practice</button>
        <button class="btn-secondary add-hrs-btn" type="button" data-sid="${skill.id}" data-hrs="1">+1h practice</button>
      </div>
      <p class="input-label mb-8">Evidence of progress</p>
      <div class="skill-evidence-list">
        ${(skill.evidence || []).slice().reverse().slice(0, 4).map(ev => `<p class="hint-text">&bull; ${escapeHtml(ev.text)}</p>`).join('') || '<p class="hint-text">Nothing logged yet.</p>'}
      </div>
      <div class="inline-form">
        <input type="text" class="inline-input skill-evidence-input" data-sid="${skill.id}" placeholder="e.g. Spoke up in a meeting today\u2026">
        <button class="btn-secondary skill-evidence-btn" type="button" data-sid="${skill.id}">Add</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function addSkill() {
  const input = document.getElementById('new-skill-input');
  const val = input.value.trim();
  if (!val) return;
  const u = getUser();
  u.skills.push({ id: genUuid(), name: val, description: '', progress: 0, hours: 0, relatedProblem: '', evidence: [] });
  input.value = '';
  saveData();
  renderSkills();
}

function updateHours(skillId, amt) {
  const u = getUser();
  const skill = u.skills.find(s => s.id === skillId);
  if (!skill) return;
  skill.hours = Math.round((skill.hours + amt) * 100) / 100;
  skill.progress = Math.min(100, Math.round((skill.hours / 20) * 100));
  saveData();
  renderSkills();
}

function removeSkill(skillId) {
  const u = getUser();
  u.skills = u.skills.filter(s => s.id !== skillId);
  saveData();
  renderSkills();
}

function addSkillEvidence(skillId, text) {
  const val = text.trim();
  if (!val) return;
  const u = getUser();
  const skill = u.skills.find(s => s.id === skillId);
  if (!skill) return;
  skill.evidence = skill.evidence || [];
  skill.evidence.push({ id: genId('ev'), date: todayKey(), text: val });
  skill.progress = Math.min(100, skill.progress + 4);
  saveData();
  renderSkills();
}

/* =========================================================================
   FRICTION — real misses only. Seeded "watch for" items never appear here.
   Lives inside Progress: "what's improving" and "what's repeatedly
   getting in the way" belong together.
   ========================================================================= */
function frictionAnalytics(u, sinceDays) {
  let entries = u.friction;
  if (sinceDays) {
    const cutoff = addDays(new Date(), -sinceDays);
    entries = entries.filter(f => parseDateKey(f.date) >= cutoff);
  }
  const counts = {};
  entries.forEach(f => { counts[f.reason] = (counts[f.reason] || 0) + 1; });
  const total = entries.length;
  const breakdown = Object.entries(counts)
    .map(([reason, count]) => ({ reason, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
  return { total, breakdown, top: breakdown[0] || null, entries };
}

function renderFrictionSection() {
  const u = getUser();
  const analyticsEl = document.getElementById('friction-analytics');
  const list = document.getElementById('friction-log-list');
  if (!u || !analyticsEl || !list) return;

  const stats = frictionAnalytics(u, 30);
  const cons = calcConsistency(u, { from: addDays(new Date(), -29) });

  if (stats.total === 0) {
    analyticsEl.innerHTML = '<p class="empty-note">No friction logged yet. When a habit doesn\'t happen, log what got in the way and patterns will show up here.</p>';
  } else {
    const planned = cons ? cons.expected : 0;
    const missedTotal = cons ? cons.missed : 0;
    analyticsEl.innerHTML = `
      ${planned ? `<p class="friction-summary-line">You planned <strong>${planned}</strong> habit check-ins this month. <strong>${missedTotal}</strong> were missed.${stats.top ? ` Your most common blocker was <strong>${escapeHtml(stats.top.reason)}</strong>.` : ''}</p>` : ''}
      <div class="friction-breakdown">
        ${stats.breakdown.map(b => `
          <div class="friction-breakdown-row">
            <span class="friction-breakdown-label">${escapeHtml(b.reason)}</span>
            <div class="progress-bar-bg friction-breakdown-bar"><div class="progress-bar-fill" style="width:${b.pct}%"></div></div>
            <span class="friction-breakdown-pct">${b.pct}%</span>
          </div>`).join('')}
      </div>
      ${stats.top ? `
        <div class="advice-bar mt-14">
          <strong>${escapeHtml(stats.top.reason)}</strong> is your most common blocker in the last 30 days (${stats.top.count}x).
          <br>${escapeHtml(INTERVENTIONS[stats.top.reason] || '')}
        </div>` : ''}
    `;
  }

  if (u.friction.length === 0) {
    list.innerHTML = '<p class="empty-note">No missed entries logged.</p>';
    return;
  }
  const sorted = [...u.friction].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  list.innerHTML = sorted.slice(0, 30).map(f => `
    <div class="friction-item">
      <strong>${escapeHtml(f.habitNameSnapshot || '')}</strong> (${escapeHtml(f.date || '')}): <span class="reason-text">${escapeHtml(f.reason)}</span>
      ${f.note ? `<div class="hint-text">${escapeHtml(f.note)}</div>` : ''}
    </div>`).join('');
}

/* =========================================================================
   PROGRESS — explains the journey: what's improving, what's slipping,
   why, and what to adjust. Folds in Friction and Weekly Review so they
   read as one connected story instead of separate pages.
   ========================================================================= */
function renderProgressTab() {
  renderProgressOverview();
  renderFrictionSection();
  renderWeeklyReviewInline();
}

function renderProgressOverview() {
  const u = getUser();
  const summaryEl = document.getElementById('progress-summary');
  const chartEl = document.getElementById('progress-chart');
  const habitsEl = document.getElementById('progress-habits');
  const narrativeEl = document.getElementById('progress-narrative');
  if (!u || !summaryEl || !chartEl || !habitsEl) return;

  const overall = calcConsistency(u, {});
  if (!overall) {
    summaryEl.innerHTML = '<p class="empty-note">Keep checking in. Your progress will appear here.</p>';
    chartEl.innerHTML = '';
    habitsEl.innerHTML = '';
    if (narrativeEl) narrativeEl.innerHTML = '';
    return;
  }

  const { current, longest } = calcOverallStreaks(u);
  const daysTracked = Object.keys(u.completions).length > 0
    ? new Set(Object.keys(u.completions).map(k => k.split('__')[1])).size : 0;

  summaryEl.innerHTML = `
    <div class="stat-grid">
      <div class="stat-box"><span class="stat-value">${overall.pct}%</span><span class="stat-label">Lifetime consistency</span></div>
      <div class="stat-box"><span class="stat-value">${current}</span><span class="stat-label">Current streak (days)</span></div>
      <div class="stat-box"><span class="stat-value">${longest}</span><span class="stat-label">Longest streak (days)</span></div>
      <div class="stat-box"><span class="stat-value">${daysTracked}</span><span class="stat-label">Days tracked</span></div>
    </div>
    <p class="hint-text">${overall.done} done, ${overall.adjusted} adjusted, ${overall.missed} missed overall.</p>
  `;

  const byMonth = {};
  Object.keys(u.completions).forEach(key => {
    const dStr = key.split('__')[1];
    const monthKey = dStr.slice(0, 7);
    if (!byMonth[monthKey]) byMonth[monthKey] = { done: 0, adjusted: 0, missed: 0 };
    const status = u.completions[key];
    byMonth[monthKey][status] = (byMonth[monthKey][status] || 0) + 1;
  });
  const monthKeys = Object.keys(byMonth).sort().slice(-8);

  let improving = null, slipping = null;
  if (monthKeys.length >= 2) {
    const lastKey = monthKeys[monthKeys.length - 1];
    const prevKey = monthKeys[monthKeys.length - 2];
    const pctOf = (mk) => {
      const m = byMonth[mk];
      const t = m.done + m.adjusted + m.missed;
      return t > 0 ? Math.round(((m.done + m.adjusted) / t) * 100) : null;
    };
    const lastPct = pctOf(lastKey), prevPct = pctOf(prevKey);
    if (lastPct !== null && prevPct !== null) {
      if (lastPct > prevPct) improving = lastPct - prevPct;
      else if (lastPct < prevPct) slipping = prevPct - lastPct;
    }
  }
  if (narrativeEl) {
    if (improving !== null) {
      narrativeEl.innerHTML = `<p class="advice-bar">Consistency is up <strong>${improving}%</strong> from last month. Whatever changed, it's working.</p>`;
    } else if (slipping !== null) {
      const worst = [...u.habits].map(h => ({ h, c: calcConsistency(u, { habitId: h.id, from: addDays(new Date(), -29) }) }))
        .filter(x => x.c).sort((a, b) => a.c.pct - b.c.pct)[0];
      narrativeEl.innerHTML = `<p class="advice-bar">Consistency is down <strong>${slipping}%</strong> from last month.${worst ? ` <strong>${escapeHtml(worst.h.name)}</strong> has slipped the most \u2014 check Friction below for why.` : ''}</p>`;
    } else {
      narrativeEl.innerHTML = '';
    }
  }

  if (monthKeys.length === 0) {
    chartEl.innerHTML = '<p class="empty-note">Not enough data yet.</p>';
  } else {
    chartEl.innerHTML = '<div class="bar-chart">' + monthKeys.map((mk) => {
      const m = byMonth[mk];
      const totalM = m.done + m.adjusted + m.missed;
      const pct = totalM > 0 ? Math.round(((m.done + m.adjusted) / totalM) * 100) : 0;
      const [y, mo] = mk.split('-').map(Number);
      const label = MONTH_NAMES[mo - 1].slice(0, 3);
      return `
        <div class="bar-col" title="${totalM} logged days">
          <span class="bar-pct">${pct}%</span>
          <div class="bar-track"><div class="bar-fill" style="height:${pct}%"></div></div>
          <span class="bar-label">${label} '${String(y).slice(2)}</span>
        </div>`;
    }).join('') + '</div>';
  }

  if (u.habits.length === 0) {
    habitsEl.innerHTML = '<p class="empty-note">No habits yet.</p>';
  } else {
    habitsEl.innerHTML = u.habits.map(habit => {
      const c = calcConsistency(u, { habitId: habit.id });
      const pct = c ? c.pct : 0;
      return `
        <div class="habit-progress-row">
          <div class="habit-progress-name">${escapeHtml(habit.name)}</div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          <div class="habit-progress-pct">${c ? pct + '%' : '&mdash;'}</div>
        </div>`;
    }).join('');
  }
}

/* =========================================================================
   WEEKLY REVIEW — where the user reflects and adjusts, feeding back into
   Today's context (top priorities/challenge generation).
   ========================================================================= */
function computeWeeklySnapshot(u) {
  const weekAgo = addDays(new Date(), -6);
  const entries = Object.keys(u.completions)
    .map(key => ({ habitId: key.split('__')[0], date: key.split('__')[1], status: u.completions[key] }))
    .filter(e => parseDateKey(e.date) >= new Date(weekAgo.setHours(0, 0, 0, 0)));

  let done = 0, adjusted = 0, missed = 0;
  const byHabit = {};
  entries.forEach(e => {
    if (e.status === STATUS.DONE) done++;
    if (e.status === STATUS.ADJUSTED) adjusted++;
    if (e.status === STATUS.MISSED) missed++;
    if (!byHabit[e.habitId]) byHabit[e.habitId] = { done: 0, adjusted: 0, missed: 0 };
    byHabit[e.habitId][e.status] = (byHabit[e.habitId][e.status] || 0) + 1;
  });
  const total = done + adjusted + missed;
  const consistency = total > 0 ? Math.round(((done + adjusted) / total) * 100) : 0;

  let strongest = null, weakest = null;
  Object.entries(byHabit).forEach(([hId, c]) => {
    const t = c.done + c.adjusted + c.missed;
    if (t === 0) return;
    const rate = (c.done + c.adjusted) / t;
    const habit = u.habits.find(h => h.id === hId);
    if (!habit) return;
    if (!strongest || rate > strongest.rate) strongest = { name: habit.name, rate };
    if (!weakest || rate < weakest.rate) weakest = { name: habit.name, rate };
  });

  const weekFriction = frictionAnalytics(u, 7);
  return { consistency, done, adjusted, missed, strongest, weakest, topFriction: weekFriction.top };
}

function renderWeeklyReviewInline() {
  const u = getUser();
  const el = document.getElementById('weekly-review-inline');
  if (!u || !el) return;
  const snap = computeWeeklySnapshot(u);
  if (snap.done + snap.adjusted + snap.missed === 0) {
    el.innerHTML = '<p class="empty-note">Not enough data yet this week.</p>';
    return;
  }
  el.innerHTML = `
    <div class="stat-grid mb-8">
      <div class="stat-box"><span class="stat-value">${snap.consistency}%</span><span class="stat-label">This week</span></div>
      <div class="stat-box"><span class="stat-value">${snap.done + snap.adjusted}</span><span class="stat-label">Completed</span></div>
      <div class="stat-box"><span class="stat-value">${snap.missed}</span><span class="stat-label">Missed</span></div>
    </div>
    <button type="button" class="btn-secondary" id="open-weekly-review-btn">Open full review</button>
  `;
  document.getElementById('open-weekly-review-btn').addEventListener('click', openWeeklyReviewModal);
}

function openWeeklyReviewModal() {
  const u = getUser();
  const snap = computeWeeklySnapshot(u);
  const weekKey = isoWeekKey(new Date());
  const existing = (u.weeklyReviews || []).find(r => r.weekKey === weekKey);
  const ans = (existing && existing.answers) || {};

  document.getElementById('weekly-review-body').innerHTML = `
    <div class="panel-title modal-title-margin">Your week</div>
    <div class="stat-grid mb-8">
      <div class="stat-box"><span class="stat-value">${snap.consistency}%</span><span class="stat-label">Consistency</span></div>
      <div class="stat-box"><span class="stat-value">${snap.done + snap.adjusted}</span><span class="stat-label">Completed</span></div>
      <div class="stat-box"><span class="stat-value">${snap.missed}</span><span class="stat-label">Missed</span></div>
    </div>
    <p class="hint-text">Top friction: ${snap.topFriction ? escapeHtml(snap.topFriction.reason) : '\u2014'}</p>
    <p class="hint-text">Strongest habit: ${snap.strongest ? escapeHtml(snap.strongest.name) : '\u2014'}</p>
    <p class="hint-text">Needs attention: ${snap.weakest ? escapeHtml(snap.weakest.name) : '\u2014'}</p>

    <label class="input-label mt-14" for="wr-went-well">What went well?</label>
    <input type="text" id="wr-went-well" class="inline-input full-width" value="${escapeHtml(ans.wentWell || '')}">
    <label class="input-label mt-10" for="wr-didnt">What didn't?</label>
    <input type="text" id="wr-didnt" class="inline-input full-width" value="${escapeHtml(ans.didnt || '')}">
    <label class="input-label mt-10" for="wr-blocker">What kept getting in the way?</label>
    <input type="text" id="wr-blocker" class="inline-input full-width" value="${escapeHtml(ans.blocker || '')}">
    <label class="input-label mt-10" for="weekly-reflection-input">What should change next week?</label>
    <textarea id="weekly-reflection-input" class="inline-input full-width weekly-reflection-textarea">${escapeHtml(existing ? existing.reflection : '')}</textarea>
    <button type="button" class="btn-secondary mt-10" id="weekly-review-save">Save reflection</button>
  `;
  document.getElementById('weekly-review-save').addEventListener('click', () => {
    const reflection = document.getElementById('weekly-reflection-input').value.trim();
    const answers = {
      wentWell: document.getElementById('wr-went-well').value.trim(),
      didnt: document.getElementById('wr-didnt').value.trim(),
      blocker: document.getElementById('wr-blocker').value.trim()
    };
    u.weeklyReviews = u.weeklyReviews || [];
    const idx = u.weeklyReviews.findIndex(r => r.weekKey === weekKey);
    const record = { weekKey, reflection, answers, createdAt: Date.now(), snapshot: snap };
    if (idx >= 0) u.weeklyReviews[idx] = record; else u.weeklyReviews.push(record);
    saveData();
    document.getElementById('weekly-review-modal').classList.add('hidden');
  });
  document.getElementById('weekly-review-modal').classList.remove('hidden');
}

/* =========================================================================
   PROFILE — user info, access code, account, notifications, appearance,
   privacy, data, sign out. (Formerly "Settings" — merged and renamed;
   there is no Group left to have Group-only settings for.)
   ========================================================================= */
function populateProfileForm() {
  const u = getUser();
  if (!u) return;

  document.getElementById('display-name-input').value = u.name;
  document.getElementById('profile-identity-note').innerText =
    `Profile created ${new Date(u.createdAt).toLocaleDateString()}.`;

  renderAccessCodeSection(u);

  const cons = calcConsistency(u, {});
  const { current } = calcOverallStreaks(u);
  document.getElementById('profile-stats').innerText =
    `${current}-day streak \u00b7 ${cons ? cons.pct + '%' : '\u2014'} consistency \u00b7 ${u.skills.length} skill${u.skills.length === 1 ? '' : 's'} building`;

  document.querySelectorAll('#appearance-segmented .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.value === u.settings.appearance));

  document.getElementById('notif-habit-reminders').checked = !!u.settings.notifications.habitReminders;
  document.getElementById('notif-challenge-reminders').checked = !!u.settings.notifications.challengeReminders;
  document.getElementById('notif-weekly-review').checked = !!u.settings.notifications.weeklyReview;
  document.getElementById('notif-daily-checkin').checked = !!u.settings.notifications.dailyCheckin;

  document.getElementById('privacy-data-note').innerText = u.cloudSynced
    ? "Your data is stored in your own Supabase-backed account, isolated by row-level security \u2014 no one else can read it, including other OnTrack accounts."
    : "Your data lives only in this browser and is never sent anywhere.";

  refreshAvatarDisplays();
}

function syncStatusLine() {
  if (!getUser() || !getUser().cloudSynced) return '';
  if (syncStatus.state === 'synced') return '<span class="status-dot online"></span> Synced';
  if (syncStatus.state === 'error') return `<span class="status-dot offline"></span> Not fully synced \u2014 ${escapeHtml(syncStatus.failedTables.join(', ') || 'a recent change')} didn't save to the cloud yet. It's safe in this browser and will retry.`;
  if (syncStatus.state === 'signed_out') return '<span class="status-dot offline"></span> Signed out of the cloud on this device.';
  return '<span class="status-dot online"></span> Connected';
}

function renderAccessCodeSection(u) {
  const el = document.getElementById('access-code-section');
  if (!el) return;

  if (lastConnectionMessage) {
    const msg = lastConnectionMessage;
    lastConnectionMessage = null;
    el.innerHTML = `
      <p class="${msg.type === 'error' ? 'error-msg' : 'hint-text'}">${msg.text}</p>
      <button type="button" class="btn-secondary full-width mt-10" id="access-code-section-retry">Back</button>
    `;
    document.getElementById('access-code-section-retry').addEventListener('click', () => renderAccessCodeSection(u));
    return;
  }

  if (u.cloudSynced) {
    el.innerHTML = `
      <p class="input-label">Your access code</p>
      ${u.accessCode
        ? `<span class="settings-access-code">${escapeHtml(u.accessCode)}</span>
           <div class="flex-gap-8 mt-8"><button type="button" class="btn-secondary" id="access-code-copy-btn2">Copy</button></div>`
        : `<p class="hint-text">OnTrack only shows your code once, right after it's created or regenerated, and never stores the plaintext \u2014 so it can't be shown again here. Regenerate if you need a fresh one to use on another device.</p>`
      }
      <p class="hint-text mt-8">This code opens this exact account from any device. Regenerating it immediately invalidates the old one everywhere.</p>
      <p class="cloud-status-line mt-10">${syncStatusLine()}</p>
      <button type="button" class="btn-secondary mt-10" id="regenerate-code-btn">Regenerate code</button>
    `;
    const copyBtn = document.getElementById('access-code-copy-btn2');
    if (copyBtn) copyBtn.addEventListener('click', (e) => copyAccessCode(u.accessCode, e.target));
    document.getElementById('regenerate-code-btn').addEventListener('click', regenerateAccessCodeAction);
  } else {
    el.innerHTML = `
      <p class="input-label">Your access code</p>
      <span class="settings-access-code">${escapeHtml(u.accessCode || '\u2014')}</span>
      <p class="hint-text mt-8"><strong>Local only</strong> \u2014 this code opens this profile on this device only.</p>
      <p class="hint-text">Connect to the cloud to use this same account (and this code) on another device.</p>
      <button type="button" class="btn-primary mt-10" id="connect-cloud-btn">Connect to the cloud</button>
    `;
    document.getElementById('connect-cloud-btn').addEventListener('click', startCloudConnection);
  }
}

async function regenerateAccessCodeAction() {
  if (!confirm('Generate a new access code? The old one will stop working immediately, on every device.')) return;
  const result = await SupabaseAdapter.regenerateAccessCode();
  if (!result.ok) {
    alert('Could not regenerate your code. Check your connection and try again.');
    return;
  }
  const u = getUser();
  u.accessCode = result.accessCode;
  saveData();
  renderAccessCodeSection(u);
}

function updateDisplayName(val) {
  const trimmed = val.trim();
  if (!trimmed) return;
  const u = getUser();
  u.name = trimmed;
  document.getElementById('active-user-name').innerText = trimmed;
  saveData();
}

function setAppearance(value) {
  const u = getUser();
  u.settings.appearance = value;
  saveData();
  applyAppearance();
  document.querySelectorAll('#appearance-segmented .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.value === value));
}

function updateNotificationPref(key, checked) {
  const u = getUser();
  u.settings.notifications[key] = checked;
  saveData();
}

function resetProfile() {
  const u = getUser();
  if (!u) return;
  if (!confirm('Clear all of your habits, skills, logs, and friction history and restart onboarding? This cannot be undone unless you have an export.')) return;
  const kept = newUserShell(u.name);
  kept.id = u.id;
  kept.avatar = u.avatar;
  kept.accessCode = u.accessCode;
  kept.lastSeen = u.lastSeen;
  kept.createdAt = u.createdAt;
  kept.settings = u.settings;
  state.users[u.id] = kept;
  saveData();
  showApp();
}

function clearAllLocalData() {
  if (!confirm('Erase ALL OnTrack data in this browser \u2014 every profile? This cannot be undone unless you have exports.')) return;
  DataStore.adapter.remove(STORAGE_KEY);
  DataStore.clearSession();
  location.reload();
}

/* =========================================================================
   DATA EXPORT / IMPORT
   ========================================================================= */
function exportData() {
  const payload = { version: 3, exportedAt: new Date().toISOString(), ...state };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ontrack_backup.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function validateImportedState(obj) {
  return obj && typeof obj === 'object' && obj.users && typeof obj.users === 'object';
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (!validateImportedState(imported)) {
        throw new Error('File is missing a "users" section.');
      }
      state = { version: 3, session: imported.session || { activeUserId: null }, users: imported.users };
      backfillAccessCodes();
      if (!state.session.activeUserId || !state.users[state.session.activeUserId]) {
        state.session.activeUserId = Object.keys(state.users)[0] || null;
      }
      saveData();
      if (state.session.activeUserId) {
        DataStore.setSessionUserId(state.session.activeUserId);
        afterLogin();
      } else {
        renderAccessScreen();
      }
    } catch (err) {
      alert('That file could not be imported: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };
  fileReader.readAsText(file);
}

/* =========================================================================
   AVATARS
   ========================================================================= */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

function avatarMarkup(user) {
  if (user && user.avatar) return `<img src="${user.avatar}" alt="" class="avatar-img">`;
  return `<span class="avatar-initials">${escapeHtml(getInitials(user ? user.name : ''))}</span>`;
}

function resizeImageToDataUrl(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) { reject(new Error('That file is not an image.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxDim, maxDim);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const dataUrl = await resizeImageToDataUrl(file, 160, 0.82);
    const u = getUser();
    if (!u) return;
    u.avatar = dataUrl;
    const ok = saveData();
    if (!ok) { u.avatar = null; alert("That photo was too large to save. Try a smaller image."); return; }
    refreshAvatarDisplays();
  } catch (err) {
    alert(err.message || 'Could not use that photo.');
  }
}

function removeAvatar() {
  const u = getUser();
  if (!u) return;
  u.avatar = null;
  saveData();
  refreshAvatarDisplays();
}

function refreshAvatarDisplays() {
  const u = getUser();
  if (!u) return;
  const headerAvatar = document.getElementById('header-avatar');
  const profileAvatar = document.getElementById('profile-avatar');
  if (headerAvatar) headerAvatar.innerHTML = avatarMarkup(u);
  if (profileAvatar) profileAvatar.innerHTML = avatarMarkup(u);
}

/* =========================================================================
   EVENT LISTENERS
   ========================================================================= */
function setupEventListeners() {
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  bind('lock-btn', 'click', switchProfile);
  bind('header-avatar-btn', 'click', () => switchTab('profile', document.querySelector('.nav-btn[data-tab="profile"]')));

  bind('add-habit-btn', 'click', addHabit);
  bind('new-habit-input', 'keyup', (e) => { if (e.key === 'Enter') addHabit(); });
  bind('prev-month-btn', 'click', () => changeMonth(-1));
  bind('next-month-btn', 'click', () => changeMonth(1));
  bind('today-btn', 'click', jumpToToday);

  bind('add-skill-btn', 'click', addSkill);
  bind('new-skill-input', 'keyup', (e) => { if (e.key === 'Enter') addSkill(); });

  document.querySelectorAll('.habits-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchHabitsSubTab(btn.dataset.sub));
  });

  bind('export-btn', 'click', exportData);
  bind('import-btn', 'click', () => document.getElementById('import-file').click());
  bind('import-file', 'change', importData);

  bind('display-name-input', 'change', (e) => updateDisplayName(e.target.value));
  bind('restart-onboarding-btn', 'click', () => {
    if (!confirm('Restart onboarding? Your existing habits and skills stay untouched until you finish the new setup.')) return;
    startOnboarding();
  });
  bind('reset-profile-btn', 'click', resetProfile);
  bind('clear-local-btn', 'click', clearAllLocalData);

  bind('avatar-upload-btn', 'click', () => document.getElementById('avatar-file').click());
  bind('avatar-file', 'change', handleAvatarUpload);
  bind('avatar-remove-btn', 'click', removeAvatar);

  const appearanceSeg = document.getElementById('appearance-segmented');
  if (appearanceSeg) {
    appearanceSeg.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.addEventListener('click', () => setAppearance(btn.dataset.value));
    });
  }

  bind('notif-habit-reminders', 'change', (e) => updateNotificationPref('habitReminders', e.target.checked));
  bind('notif-challenge-reminders', 'change', (e) => updateNotificationPref('challengeReminders', e.target.checked));
  bind('notif-weekly-review', 'change', (e) => updateNotificationPref('weeklyReview', e.target.checked));
  bind('notif-daily-checkin', 'change', (e) => updateNotificationPref('dailyCheckin', e.target.checked));

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(btn.dataset.tab, btn));
  });
  document.querySelectorAll('.mnav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, document.querySelector(`.nav-btn[data-tab="${btn.dataset.tab}"]`)));
  });

  const gridBody = document.getElementById('grid-body');
  if (gridBody) {
    gridBody.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell-toggle');
      if (cell) { cycleCompletion(cell.dataset.hid, cell.dataset.date, false); return; }
      const actionBtn = e.target.closest('.habit-action-btn');
      if (actionBtn && !actionBtn.disabled) {
        const hid = actionBtn.dataset.hid;
        const action = actionBtn.dataset.action;
        if (action === 'up') moveHabit(hid, -1);
        else if (action === 'down') moveHabit(hid, 1);
        else if (action === 'delete') deleteHabit(hid);
        return;
      }
      const nameEl = e.target.closest('.habit-name');
      if (nameEl) openHabitDetail(nameEl.dataset.hid);
    });
    gridBody.addEventListener('dblclick', (e) => {
      const nameEl = e.target.closest('.habit-name');
      if (nameEl) startRenameHabit(nameEl.dataset.hid, nameEl);
    });
  }

  const skillsContainer = document.getElementById('skills-container');
  if (skillsContainer) {
    skillsContainer.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.skill-remove-btn');
      const hrsBtn = e.target.closest('.add-hrs-btn');
      const evBtn = e.target.closest('.skill-evidence-btn');
      if (removeBtn) removeSkill(removeBtn.dataset.sid);
      else if (hrsBtn) updateHours(hrsBtn.dataset.sid, parseFloat(hrsBtn.dataset.hrs));
      else if (evBtn) {
        const input = skillsContainer.querySelector(`.skill-evidence-input[data-sid="${evBtn.dataset.sid}"]`);
        if (input) { addSkillEvidence(evBtn.dataset.sid, input.value); input.value = ''; }
      }
    });
  }

  bind('failure-note-submit', 'click', () => {
    if (pendingMissCell) submitFailureReason('Other');
  });

  bind('habit-detail-close', 'click', () => document.getElementById('habit-detail-modal').classList.add('hidden'));
  bind('weekly-review-close', 'click', () => document.getElementById('weekly-review-modal').classList.add('hidden'));
}

window.onload = init;
