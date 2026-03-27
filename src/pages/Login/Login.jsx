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
            <input
              type="password"
              autoComplete="current-password"
              placeholder={tx('Enter your password', 'የይለፍ ቃልዎን ያስገቡ')}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" loading={loading} full size="lg" disabled={!email.trim() || !password.trim()}>
            {tx('Sign In', 'ግባ')}
          </Button>

          <div className={styles.links}>
            <Link to="/auth/signup" className={styles.linkButton}>
              {tx('Sign Up', 'ይመዝገቡ')}
            </Link>
            <Link to="/auth/verify-otp" className={styles.linkButton}>
              {tx('Verify OTP', 'OTP ያረጋግጡ')}
            </Link>
            <Link to="/auth/forgot-password" className={styles.linkButton}>
              {tx('Forgot Password', 'የይለፍ ቃል ረስቻለሁ')}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default Login;
