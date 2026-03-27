import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { useToast } from '../../components/Toast/ToastContext';
import { useAuth } from '../../auth/AuthHooks';
import { resolveLandingPath } from '../../auth/roleRoutes';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './AuthPages.module.css';

function VerifyOtp() {
  const { tx } = useLanguage();
  const { verifyOtp, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);

  const tokenHash = useMemo(() => searchParams.get('token_hash') || '', [searchParams]);
  const type = useMemo(() => searchParams.get('type') || 'email', [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const verifyFromLink = async () => {
      if (!tokenHash) {
        return;
      }

      try {
        setAutoVerifying(true);
        await verifyOtp({ tokenHash, type });

        if (!isMounted) {
          return;
        }

        showToast(tx('OTP verified successfully.', 'OTP በተሳካ ሁኔታ ተረጋግጧል።'), 'success');

        if (type === 'recovery') {
          navigate('/auth/reset-password', { replace: true });
          return;
        }

        navigate(resolveLandingPath(role || 'enumerator'), { replace: true });
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(err.message || tx('OTP verification failed.', 'የOTP ማረጋገጫ አልተሳካም።'));
      } finally {
        if (isMounted) {
          setAutoVerifying(false);
        }
      }
    };

    verifyFromLink();

    return () => {
      isMounted = false;
    };
  }, [navigate, role, showToast, tokenHash, tx, type, verifyOtp]);

  const handleManualVerification = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !otpCode.trim()) {
      setError(tx('Email and OTP code are required.', 'ኢሜይል እና OTP ኮድ ያስፈልጋሉ።'));
      return;
    }

    try {
      setLoading(true);
      const result = await verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      const nextRole = result?.role || role || 'enumerator';
      showToast(tx('OTP verified. Welcome.', 'OTP ተረጋግጧል። እንኳን ደህና መጡ።'), 'success');
      navigate(resolveLandingPath(nextRole), { replace: true });
    } catch (err) {
      setError(err.message || tx('OTP verification failed.', 'የOTP ማረጋገጫ አልተሳካም።'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.card}`}>
        <div className={styles.header}>
          <p className={styles.kicker}>{tx('Secure Verification', 'የደህንነት ማረጋገጫ')}</p>
          <h1>{tx('Verify OTP', 'OTP ያረጋግጡ')}</h1>
          <p className={styles.subcopy}>
            {tx(
              'Enter your one-time passcode to complete account activation.',
              'መለያዎን ለማጠናቀቅ የአንድ ጊዜ ማረጋገጫ ኮድ ያስገቡ።'
            )}
          </p>
        </div>

        {autoVerifying && <p className={styles.info}>{tx('Verifying secure link...', 'የደህንነት ሊንኩ በመረጋገጥ ላይ...')}</p>}

        <form className={styles.form} onSubmit={handleManualVerification}>
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
            <span>{tx('OTP Code', 'የOTP ኮድ')}</span>
            <input
              type="text"
              value={otpCode}
              onChange={(event) => {
                setOtpCode(event.target.value);
                setError('');
              }}
              placeholder={tx('Enter 6-digit code', '6 አሃዝ ኮድ ያስገቡ')}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" loading={loading} full size="lg" disabled={autoVerifying}>
            {tx('Verify', 'አረጋግጥ')}
          </Button>

          <div className={styles.linkRow}>
            <Link className={styles.linkButton} to="/auth/signup">
              {tx('Create Account', 'መለያ ፍጠር')}
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

export default VerifyOtp;
