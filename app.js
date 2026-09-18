/* =========================================================================
   ONTRACK — app.js
   Local-first personal accountability system.
   Vanilla JS, no build step. Data lives in localStorage under 'ontrack_data'.
   ========================================================================= */

const STORAGE_KEY = 'ontrack_data';
const SESSION_KEY = 'ontrack_session';
const LEGACY_DATA_KEY = 'four_keys_data';
const LEGACY_SESSION_KEY = 'four_keys_session';
const DEFAULT_GROUP_ID = 'default';
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS = { DONE: 'done', ADJUSTED: 'adjusted', MISSED: 'missed' };

/* -------------------------------------------------------------------------
   ONBOARDING CATALOG
   Categories + items exactly as specified. `private: true` categories
   (sexuality & identity) are never surfaced to the Group under any
   circumstance.
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

const FRICTION_BLOCKERS = [
  "I forget", "I lose motivation", "I get distracted", "I overthink",
  "I don't have enough time", "I get overwhelmed", "I avoid uncomfortable things",
  "I start strong and fade", "I don't know where to start", "My environment makes it difficult"
];

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
    frictionPatterns: ["Distraction", "I avoid uncomfortable things"]
  },
  digital_life: {
    habits: ["No phone in the first 20 minutes of the day", "Use grayscale mode during work/study hours",
      "One screen-free hour before bed"],
    skills: ["Attention control", "Digital boundaries"],
    watchFor: ["Checking notifications the instant you wake up", "Opening an app out of boredom, not intent"],
    frictionPatterns: ["Distraction", "I forget"]
  },
  money_independence: {
    habits: ["Log every purchase for the day", "Wait 24 hours before a non-essential purchase",
      "Review spending once a week"],
    skills: ["Budgeting", "Delayed gratification"],
    watchFor: ["Buying something to match what others have", "Avoiding looking at your balance"],
    frictionPatterns: ["Avoidance", "Poor planning"]
  },
  school_career: {
    habits: ["Study in one uninterrupted 25-minute block", "Spend 15 minutes on your portfolio or resume",
      "Write tomorrow's top study priority tonight"],
    skills: ["Time management", "Deep work"],
    watchFor: ["Opening social apps mid-study session", "Waiting for motivation instead of starting"],
    frictionPatterns: ["Distraction", "Poor planning"]
  },
  lifestyle: {
    habits: ["Lights out by a consistent time", "20-minute walk outside", "Drink water before your first coffee"],
    skills: ["Routine building", "Energy management"],
    watchFor: ["Staying up scrolling past your bedtime target", "Skipping meals when busy"],
    frictionPatterns: ["Fatigue", "Poor planning"]
  },
  emotional_regulation: {
    habits: ["10-minute decompression after a stressful event", "Note today's emotional trigger in one line",
      "Pause 10 seconds before responding when upset"],
    skills: ["Emotional regulation", "De-escalation"],
    watchFor: ["Responding immediately while still activated", "Holding a grudge instead of naming it"],
    frictionPatterns: ["Overthinking", "I get overwhelmed"]
  },
  purpose_life: {
    habits: ["Spend 20 minutes on a long-term goal", "Weekly review of what mattered this week",
      "Read 10 pages toward something you care about"],
    skills: ["Self-reflection", "Long-term thinking"],
    watchFor: ["Chasing short-term distraction over long-term goals", "Letting fear of failure stall a start"],
    frictionPatterns: ["No motivation", "I don't know where to start"]
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
     id, name, avatar, createdAt, lastSeen, onboarded, groupId,
     habits: [{id,name,description,category,frequency:{type,days},createdAt,active,reminder}],
     completions: { "habitId__YYYY-MM-DD": "done"|"adjusted"|"missed" },
     skills: [{id,name,description,progress,hours,relatedProblem,evidence:[{id,date,text}]}],
     friction: [{id,habitId,habitNameSnapshot,date,reason,note}],
     watchFor: [string],
     onboardingSelections: { problems, priorities, impact, blockers } -- PRIVATE, never shown to group,
     activityLog: [{id,habitId,habitName,date,at}] -- for group activity feed,
     weeklyReviews: [{weekKey,reflection,createdAt,snapshot}],
     settings: { appearance, notifications:{...}, privacy:{...} }
   }
   groups[groupId] = { id, name, createdAt, members:[userId] }
   ------------------------------------------------------------------------- */
function defaultState() {
  return {
    version: 2,
    session: { activeUserId: null },
    users: {},
    groups: {
      [DEFAULT_GROUP_ID]: { id: DEFAULT_GROUP_ID, name: 'OnTrack', createdAt: Date.now(), members: [] }
    }
  };
}

let state = defaultState();
let pendingMissCell = null;
let onboard = { step: 1, problems: [], priorities: [], impact: {}, blockers: [] };
let currentTab = 'today';

const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth() + 1;

/* ---------- ID generation ---------- */
function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
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
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/* =========================================================================
   DATA LAYER — StorageAdapter + DataStore
   This is the clean seam for a future backend swap:

     UI  →  OnTrack logic  →  DataStore  →  StorageAdapter  →  localStorage

   Today StorageAdapter is a thin synchronous localStorage wrapper. Later,
   a SupabaseAdapter can implement the same four methods (read/write/remove
   for the app-state blob, plus the session helpers) — at that point
   DataStore's methods would become async and callers would `await` them,
   but nothing above DataStore (rendering, calculations, event handlers)
   would need to change shape. No network calls, no env vars, and no fake
   "online" state are introduced here — this is purely a seam, not a
   backend.
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

const DataStore = {
  adapter: StorageAdapter,

  loadState() {
    const parsed = this.adapter.read(STORAGE_KEY);
    if (parsed && parsed.users && parsed.groups) return parsed;
    return null;
  },
  saveState(nextState) {
    return this.adapter.write(STORAGE_KEY, nextState);
  },

  getSessionUserId() {
    return this.adapter.readRaw(SESSION_KEY);
  },
  setSessionUserId(userId) {
    return this.adapter.writeRaw(SESSION_KEY, userId);
  },
  clearSession() {
    return this.adapter.remove(SESSION_KEY);
  },

  // Legacy (pre-rebuild) keys — read-only, used once by migration.
  readLegacyState() {
    return this.adapter.read(LEGACY_DATA_KEY);
  },
  readLegacySessionKey() {
    return this.adapter.readRaw(LEGACY_SESSION_KEY);
  },
  clearLegacy() {
    this.adapter.remove(LEGACY_DATA_KEY);
    this.adapter.remove(LEGACY_SESSION_KEY);
  }
};

/* =========================================================================
   PERSISTENCE + MIGRATION
   saveData()/loadData() stay as the call sites used throughout the rest of
   this file — they just delegate to DataStore now instead of talking to
   localStorage directly.
   ========================================================================= */
function saveData() {
  return DataStore.saveState(state);
}

function loadData() {
  const parsed = DataStore.loadState();
  if (parsed) {
    state = parsed;
    ensureDefaultGroup();
    backfillAccessCodes();
    return true;
  }
  return false;
}

function ensureDefaultGroup() {
  if (!state.groups) state.groups = {};
  if (!state.groups[DEFAULT_GROUP_ID]) {
    state.groups[DEFAULT_GROUP_ID] = { id: DEFAULT_GROUP_ID, name: 'OnTrack', createdAt: Date.now(), members: [] };
  }
}

/* ---------- Access codes ----------
   A short, human-typeable code that identifies a profile, in the spirit of
   the original OnTrack passkey — but generated per real profile instead of
   pointing at a hardcoded Friend1..8 list. Excludes visually ambiguous
   characters (0/O, 1/I/L). */
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateAccessCodeCandidate() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ACCESS_CODE_ALPHABET[Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length)];
  }
  return code;
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
    groupId: DEFAULT_GROUP_ID,
    habits: [],
    completions: {},
    skills: [],
    friction: [],
    watchFor: [],
    onboardingSelections: null,
    activityLog: [],
    weeklyReviews: [],
    settings: {
      appearance: 'system',
      notifications: { habitReminders: true, dailyCheckin: true, weeklyReview: true, groupActivity: false },
      privacy: { groupVisibility: true, activityVisibility: true, profileVisibility: true }
    }
  };
}

/* Legacy schema (v1): a single 'four_keys_data' key with hardcoded
   friend1..friend8 profiles, index-based habit logs, and a stake system.
   We migrate what we reasonably can:
     - the profile behind the last active session key becomes a real user
     - other never-onboarded demo friend slots are dropped (they were never
       real people — fake Friend 1..8 placeholders are explicitly forbidden
       in the new model)
     - any friend slot that WAS onboarded (i.e. actually used) is preserved
       as its own real user so no real history is silently discarded
     - index-based logs are remapped onto newly-generated stable habit IDs
     - stake data is discarded entirely (feature removed) */
/* The original app's hardcoded passkey table. It never lived in saved
   data (it was a constant in the old app.js), so it can't be read back —
   but since it's fixed, mirroring it here lets migration hand each
   recovered profile back its real original code, and correctly figure out
   which profile was last logged in (the old session key stored the code
   itself, e.g. "AX7K2M", not the profile's internal key). */
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
    // Skip demo friend slots that were never actually used.
    if (/^friend\d+$/.test(pKey) && !oldProfile.onboarded) return;
    if (!oldProfile.onboarded && !(oldProfile.habits && oldProfile.habits.length)) return;

    const user = newUserShell(oldProfile.name || 'Migrated profile');
    user.avatar = oldProfile.avatar || null;
    user.onboarded = !!oldProfile.onboarded;
    user.lastSeen = oldProfile.lastSeen || null;
    // Hand the profile back its real original access code where we know
    // it, so a returning user can still log in with the code they had.
    user.accessCode = LEGACY_KEYS_REVERSE[pKey] || genAccessCode();

    // Old habits were plain strings at fixed array indexes. Give each a
    // stable ID and keep a map from old index -> new ID for log remapping.
    const idxToId = {};
    (oldProfile.habits || []).forEach((habitName, idx) => {
      const h = {
        id: genId('habit'),
        name: habitName,
        description: '',
        category: '',
        frequency: { type: 'daily' },
        createdAt: Date.now(),
        active: true,
        reminder: null
      };
      user.habits.push(h);
      idxToId[idx] = h.id;
    });

    // Old logs: "hIdx-YYYY-MM-DD" -> '✓' | '~' | '✕'
    const statusMap = { '✓': STATUS.DONE, '~': STATUS.ADJUSTED, '✕': STATUS.MISSED };
    Object.keys(oldProfile.logs || {}).forEach(key => {
      const parts = key.split('-');
      if (parts.length !== 4) return; // drop unrecognized/very old formats safely
      const [hIdxStr, y, m, d] = parts;
      const habitId = idxToId[Number(hIdxStr)];
      if (!habitId) return;
      const status = statusMap[oldProfile.logs[key]];
      if (!status) return;
      user.completions[`${habitId}__${dateKey(Number(y), Number(m), Number(d))}`] = status;
    });

    (oldProfile.skills || []).forEach(s => {
      user.skills.push({
        id: genId('skill'), name: s.name || 'Skill', description: '',
        progress: s.progress || 0, hours: s.hours || 0, relatedProblem: '', evidence: []
      });
    });

    // Old "friction" mixed real misses with seeded watch-for strings
    // (seed:true). Only real misses become friction history.
    (oldProfile.friction || []).forEach(f => {
      if (f && f.seed) {
        if (f.reason) user.watchFor.push(f.reason);
        return;
      }
      if (!f || !f.date) return;
      const habitId = f.habit ? (user.habits.find(h => h.name === f.habit) || {}).id : null;
      user.friction.push({
        id: genId('fric'), habitId: habitId || null, habitNameSnapshot: f.habit || '',
        date: f.date, reason: f.reason || 'Other', note: ''
      });
    });

    state.users[user.id] = user;
    state.groups[DEFAULT_GROUP_ID].members.push(user.id);
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

function getUser() {
  return state.users[state.session.activeUserId] || null;
}

function getGroup(user) {
  const gid = (user && user.groupId) || DEFAULT_GROUP_ID;
  return state.groups[gid] || state.groups[DEFAULT_GROUP_ID];
}

function touchLastSeen() {
  const u = getUser();
  if (!u) return;
  u.lastSeen = Date.now();
  saveData();
}

/* =========================================================================
   HABIT DUE / CONSISTENCY / STREAK — single source of truth.
   Today, Progress, Group, and Habit Detail all call these same functions
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

// Iterates the due dates for a single habit between its creation date and
// `to` (default: today), never counting future dates.
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

// Central consistency calculator.
// opts: { habitId?: string, from?: Date, to?: Date }
// Returns null when there's not enough data yet (no expected opportunities).
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
      // Only count a day as an "opportunity" once it has actually arrived
      // (today counts) so future due-dates never drag consistency down.
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

// Per-habit current streak: walk backward from today; today is forgiven if
// not yet logged (so you don't lose your streak before you've had a chance
// to check in). Stops the moment a past due day was missed or left blank.
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

// Longest streak for a single habit across its full history.
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

// Overall (all-habits) streak: a calendar day counts as "clean" if every
// habit due that day was completed (done/adjusted) and none were missed.
// A day with zero due habits doesn't break or extend the streak.
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

function isOnline(lastSeen) {
  return !!lastSeen && (Date.now() - lastSeen) <= ONLINE_THRESHOLD_MS;
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
   Restores the original Access Code idea (a short code that gets you into
   a profile) on top of the real per-user architecture: every profile has
   its own generated code instead of a hardcoded Friend1..8 table. This is
   still local-first, not real auth — no fake backend, no fake cross-device
   sync — but it gives the "type in your code" flow back, plus a quick-pick
   list of profiles already used on this device. Real backend auth can
   slot in later behind DataStore/getUser()/saveData().
   ========================================================================= */
function init() {
  loadData();
  migrateLegacyIfPresent();
  ensureDefaultGroup();
  backfillAccessCodes();
  setupEventListeners();
  setupCrossTabSync();
  applyAppearance();

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

function afterLogin() {
  const u = getUser();
  if (!u) { renderAccessScreen(); return; }
  u.lastSeen = Date.now();
  DataStore.setSessionUserId(u.id);
  saveData();
  startPresenceHeartbeat();
  showApp();
}

// mode: 'picker' (default) shows existing profiles + code entry + New
// Profile. isSwitch just changes the heading copy; the picker itself is
// identical either way — Switch must never skip straight to profile
// creation when profiles already exist.
function renderAccessScreen(isSwitch) {
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('onboarding-screen').classList.add('hidden');
  const accessScreen = document.getElementById('access-screen');
  accessScreen.classList.remove('hidden');
  accessScreen.style.display = 'flex';

  const users = Object.values(state.users).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  const card = document.getElementById('access-card');

  if (users.length === 0) {
    renderCreateProfileForm(card, true);
    return;
  }

  card.innerHTML = `
    <p class="eyebrow">OnTrack</p>
    <h1 class="auth-title">${isSwitch ? 'Switch profile' : "Who's this?"}</h1>
    <p class="auth-sub">Choose a profile on this device, or enter an access code.</p>
    <div class="profile-picker-list">
      ${users.map(u => `
        <button type="button" class="profile-pick-btn" data-uid="${u.id}">
          <span class="avatar avatar-md">${avatarMarkup(u)}</span>
          <span class="profile-pick-name">${escapeHtml(u.name)}</span>
        </button>
      `).join('')}
    </div>

    <div class="access-code-block">
      <p class="input-label">Have an access code?</p>
      <input type="text" id="access-code-input" class="input-field access-code-field" placeholder="XXXXXX" maxlength="6" autocomplete="off">
      <button type="button" class="btn-secondary full-width mt-10" id="access-code-submit">Continue with code</button>
      <p id="access-code-error" class="error-msg hidden">That access code doesn't match a profile on this device.</p>
    </div>

    <button type="button" class="btn-primary mt-14" id="new-profile-btn">+ New profile</button>
  `;
  card.querySelectorAll('.profile-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.session.activeUserId = btn.dataset.uid;
      afterLogin();
    });
  });
  const newBtn = document.getElementById('new-profile-btn');
  if (newBtn) newBtn.addEventListener('click', () => renderCreateProfileForm(card, false));

  const codeInput = document.getElementById('access-code-input');
  const submitCode = () => {
    const match = findUserByAccessCode(codeInput.value);
    if (!match) { document.getElementById('access-code-error').classList.remove('hidden'); return; }
    document.getElementById('access-code-error').classList.add('hidden');
    state.session.activeUserId = match.id;
    afterLogin();
  };
  document.getElementById('access-code-submit').addEventListener('click', submitCode);
  codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase(); });
  codeInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') submitCode(); });
}

function renderCreateProfileForm(card, isFirstEver) {
  card.innerHTML = `
    <p class="eyebrow">${isFirstEver ? 'Welcome' : 'New profile'}</p>
    <h1 class="auth-title">${isFirstEver ? 'Set up OnTrack' : 'Create a profile'}</h1>
    <p class="auth-sub">${isFirstEver
      ? 'OnTrack lives only in this browser. Give this profile a name to get started.'
      : 'Everyone using this browser gets their own private profile in the same group.'}</p>
    <input type="text" id="new-profile-name" class="input-field" style="text-align:left;letter-spacing:normal;" placeholder="Your name" autocomplete="off">
    <button id="create-profile-btn" type="button" class="btn-primary">Continue</button>
    <p id="profile-error" class="error-msg hidden">Enter a name to continue.</p>
    ${!isFirstEver ? '<button type="button" class="btn-secondary full-width mt-10" id="back-to-picker-btn">Back</button>' : ''}
    ${isFirstEver ? `<div class="access-code-block">
      <p class="input-label">Already have an access code from before?</p>
      <input type="text" id="access-code-input" class="input-field access-code-field" placeholder="XXXXXX" maxlength="6" autocomplete="off">
      <button type="button" class="btn-secondary full-width mt-10" id="access-code-submit">Continue with code</button>
      <p id="access-code-error" class="error-msg hidden">That access code doesn't match a profile on this device.</p>
    </div>` : ''}
  `;
  const submit = () => {
    const val = document.getElementById('new-profile-name').value.trim();
    if (!val) { document.getElementById('profile-error').classList.remove('hidden'); return; }
    createProfile(val);
  };
  document.getElementById('create-profile-btn').addEventListener('click', submit);
  document.getElementById('new-profile-name').addEventListener('keyup', (e) => { if (e.key === 'Enter') submit(); });
  const backBtn = document.getElementById('back-to-picker-btn');
  if (backBtn) backBtn.addEventListener('click', () => renderAccessScreen(false));

  const codeInput = document.getElementById('access-code-input');
  if (codeInput) {
    const submitCode = () => {
      const match = findUserByAccessCode(codeInput.value);
      if (!match) { document.getElementById('access-code-error').classList.remove('hidden'); return; }
      document.getElementById('access-code-error').classList.add('hidden');
      state.session.activeUserId = match.id;
      afterLogin();
    };
    document.getElementById('access-code-submit').addEventListener('click', submitCode);
    codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase(); });
    codeInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') submitCode(); });
  }
}

function createProfile(name) {
  const user = newUserShell(name);
  user.accessCode = genAccessCode();
  state.users[user.id] = user;
  ensureDefaultGroup();
  if (!state.groups[DEFAULT_GROUP_ID].members.includes(user.id)) {
    state.groups[DEFAULT_GROUP_ID].members.push(user.id);
  }
  state.session.activeUserId = user.id;
  saveData();
  renderAccessCodeReveal(user);
}

function renderAccessCodeReveal(user) {
  const card = document.getElementById('access-card');
  card.innerHTML = `
    <p class="eyebrow">Profile created</p>
    <h1 class="auth-title">Save your access code</h1>
    <p class="auth-sub">This is how you'll get back into this exact profile on this or another device later. OnTrack can't recover it for you if it's lost.</p>
    <div class="access-code-reveal">${escapeHtml(user.accessCode)}</div>
    <button type="button" class="btn-primary mt-14" id="access-code-continue">I've saved it \u2014 continue</button>
  `;
  document.getElementById('access-code-continue').addEventListener('click', afterLogin);
}

function switchProfile() {
  touchLastSeen();
  stopPresenceHeartbeat();
  DataStore.clearSession();
  state.session.activeUserId = null;
  document.getElementById('app-screen').classList.add('hidden');
  renderAccessScreen(true);
}

/* ---------- Presence + cross-tab sync (same-browser only) ---------- */
let presenceInterval = null;
function startPresenceHeartbeat() {
  stopPresenceHeartbeat();
  presenceInterval = setInterval(() => {
    touchLastSeen();
    if (currentTab === 'group') renderGroup();
  }, 30000);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', touchLastSeen);
}
function stopPresenceHeartbeat() {
  if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('beforeunload', touchLastSeen);
}
function handleVisibilityChange() { if (!document.hidden) touchLastSeen(); }

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
    if (currentTab === 'group') renderGroup();
    if (currentTab === 'today') renderToday();
  });
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
   ONBOARDING WIZARD
   Step 1: pick problems across categories.
   Step 2: narrow to top 3-5 priorities.
   Step 3: rate how much each priority affects them (Low/Med/High).
   Step 4: what usually gets in the way (feeds the friction system).
   Step 5: generated system summary.
   ========================================================================= */
function startOnboarding() {
  onboard = { step: 1, problems: [], priorities: [], impact: {}, blockers: [] };
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('access-screen').classList.add('hidden');
  const screen = document.getElementById('onboarding-screen');
  screen.classList.remove('hidden');
  screen.style.display = 'flex';
  renderOnboardStep();
}

function onboardProgressDots() {
  let dots = '<div class="onboard-progress">';
  for (let i = 1; i <= 5; i++) dots += `<span class="onboard-dot ${i <= onboard.step ? 'active' : ''}"></span>`;
  return dots + '</div>';
}

function renderOnboardStep() {
  const card = document.getElementById('onboarding-card');
  if (onboard.step === 1) renderOnboardStep1(card);
  else if (onboard.step === 2) renderOnboardStep2(card);
  else if (onboard.step === 3) renderOnboardStep3(card);
  else if (onboard.step === 4) renderOnboardStep4(card);
  else renderOnboardStep5(card);
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
          ${cat.private ? `<p class="hint-text onboard-private-note">${escapeHtml(cat.note)} This category is never shown to your Group.</p>` : ''}
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
      const el = document.getElementById(`items-${head.dataset.cat}`);
      el.classList.toggle('hidden');
    });
  });
  card.querySelectorAll('.onboard-items input[type=checkbox]').forEach(cb => {
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
  document.getElementById('onboard-next-1').addEventListener('click', () => { onboard.step = 2; renderOnboardStep(); });
}

function updateOnboardCounts() {
  ONBOARDING_CATEGORIES.forEach(cat => {
    const n = onboard.problems.filter(p => p.catId === cat.id).length;
    const el = document.getElementById(`count-${cat.id}`);
    if (el) el.textContent = n > 0 ? String(n) : '';
  });
}

function renderOnboardStep2(card) {
  const MAX = 5;
  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">Step 2</p>
    <h2>What matters most right now?</h2>
    <p class="onboard-sub">Choose 3&ndash;5 priorities from what you picked. This keeps your system focused instead of overwhelming.</p>
    <div class="onboard-items" id="priority-items">
      ${onboard.problems.map(p => `
        <label class="onboard-item"><input type="checkbox" value="${escapeHtml(p.key)}" ${onboard.priorities.includes(p.key) ? 'checked' : ''}> ${escapeHtml(p.label)}</label>
      `).join('')}
    </div>
    <p class="hint-text" id="priority-count-note"></p>
    <div class="flex-gap-8 mt-14">
      <button type="button" class="btn-secondary" id="onboard-back-2">Back</button>
      <button type="button" class="btn-primary" id="onboard-next-2" disabled>Continue</button>
    </div>
  `;
  const updateNote = () => {
    const n = onboard.priorities.length;
    document.getElementById('priority-count-note').textContent = `${n} selected (pick ${MAX - n > 0 ? 'up to ' + (MAX - n) + ' more' : 'no more \u2014 limit reached'})`;
    document.getElementById('onboard-next-2').disabled = n < 3;
  };
  card.querySelectorAll('#priority-items input').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (onboard.priorities.length >= MAX) { cb.checked = false; return; }
        onboard.priorities.push(cb.value);
      } else {
        onboard.priorities = onboard.priorities.filter(k => k !== cb.value);
      }
      updateNote();
    });
  });
  updateNote();
  document.getElementById('onboard-back-2').addEventListener('click', () => { onboard.step = 1; renderOnboardStep(); });
  document.getElementById('onboard-next-2').addEventListener('click', () => { onboard.step = 3; renderOnboardStep(); });
}

function renderOnboardStep3(card) {
  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">Step 3</p>
    <h2>How much is this affecting you right now?</h2>
    <p class="onboard-sub">Rate each priority.</p>
    <div class="onboard-impact-list">
      ${onboard.priorities.map(key => {
        const p = onboard.problems.find(pp => pp.key === key);
        return `
        <div class="impact-row">
          <span class="impact-label">${escapeHtml(p ? p.label : key)}</span>
          <div class="segmented impact-segmented" data-key="${escapeHtml(key)}">
            <button type="button" class="segmented-btn" data-value="Low">Low</button>
            <button type="button" class="segmented-btn" data-value="Medium">Medium</button>
            <button type="button" class="segmented-btn" data-value="High">High</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="flex-gap-8 mt-14">
      <button type="button" class="btn-secondary" id="onboard-back-3">Back</button>
      <button type="button" class="btn-primary" id="onboard-next-3">Continue</button>
    </div>
  `;
  card.querySelectorAll('.impact-segmented').forEach(seg => {
    const key = seg.dataset.key;
    seg.querySelectorAll('.segmented-btn').forEach(btn => {
      if (onboard.impact[key] === btn.dataset.value) btn.classList.add('active');
      btn.addEventListener('click', () => {
        onboard.impact[key] = btn.dataset.value;
        seg.querySelectorAll('.segmented-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  });
  document.getElementById('onboard-back-3').addEventListener('click', () => { onboard.step = 2; renderOnboardStep(); });
  document.getElementById('onboard-next-3').addEventListener('click', () => { onboard.step = 4; renderOnboardStep(); });
}

function renderOnboardStep4(card) {
  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">Step 4</p>
    <h2>What usually gets in your way?</h2>
    <p class="onboard-sub">Pick whatever tends to happen. This feeds your friction system.</p>
    <div class="onboard-items">
      ${FRICTION_BLOCKERS.map(b => `
        <label class="onboard-item"><input type="checkbox" value="${escapeHtml(b)}" ${onboard.blockers.includes(b) ? 'checked' : ''}> ${escapeHtml(b)}</label>
      `).join('')}
    </div>
    <div class="flex-gap-8 mt-14">
      <button type="button" class="btn-secondary" id="onboard-back-4">Back</button>
      <button type="button" class="btn-primary" id="onboard-next-4">Generate my system</button>
    </div>
  `;
  card.querySelectorAll('.onboard-items input').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) onboard.blockers.push(cb.value);
      else onboard.blockers = onboard.blockers.filter(b => b !== cb.value);
    });
  });
  document.getElementById('onboard-back-4').addEventListener('click', () => { onboard.step = 3; renderOnboardStep(); });
  document.getElementById('onboard-next-4').addEventListener('click', () => {
    onboard.step = 5;
    generateSystemFromOnboarding();
    renderOnboardStep();
  });
}

function renderOnboardStep5(card) {
  const u = getUser();
  card.innerHTML = `
    ${onboardProgressDots()}
    <p class="eyebrow">Ready</p>
    <h2>Your starting system is ready.</h2>
    <p class="onboard-sub">Based on what you picked, OnTrack generated a focused set of habits, skills, and things to watch for. Edit or remove anything &mdash; this is just a starting point.</p>
    <div class="onboard-summary">
      <div class="onboard-summary-block">
        <p class="input-label">Habits</p>
        <ul>${u.habits.map(h => `<li>${escapeHtml(h.name)}</li>`).join('')}</ul>
      </div>
      <div class="onboard-summary-block">
        <p class="input-label">Skills</p>
        <ul>${u.skills.map(s => `<li>${escapeHtml(s.name)}</li>`).join('')}</ul>
      </div>
      <div class="onboard-summary-block">
        <p class="input-label">Things to watch for</p>
        <ul>${u.watchFor.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
      </div>
    </div>
    <button type="button" class="btn-primary mt-14" id="onboard-finish">Go to Today</button>
  `;
  document.getElementById('onboard-finish').addEventListener('click', () => {
    document.getElementById('onboarding-screen').classList.add('hidden');
    showApp();
  });
}

// Priorities determine which categories seed content (capped so the user
// doesn't get "homework"): up to 2 habits + 1 skill + up to 2 watch-fors
// per touched category, overall habit count capped at 8.
function generateSystemFromOnboarding() {
  const u = getUser();
  if (!u) return;

  u.habits = [];
  u.skills = [];
  u.watchFor = [];
  u.friction = [];

  const touchedCategories = [...new Set(onboard.priorities.map(k => k.split('::')[0]))];
  const seenHabitNames = new Set();
  const seenSkillNames = new Set();

  touchedCategories.forEach(catId => {
    const preset = CATEGORY_PRESETS[catId];
    if (!preset) return;
    preset.habits.slice(0, 2).forEach(name => {
      if (u.habits.length >= 8 || seenHabitNames.has(name)) return;
      seenHabitNames.add(name);
      u.habits.push({
        id: genId('habit'), name, description: '', category: catId,
        frequency: { type: 'daily' }, createdAt: Date.now(), active: true, reminder: null
      });
    });
    preset.skills.slice(0, 1).forEach(name => {
      if (seenSkillNames.has(name)) return;
      seenSkillNames.add(name);
      u.skills.push({ id: genId('skill'), name, description: '', progress: 0, hours: 0, relatedProblem: catId, evidence: [] });
    });
    preset.watchFor.slice(0, 2).forEach(w => { if (!u.watchFor.includes(w)) u.watchFor.push(w); });
  });

  u.onboardingSelections = {
    problems: onboard.problems.map(p => p.key),
    priorities: onboard.priorities,
    impact: onboard.impact,
    blockers: onboard.blockers,
    completedAt: Date.now()
  };

  u.onboarded = true;
  saveData();
}

/* =========================================================================
   APP SHELL / TAB SWITCHING
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

const ALL_TABS = ['today', 'habits', 'skills', 'progress', 'friction', 'group', 'settings'];

function switchTab(tab, clickedBtn) {
  currentTab = tab;
  ALL_TABS.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== tab);
  });

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  if (tab === 'today') renderToday();
  if (tab === 'habits') renderHabits();
  if (tab === 'skills') renderSkills();
  if (tab === 'progress') renderProgress();
  if (tab === 'friction') renderFriction();
  if (tab === 'group') renderGroup();
  if (tab === 'settings') populateSettingsForm();
}

/* =========================================================================
   TODAY DASHBOARD
   ========================================================================= */
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
        <p class="empty-note mt-10">No habits yet.</p>
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

  const friction = frictionAnalytics(u, 7);
  const topFriction = friction.top;

  container.innerHTML = `
    <div class="panel today-header-panel">
      <p class="eyebrow">${escapeHtml(MONTH_NAMES[now.getMonth()])} ${now.getDate()}, ${now.getFullYear()}</p>
      <h2 class="today-greeting">${greeting}, ${escapeHtml(firstName)}.</h2>
      <div class="today-progress-row">
        <span class="today-progress-fraction">${doneCount} / ${dueToday.length} complete</span>
        <div class="progress-bar-bg today-progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="today-progress-pct">${pct}%</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Today's habits</div>
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

    <div class="today-stat-cards">
      <div class="panel today-stat-card">
        <span class="stat-value">${current}</span>
        <span class="stat-label">Current streak (days)</span>
      </div>
      <div class="panel today-stat-card">
        <span class="stat-value">${topFriction ? topFriction.reason : '\u2014'}</span>
        <span class="stat-label">Most common friction this week</span>
        ${topFriction ? `<button type="button" class="btn-secondary today-mini-link" id="today-view-friction">View friction</button>` : ''}
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Quick actions</div>
      <div class="today-quick-actions">
        <button type="button" class="btn-secondary" data-tab="habits" id="qa-add-habit">Add habit</button>
        <button type="button" class="btn-secondary" data-tab="friction" id="qa-log-friction">Log friction</button>
        <button type="button" class="btn-secondary" data-tab="progress" id="qa-view-progress">View progress</button>
        <button type="button" class="btn-secondary" data-tab="skills" id="qa-view-skills">View skills</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.today-habit-toggle').forEach(btn => {
    btn.addEventListener('click', () => cycleCompletion(btn.dataset.habit, dStr, true));
  });
  container.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, document.querySelector(`.nav-btn[data-tab="${btn.dataset.tab}"]`)));
  });
  const viewFrictionBtn = document.getElementById('today-view-friction');
  if (viewFrictionBtn) viewFrictionBtn.addEventListener('click', () => switchTab('friction', document.querySelector('.nav-btn[data-tab="friction"]')));
}

/* =========================================================================
   HABITS — monthly grid (preserved UX) + CRUD + detail modal
   ========================================================================= */
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
    tr.innerHTML = `<td class="sticky-col">
      <div class="habit-cell">
        <span class="habit-name" data-hid="${habit.id}" title="Click for details">${escapeHtml(habit.name)}</span>
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
      tr.innerHTML += `<td class="${isToday ? 'is-today' : ''}"><div class="cell-toggle ${classCss}" data-hid="${habit.id}" data-date="${dStr}">${mark}</div></td>`;
    }
    body.appendChild(tr);
  });
}

// Cycles a single day's status for a habit: empty -> done -> adjusted -> missed -> empty.
// Missing triggers the friction modal. `rerenderToday` lets Today's own
// toggle re-render itself instead of the grid.
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
  if (next === STATUS.DONE) logActivity(u, habitId, dStr);
  saveData();
  if (rerenderToday) renderToday(); else renderHabits();
  if (currentTab === 'today') renderToday();
}

function logActivity(u, habitId, dStr) {
  const habit = u.habits.find(h => h.id === habitId);
  if (!habit) return;
  u.activityLog = u.activityLog || [];
  u.activityLog.push({ id: genId('act'), habitId, habitName: habit.name, date: dStr, at: Date.now() });
  if (u.activityLog.length > 60) u.activityLog = u.activityLog.slice(-60);
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
    id: genId('fric'), habitId: pendingMissCell.habitId,
    habitNameSnapshot: habit ? habit.name : '', date: pendingMissCell.dStr,
    reason, note
  });
  pendingMissCell = null;
  document.getElementById('failure-modal').classList.add('hidden');
  saveData();
  renderHabits();
  if (currentTab === 'today') renderToday();
  if (currentTab === 'friction') renderFriction();
}

function addHabit() {
  const input = document.getElementById('new-habit-input');
  const val = input.value.trim();
  if (!val) return;
  const u = getUser();
  u.habits.push({
    id: genId('habit'), name: val, description: '', category: '',
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
   SKILLS — things you're getting better at (distinct from habits)
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
    container.innerHTML = '<p class="empty-note">No skills yet. Your onboarding can generate some based on what you\'re working on, or add one below.</p>';
    return;
  }

  u.skills.forEach(skill => {
    const card = document.createElement('div');
    card.className = 'panel skill-card';
    card.innerHTML = `
      <div class="skill-header">
        <span class="skill-title">${escapeHtml(skill.name)}</span>
        <button class="btn-secondary skill-remove-btn" type="button" data-sid="${skill.id}">Remove</button>
      </div>
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${skill.progress}%"></div></div>
      <div class="skill-meta">${skillLevelLabel(skill.progress)} &middot; ${skill.progress}%</div>
      <div class="flex-gap-8 mb-8">
        <button class="btn-secondary add-hrs-btn" type="button" data-sid="${skill.id}" data-hrs="0.5">+0.5h practice</button>
        <button class="btn-secondary add-hrs-btn" type="button" data-sid="${skill.id}" data-hrs="1">+1h practice</button>
      </div>
      <div class="skill-evidence-list">
        ${(skill.evidence || []).slice().reverse().slice(0, 4).map(ev => `<p class="hint-text">&bull; ${escapeHtml(ev.text)}</p>`).join('')}
      </div>
      <div class="inline-form">
        <input type="text" class="inline-input skill-evidence-input" data-sid="${skill.id}" placeholder="Add evidence of progress\u2026">
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
  u.skills.push({ id: genId('skill'), name: val, description: '', progress: 0, hours: 0, relatedProblem: '', evidence: [] });
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

function renderFriction() {
  const u = getUser();
  const analyticsEl = document.getElementById('friction-analytics');
  const list = document.getElementById('friction-log-list');
  if (!u || !analyticsEl || !list) return;

  const stats = frictionAnalytics(u, 30);

  if (stats.total === 0) {
    analyticsEl.innerHTML = '<p class="empty-note">No friction logged yet. When a habit doesn\'t happen, log what got in the way and patterns will show up here.</p>';
  } else {
    analyticsEl.innerHTML = `
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
   PROGRESS
   ========================================================================= */
function renderProgress() {
  const u = getUser();
  const summaryEl = document.getElementById('progress-summary');
  const chartEl = document.getElementById('progress-chart');
  const habitsEl = document.getElementById('progress-habits');
  if (!u || !summaryEl || !chartEl || !habitsEl) return;

  const overall = calcConsistency(u, {});
  if (!overall) {
    summaryEl.innerHTML = '<p class="empty-note">Keep checking in. Your progress will appear here.</p>';
    chartEl.innerHTML = '';
    habitsEl.innerHTML = '';
    renderWeeklyReviewInline();
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

  // Monthly chart: last 8 months that have any completion data.
  const byMonth = {};
  Object.keys(u.completions).forEach(key => {
    const dStr = key.split('__')[1];
    const monthKey = dStr.slice(0, 7);
    if (!byMonth[monthKey]) byMonth[monthKey] = { done: 0, adjusted: 0, missed: 0 };
    const status = u.completions[key];
    byMonth[monthKey][status] = (byMonth[monthKey][status] || 0) + 1;
  });
  const monthKeys = Object.keys(byMonth).sort().slice(-8);
  if (monthKeys.length === 0) {
    chartEl.innerHTML = '<p class="empty-note">Not enough data yet.</p>';
  } else {
    chartEl.innerHTML = '<div class="bar-chart">' + monthKeys.map((mk, i) => {
      const m = byMonth[mk];
      const totalM = m.done + m.adjusted + m.missed;
      const pct = totalM > 0 ? Math.round(((m.done + m.adjusted) / totalM) * 100) : 0;
      const [y, mo] = mk.split('-').map(Number);
      const label = MONTH_NAMES[mo - 1].slice(0, 3);
      let trendNote = '';
      if (i > 0) {
        const prevKey = monthKeys[i - 1];
        const pm = byMonth[prevKey];
        const prevTotal = pm.done + pm.adjusted + pm.missed;
        if (prevTotal > 0) {
          const prevPct = Math.round(((pm.done + pm.adjusted) / prevTotal) * 100);
          trendNote = pct - prevPct;
        }
      }
      return `
        <div class="bar-col" title="${totalM} logged days">
          <span class="bar-pct">${pct}%</span>
          <div class="bar-track"><div class="bar-fill" style="height:${pct}%"></div></div>
          <span class="bar-label">${label} '${String(y).slice(2)}</span>
        </div>`;
    }).join('') + '</div>';
  }

  // Per-habit breakdown using the same central calculator.
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

  renderWeeklyReviewInline();
}

/* =========================================================================
   WEEKLY REVIEW
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
    <label class="input-label mt-14" for="weekly-reflection-input">What should change next week?</label>
    <textarea id="weekly-reflection-input" class="inline-input full-width weekly-reflection-textarea">${escapeHtml(existing ? existing.reflection : '')}</textarea>
    <button type="button" class="btn-secondary mt-10" id="weekly-review-save">Save reflection</button>
  `;
  document.getElementById('weekly-review-save').addEventListener('click', () => {
    const text = document.getElementById('weekly-reflection-input').value.trim();
    u.weeklyReviews = u.weeklyReviews || [];
    const idx = u.weeklyReviews.findIndex(r => r.weekKey === weekKey);
    const record = { weekKey, reflection: text, createdAt: Date.now(), snapshot: snap };
    if (idx >= 0) u.weeklyReviews[idx] = record; else u.weeklyReviews.push(record);
    saveData();
    document.getElementById('weekly-review-modal').classList.add('hidden');
  });
  document.getElementById('weekly-review-modal').classList.remove('hidden');
}

/* =========================================================================
   GROUP — real users only. No Friend 1-8 placeholders, no fake activity,
   no stake mechanics. Private onboarding data, friction notes, and habit
   names are never exposed here.
   ========================================================================= */
function renderGroup() {
  const u = getUser();
  const tbody = document.getElementById('group-table-body');
  const wrap = document.getElementById('group-table-wrap');
  const emptyEl = document.getElementById('group-empty');
  const monthNote = document.getElementById('group-month-note');
  const activityEl = document.getElementById('group-activity');
  if (!u || !tbody) return;

  const group = getGroup(u);
  const memberIds = (group.members || []).filter(id => state.users[id]);
  const visibleMembers = memberIds
    .map(id => state.users[id])
    .filter(m => m.id === u.id || (m.settings.privacy.groupVisibility !== false));

  if (monthNote) monthNote.innerText = visibleMembers.length <= 1
    ? "Everyone you invite into this browser's OnTrack joins this group automatically."
    : `${visibleMembers.length} members visible to you.`;

  if (visibleMembers.length <= 1) {
    wrap.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    emptyEl.innerHTML = '<p class="empty-note">You\'re currently the only member. Create another profile on this device (Switch &rarr; New profile) to see group accountability in action.</p>';
  } else {
    wrap.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    tbody.innerHTML = '';
    visibleMembers
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
      .forEach(m => {
        const cons = calcConsistency(m, {});
        const streaks = calcOverallStreaks(m);
        const online = isOnline(m.lastSeen);
        const showIdentity = m.id === u.id || m.settings.privacy.profileVisibility !== false;
        const displayName = showIdentity ? escapeHtml(m.name) : 'Member';
        const avatarHtml = showIdentity ? avatarMarkup(m) : `<span class="avatar-initials">?</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="profile-cell"><span class="avatar avatar-sm">${avatarHtml}</span><span>${displayName}${m.id === u.id ? ' (you)' : ''}</span></td>
          <td class="status-cell"><span class="status-dot ${online ? 'online' : 'offline'}"></span>${online ? 'Online' : 'Offline'}</td>
          <td>${formatLastSeen(m.lastSeen)}</td>
          <td>${cons ? cons.pct + '%' : '\u2014'}</td>
          <td>${streaks.current}</td>
          <td>${cons ? cons.done : 0}</td>
          <td>${cons ? cons.adjusted : 0}</td>
          <td>${cons ? cons.missed : 0}</td>
        `;
        tbody.appendChild(tr);
      });
  }

  // Lightweight activity feed — completions only, never friction/notes/
  // onboarding data, and only from members who opted into activity sharing.
  const events = [];
  visibleMembers.forEach(m => {
    if (m.id !== u.id && m.settings.privacy.activityVisibility === false) return;
    (m.activityLog || []).forEach(ev => events.push({ ...ev, userName: m.id === u.id ? 'You' : m.name }));
  });
  events.sort((a, b) => b.at - a.at);
  if (activityEl) {
    if (events.length === 0) {
      activityEl.innerHTML = '<p class="empty-note">No activity yet.</p>';
    } else {
      activityEl.innerHTML = events.slice(0, 15).map(ev =>
        `<div class="friction-item">${escapeHtml(ev.userName)} completed <strong>${escapeHtml(ev.habitName)}</strong>.</div>`
      ).join('');
    }
  }
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
function populateSettingsForm() {
  const u = getUser();
  if (!u) return;

  document.getElementById('display-name-input').value = u.name;
  document.getElementById('settings-identity-note').innerText =
    `Profile created ${new Date(u.createdAt).toLocaleDateString()}. Data for this profile is stored only in this browser.`;
  document.getElementById('settings-access-code').innerText = u.accessCode || '\u2014';

  const cons = calcConsistency(u, {});
  const { current } = calcOverallStreaks(u);
  document.getElementById('settings-profile-stats').innerText =
    `${current}-day streak \u00b7 ${cons ? cons.pct + '%' : '\u2014'} consistency \u00b7 ${u.skills.length} skill${u.skills.length === 1 ? '' : 's'} developing`;

  document.querySelectorAll('#appearance-segmented .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.value === u.settings.appearance));

  document.getElementById('notif-habit-reminders').checked = !!u.settings.notifications.habitReminders;
  document.getElementById('notif-daily-checkin').checked = !!u.settings.notifications.dailyCheckin;
  document.getElementById('notif-weekly-review').checked = !!u.settings.notifications.weeklyReview;
  document.getElementById('notif-group-activity').checked = !!u.settings.notifications.groupActivity;

  document.getElementById('privacy-group-visible').checked = u.settings.privacy.groupVisibility !== false;
  document.getElementById('privacy-activity-visible').checked = u.settings.privacy.activityVisibility !== false;
  document.getElementById('privacy-profile-visible').checked = u.settings.privacy.profileVisibility !== false;

  refreshAvatarDisplays();
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

function updatePrivacyPref(key, checked) {
  const u = getUser();
  u.settings.privacy[key] = checked;
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
  kept.groupId = u.groupId;
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
  const payload = { version: 2, exportedAt: new Date().toISOString(), ...state };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ontrack_backup.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function validateImportedState(obj) {
  return obj && typeof obj === 'object' && obj.users && typeof obj.users === 'object' && obj.groups && typeof obj.groups === 'object';
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (!validateImportedState(imported)) {
        throw new Error('File is missing "users" and "groups" sections.');
      }
      state = { version: 2, session: imported.session || { activeUserId: null }, users: imported.users, groups: imported.groups };
      ensureDefaultGroup();
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
  const settingsAvatar = document.getElementById('settings-avatar');
  if (headerAvatar) headerAvatar.innerHTML = avatarMarkup(u);
  if (settingsAvatar) settingsAvatar.innerHTML = avatarMarkup(u);
  if (currentTab === 'group') renderGroup();
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
  bind('header-avatar-btn', 'click', () => switchTab('settings', document.querySelector('.nav-btn[data-tab="settings"]')));

  bind('add-habit-btn', 'click', addHabit);
  bind('new-habit-input', 'keyup', (e) => { if (e.key === 'Enter') addHabit(); });
  bind('prev-month-btn', 'click', () => changeMonth(-1));
  bind('next-month-btn', 'click', () => changeMonth(1));
  bind('today-btn', 'click', jumpToToday);

  bind('add-skill-btn', 'click', addSkill);
  bind('new-skill-input', 'keyup', (e) => { if (e.key === 'Enter') addSkill(); });

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
  bind('notif-daily-checkin', 'change', (e) => updateNotificationPref('dailyCheckin', e.target.checked));
  bind('notif-weekly-review', 'change', (e) => updateNotificationPref('weeklyReview', e.target.checked));
  bind('notif-group-activity', 'change', (e) => updateNotificationPref('groupActivity', e.target.checked));

  bind('privacy-group-visible', 'change', (e) => updatePrivacyPref('groupVisibility', e.target.checked));
  bind('privacy-activity-visible', 'change', (e) => updatePrivacyPref('activityVisibility', e.target.checked));
  bind('privacy-profile-visible', 'change', (e) => updatePrivacyPref('profileVisibility', e.target.checked));

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(btn.dataset.tab, btn));
  });
  document.querySelectorAll('.mnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'more') {
        document.getElementById('more-sheet').classList.remove('hidden');
      } else {
        switchTab(btn.dataset.tab, document.querySelector(`.nav-btn[data-tab="${btn.dataset.tab}"]`));
      }
    });
  });
  bind('more-sheet-close', 'click', () => document.getElementById('more-sheet').classList.add('hidden'));
  document.querySelectorAll('#more-sheet .modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('more-sheet').classList.add('hidden');
      switchTab(btn.dataset.tab, document.querySelector(`.nav-btn[data-tab="${btn.dataset.tab}"]`));
    });
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
    // dblclick to rename inline (single click opens detail modal)
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
    // If a reason wasn't picked yet, default to "Other" with the note.
    if (pendingMissCell) submitFailureReason('Other');
  });

  bind('habit-detail-close', 'click', () => document.getElementById('habit-detail-modal').classList.add('hidden'));
  bind('weekly-review-close', 'click', () => document.getElementById('weekly-review-modal').classList.add('hidden'));
}

window.onload = init;