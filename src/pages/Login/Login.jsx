import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { useAuth } from '../../auth/AuthHooks';
import { canAccessPath, resolveLandingPath } from '../../auth/roleRoutes';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './Login.module.css';

const LOCKOUT_KEY = 'habesha-login-lockout-v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const DEMO_QUICK_ACCOUNTS = [
  {
    label: 'Enumerator',
    email: 'enumerator@demo.habesha',
    password: 'Demo@12345',
  },
  {
    label: 'Supervisor',
    email: 'supervisor@demo.habesha',
    password: 'Demo@12345',
  },
  {
    label: 'Project Manager',
    email: 'pm@demo.habesha',
    password: 'Demo@12345',
  },
  {
    label: 'Executive',
    email: 'executive@demo.habesha',
    password: 'Demo@12345',
  },
];

function readLockoutMap() {
  try {
    const raw = window.localStorage.getItem(LOCKOUT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLockoutMap(value) {
  window.localStorage.setItem(LOCKOUT_KEY, JSON.stringify(value));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function Login() {
  const { tx } = useLanguage();
  const { signIn, authMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearLockout = (emailKey) => {
    const map = readLockoutMap();
    delete map[emailKey];
    writeLockoutMap(map);
  };

  const registerFailure = (emailKey) => {
    const map = readLockoutMap();
    const current = map[emailKey] || { attempts: 0, lockedUntil: 0 };
    const attempts = current.attempts + 1;
    const next = {
      attempts,
      lockedUntil: attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
    };

    map[emailKey] = next;
    writeLockoutMap(map);

    return next;
  };

  const getLockStatus = (emailKey) => {
    const map = readLockoutMap();
    const current = map[emailKey];

    if (!current) {
      return { locked: false, remainingMs: 0, attempts: 0 };
    }

    if (current.lockedUntil > Date.now()) {
      return {
        locked: true,
        remainingMs: current.lockedUntil - Date.now(),
        attempts: current.attempts,
      };
    }

    return { locked: false, remainingMs: 0, attempts: current.attempts };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const emailKey = normalizeEmail(email);
    const lockStatus = getLockStatus(emailKey);

    if (lockStatus.locked) {
      const mins = Math.max(1, Math.ceil(lockStatus.remainingMs / 60000));
      setError(
        tx(
          `Too many failed attempts. Try again in ${mins} minute(s).`,
          `ብዙ ጊዜ በተሳሳተ ሁኔታ ሞክረዋል። ከ${mins} ደቂቃ በኋላ ይሞክሩ።`
        )
      );
      return;
    }

    if (!emailKey || !password.trim()) {
      setError(tx('Email and password are required.', 'ኢሜይል እና የይለፍ ቃል ያስፈልጋሉ።'));
      return;
    }

    setLoading(true);

    try {
      const result = await signIn({
        email: emailKey,
        password,
      });

      clearLockout(emailKey);

      const nextPath = location.state?.from?.pathname;
      const fallbackPath = resolveLandingPath(result?.role);

      if (nextPath && canAccessPath(result?.role, nextPath)) {
        navigate(nextPath, { replace: true });
      } else {
        navigate(fallbackPath, { replace: true });
      }
    } catch (err) {
      const failure = registerFailure(emailKey);
      const message = String(err.message || '');
      const normalized = message.toLowerCase();

      if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('timeout')) {
        setError(tx('Network issue detected. Check your internet and retry.', 'የኔትወርክ ችግኝ ተገኝቷል። ኢንተርኔትዎን ያረጋግጡና ደግመው ይሞክሩ።'));
      } else if (failure.lockedUntil && failure.lockedUntil > Date.now()) {
        setError(tx('Too many failed attempts. Access is temporarily locked.', 'ብዙ ጊዜ የተሳሳተ ሙከራ ተደርጓል። መግቢያው ለጊዜው ተቆልፏል።'));
      } else {
        setError(err.message || tx('Unable to sign in.', 'መግባት አልተቻለም።'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPrefill = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setShowPassword(false);
    setError('');
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.card}`}>
        <div className={styles.header}>
          <p className={styles.kicker}>{tx('Habesha Breweries Audit Platform', 'የሀበሻ ቢራዎች የፕሮሞሽን ኦዲት ስርዓት')}</p>
          <h1>{tx('Login', 'ግባ')}</h1>
          <p className={styles.subcopy}>
            {tx(
              'Sign in with your official account to continue to your role dashboard.',
              'በድርጅቱ የተሰጠዎ መለያ ተጠቅመው ወደ የስራ ኃላፊነትዎ ዳሽቦርድ ይቀጥሉ።'
            )}
          </p>
          {authMode === 'demo' && (
            <p className={styles.helper}>
              {tx(
                'Demo mode is active. Use Sign Up to create a demo account if none exists.',
                'የሙከራ ሁኔታ ንቁ ነው። መለያ ካልተዘጋጀ በSign Up የሙከራ መለያ ይፍጠሩ።'
              )}
            </p>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {authMode === 'demo' && (
            <div className={styles.demoAccounts}>
              <p>{tx('Quick Demo Accounts', 'ፈጣን የሙከራ መለያዎች')}</p>
              <div className={styles.demoAccountGrid}>
                {DEMO_QUICK_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className={styles.demoAccountButton}
                    onClick={() => handleDemoPrefill(account)}
                  >
                    <span>{account.label}</span>
                    <small>{account.email}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className={styles.field}>
            <span>{tx('Email', 'ኢሜይል')}</span>
            <input
              type="email"
              autoComplete="email"
              placeholder={tx('Enter your email', 'ኢሜይልዎን ያስገቡ')}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              required
            />
          </label>

          <label className={styles.field}>
            <span>{tx('Password', 'የይለፍ ቃል')}</span>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={tx('Enter your password', 'የይለፍ ቃልዎን ያስገቡ')}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword
                    ? tx('Hide password', 'የይለፍ ቃል ደብቅ')
                    : tx('Show password', 'የይለፍ ቃል አሳይ')
                }
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M3 4.3 4.3 3 21 19.7 19.7 21l-3.1-3.1A11.2 11.2 0 0 1 12 19c-5.2 0-9.4-3.5-11-7 1-2.1 2.8-4.2 5.1-5.6L3 4.3Zm5.9 5.9A3.5 3.5 0 0 0 12 15.5c.8 0 1.5-.2 2.1-.6l-1.2-1.2a1.8 1.8 0 0 1-2.6-2.6l-1.4-1.4Zm3.1-5.2c5.2 0 9.4 3.5 11 7-.6 1.2-1.5 2.5-2.6 3.6l-1.2-1.2a9.1 9.1 0 0 0 1.8-2.4c-1.4-2.8-4.8-5-9-5-.6 0-1.2 0-1.8.2L8.5 5.5c1.1-.3 2.3-.5 3.5-.5Zm0 3A4 4 0 0 1 16 12c0 .6-.1 1.1-.3 1.6l-3.3-3.3c-.1 0-.2 0-.4 0a1.7 1.7 0 0 0-1.7 1.7c0 .1 0 .2 0 .4L8.4 10.5A4 4 0 0 1 12 8Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 5c5.2 0 9.4 3.5 11 7-1.6 3.5-5.8 7-11 7S2.6 15.5 1 12c1.6-3.5 5.8-7 11-7Zm0 2C7.8 7 4.4 9.2 3 12c1.4 2.8 4.8 5 9 5s7.6-2.2 9-5c-1.4-2.8-4.8-5-9-5Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" loading={loading} full size="lg" disabled={!email.trim() || !password.trim()}>
            {tx('Sign In', 'ግባ')}
          </Button>

          <div className={styles.links}>
            <Link to="/auth/signup" className={styles.linkButton}>
              {tx('Sign Up', 'ይመዝገቡ')}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default Login;
