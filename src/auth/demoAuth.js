const USERS_KEY = 'habesha-demo-users-v2';
const SESSION_KEY = 'habesha-demo-session-v2';
const OTP_KEY = 'habesha-demo-otp-v2';
const RESET_KEY = 'habesha-demo-reset-v2';

const DEFAULT_DEMO_USERS = Object.freeze([
  {
    email: 'enumerator@demo.habesha',
    password: 'Demo@12345',
    role: 'enumerator',
  },
  {
    email: 'supervisor@demo.habesha',
    password: 'Demo@12345',
    role: 'supervisor',
  },
  {
    email: 'pm@demo.habesha',
    password: 'Demo@12345',
    role: 'project_manager',
  },
  {
    email: 'executive@demo.habesha',
    password: 'Demo@12345',
    role: 'client_executive',
  },
]);

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSeedUsers(users) {
  return users
    .filter((item) => item?.email && item?.password && item?.role)
    .map((item) => ({
      email: normalizeEmail(item.email),
      password: String(item.password),
      role: String(item.role),
      verified: true,
    }));
}

function getSeedUsersFromEnv() {
  const envMapped = normalizeSeedUsers([
    {
      email: import.meta.env.VITE_DEMO_ENUMERATOR_EMAIL,
      password: import.meta.env.VITE_DEMO_ENUMERATOR_PASSWORD,
      role: 'enumerator',
    },
    {
      email: import.meta.env.VITE_DEMO_SUPERVISOR_EMAIL,
      password: import.meta.env.VITE_DEMO_SUPERVISOR_PASSWORD,
      role: 'supervisor',
    },
    {
      email: import.meta.env.VITE_DEMO_PROJECT_MANAGER_EMAIL,
      password: import.meta.env.VITE_DEMO_PROJECT_MANAGER_PASSWORD,
      role: 'project_manager',
    },
    {
      email: import.meta.env.VITE_DEMO_EXECUTIVE_EMAIL,
      password: import.meta.env.VITE_DEMO_EXECUTIVE_PASSWORD,
      role: 'client_executive',
    },
  ]);

  const fromJson = (() => {
    const raw = import.meta.env.VITE_DEMO_USERS_JSON;
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return normalizeSeedUsers(parsed);
    } catch {
      return [];
    }
  })();

  const uniqueByEmail = new Map();

  for (const item of [...normalizeSeedUsers(DEFAULT_DEMO_USERS), ...envMapped, ...fromJson]) {
    uniqueByEmail.set(item.email, item);
  }

  return [...uniqueByEmail.values()];
}

function getStoredUsers() {
  const seeded = getSeedUsersFromEnv();
  const custom = readJson(USERS_KEY, []);
  const uniqueByEmail = new Map();

  for (const item of seeded) {
    uniqueByEmail.set(normalizeEmail(item.email), item);
  }

  for (const item of custom) {
    if (!item?.email || !item?.password || !item?.role) {
      continue;
    }

    uniqueByEmail.set(normalizeEmail(item.email), {
      email: normalizeEmail(item.email),
      password: String(item.password),
      role: String(item.role),
      verified: item.verified !== false,
    });
  }

  return [...uniqueByEmail.values()];
}

function writeCustomUsers(users) {
  const seededEmails = new Set(getSeedUsersFromEnv().map((item) => normalizeEmail(item.email)));
  const customOnly = users.filter((item) => !seededEmails.has(normalizeEmail(item.email)));
  writeJson(USERS_KEY, customOnly);
}

function findUser(email) {
  const normalized = normalizeEmail(email);
  return getStoredUsers().find((item) => normalizeEmail(item.email) === normalized) || null;
}

function generateCode(length = 6) {
  const chars = '0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function makeDemoSession(user) {
  return {
    id: `demo-${user.role}-${normalizeEmail(user.email)}`,
    email: normalizeEmail(user.email),
    role: user.role,
    source: 'demo',
  };
}

export function getDemoSession() {
  const saved = readJson(SESSION_KEY, null);
  if (!saved?.email) {
    return null;
  }

  const matched = findUser(saved.email);
  if (!matched) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }

  return makeDemoSession(matched);
}

export function setDemoSessionByEmail(email) {
  const user = findUser(email);
  if (!user) {
    throw new Error('No matching demo account found.');
  }

  const session = makeDemoSession(user);
  writeJson(SESSION_KEY, session);
  return session;
}

export function signOutDemo() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function signInDemo({ email, password }) {
  const users = getStoredUsers();
  if (users.length === 0) {
    throw new Error('No demo accounts are configured. Create an account using Sign Up.');
  }

  const user = findUser(email);
  if (!user || user.password !== String(password)) {
    throw new Error('Invalid login credentials.');
  }

  const session = makeDemoSession(user);
  writeJson(SESSION_KEY, session);

  return {
    session,
    user: {
      id: session.id,
      email: session.email,
      role: session.role,
    },
    role: session.role,
  };
}

export function signUpDemo({ email, password, role }) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Email is required.');
  }

  if (findUser(normalized)) {
    throw new Error('An account already exists for this email.');
  }

  const pending = readJson(OTP_KEY, {});
  const otpCode = generateCode(6);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  pending[normalized] = {
    email: normalized,
    password: String(password),
    role: role || 'enumerator',
    code: otpCode,
    expiresAt,
  };

  writeJson(OTP_KEY, pending);

  return {
    email: normalized,
    otpCode,
    expiresAt,
  };
}

export function verifyDemoOtp({ email, token }) {
  const normalized = normalizeEmail(email);
  const pending = readJson(OTP_KEY, {});
  const record = pending[normalized];

  if (!record) {
    throw new Error('No pending OTP request was found for this email.');
  }

  if (Date.now() > Number(record.expiresAt)) {
    delete pending[normalized];
    writeJson(OTP_KEY, pending);
    throw new Error('OTP has expired. Request a new code.');
  }

  if (String(token).trim() !== String(record.code)) {
    throw new Error('Invalid OTP code.');
  }

  const users = getStoredUsers();
  users.push({
    email: normalized,
    password: record.password,
    role: record.role,
    verified: true,
  });

  writeCustomUsers(users);

  delete pending[normalized];
  writeJson(OTP_KEY, pending);

  const session = makeDemoSession({ email: normalized, role: record.role });
  writeJson(SESSION_KEY, session);

  return {
    session,
    user: {
      id: session.id,
      email: normalized,
      role: record.role,
    },
    role: record.role,
  };
}

export function sendDemoPasswordReset({ email }) {
  const normalized = normalizeEmail(email);
  const user = findUser(normalized);

  if (!user) {
    throw new Error('No account was found for this email.');
  }

  const resets = readJson(RESET_KEY, {});
  const resetCode = generateCode(6);
  const expiresAt = Date.now() + 15 * 60 * 1000;

  resets[normalized] = {
    code: resetCode,
    expiresAt,
  };

  writeJson(RESET_KEY, resets);

  return {
    email: normalized,
    resetCode,
    expiresAt,
  };
}

export function updateDemoPassword({ email, token, password }) {
  const normalized = normalizeEmail(email);
  const user = findUser(normalized);

  if (!user) {
    throw new Error('No account was found for this email.');
  }

  const resets = readJson(RESET_KEY, {});
  const record = resets[normalized];

  if (!record) {
    throw new Error('No reset request found for this email.');
  }

  if (Date.now() > Number(record.expiresAt)) {
    delete resets[normalized];
    writeJson(RESET_KEY, resets);
    throw new Error('Reset code has expired. Request a new code.');
  }

  if (String(token).trim() !== String(record.code)) {
    throw new Error('Invalid reset code.');
  }

  const users = getStoredUsers().map((item) =>
    normalizeEmail(item.email) === normalized
      ? {
          ...item,
          password: String(password),
        }
      : item
  );

  writeCustomUsers(users);

  delete resets[normalized];
  writeJson(RESET_KEY, resets);

  return {
    ok: true,
  };
}

export function updateDemoPasswordForCurrentUser({ password }) {
  const session = getDemoSession();
  if (!session?.email) {
    throw new Error('No active demo session found.');
  }

  const users = getStoredUsers().map((item) =>
    normalizeEmail(item.email) === normalizeEmail(session.email)
      ? {
          ...item,
          password: String(password),
        }
      : item
  );

  writeCustomUsers(users);

  return {
    ok: true,
  };
}
