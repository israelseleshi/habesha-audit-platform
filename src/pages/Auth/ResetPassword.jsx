import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { useToast } from '../../components/Toast/ToastContext';
import { useAuth } from '../../auth/AuthHooks';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './AuthPages.module.css';

function ResetPassword() {
  const { tx } = useLanguage();
  const { updatePassword, verifyOtp, authMode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionPrepared, setSessionPrepared] = useState(authMode === 'demo');

  const tokenHash = useMemo(() => searchParams.get('token_hash') || '', [searchParams]);
  const type = useMemo(() => searchParams.get('type') || 'recovery', [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const prepareRecoverySession = async () => {
      if (authMode !== 'live') {
        return;
      }

      if (!tokenHash) {
        setSessionPrepared(true);
        return;
      }

      try {
        setLoading(true);
        await verifyOtp({ tokenHash, type });

        if (isMounted) {
          setSessionPrepared(true);
          showToast(tx('Recovery link verified.', 'የመመለሻ ሊንክ ተረጋግጧል።'), 'success');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || tx('Recovery link is invalid or expired.', 'የመመለሻ ሊንኩ ልክ አይደለም ወይም ጊዜው አልፏል።'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [authMode, showToast, tokenHash, tx, type, verifyOtp]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(tx('Password must be at least 8 characters.', 'የይለፍ ቃል ቢያንስ 8 ቁምፊ መሆን አለበት።'));
      return;
    }

    if (password !== confirmPassword) {
      setError(tx('Passwords do not match.', 'የይለፍ ቃላቱ አይመሳሰሉም።'));
      return;
    }

    if (authMode === 'demo' && (!email.trim() || !token.trim())) {
      setError(tx('Email and reset code are required.', 'ኢሜይል እና የመቀየሪያ ኮድ ያስፈልጋሉ።'));
      return;
    }

    if (!sessionPrepared) {
      setError(tx('Recovery session is not ready yet.', 'የመመለሻ ክፍለ-ጊዜው ገና ዝግጁ አይደለም።'));
      return;
    }

    try {
      setLoading(true);
      await updatePassword({
        password,
        email: authMode === 'demo' ? email.trim() : undefined,
        token: authMode === 'demo' ? token.trim() : undefined,
      });

      showToast(tx('Password updated successfully.', 'የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል።'), 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || tx('Unable to update password.', 'የይለፍ ቃል መቀየር አልተቻለም።'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.card}`}>
        <div className={styles.header}>
          <p className={styles.kicker}>{tx('Credential Reset', 'የመግቢያ መቀየሪያ')}</p>
          <h1>{tx('Reset Password', 'የይለፍ ቃል ቀይር')}</h1>
          <p className={styles.subcopy}>
            {tx(
              'Set a new secure password for your account.',
              'ለመለያዎ አዲስ የተሻለ የይለፍ ቃል ያዘጋጁ።'
            )}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {authMode === 'demo' && (
            <>
              <label className={styles.field}>
                <span>{tx('Email', 'ኢሜይል')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder={tx('Enter your email', 'ኢሜይልዎን ያስገቡ')}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>{tx('Reset Code', 'የመቀየሪያ ኮድ')}</span>
                <input
                  type="text"
                  value={token}
                  onChange={(event) => {
                    setToken(event.target.value);
                    setError('');
                  }}
                  placeholder={tx('Enter reset code', 'የመቀየሪያ ኮድ ያስገቡ')}
                  required
                />
              </label>
            </>
          )}

          <label className={styles.field}>
            <span>{tx('New Password', 'አዲስ የይለፍ ቃል')}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder={tx('At least 8 characters', 'ቢያንስ 8 ቁምፊ')}
              required
            />
          </label>

          <label className={styles.field}>
            <span>{tx('Confirm New Password', 'አዲሱን የይለፍ ቃል ያረጋግጡ')}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError('');
              }}
              placeholder={tx('Re-enter new password', 'አዲሱን የይለፍ ቃል እንደገና ያስገቡ')}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" loading={loading} full size="lg">
            {tx('Update Password', 'የይለፍ ቃል አዘምን')}
          </Button>

          <div className={styles.linkRow}>
            <Link className={styles.linkButton} to="/auth/forgot-password">
              {tx('Back to Forgot Password', 'ወደ የይለፍ ቃል መርሳት ተመለስ')}
            </Link>
            <Link className={styles.linkButton} to="/login">
              {tx('Back to Login', 'ወደ መግቢያ ተመለስ')}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ResetPassword;
