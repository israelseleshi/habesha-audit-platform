import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { useToast } from '../../components/Toast/ToastContext';
import { useAuth } from '../../auth/AuthHooks';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './AuthPages.module.css';

function Signup() {
  const { tx } = useLanguage();
  const { signUp, authMode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('enumerator');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      return tx('Email is required.', 'ኢሜይል ያስፈልጋል።');
    }

    if (password.length < 8) {
      return tx('Password must be at least 8 characters.', 'የይለፍ ቃል ቢያንስ 8 ቁምፊ መሆን አለበት።');
    }

    if (password !== confirmPassword) {
      return tx('Passwords do not match.', 'የይለፍ ቃላቱ አይመሳሰሉም።');
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      const result = await signUp({
        email: email.trim(),
        password,
        role,
      });

      if (authMode === 'demo' && result?.otpCode) {
        showToast(
          tx(
            `Demo OTP code: ${result.otpCode}. Use it on Verify OTP page.`,
            `የሙከራ OTP ኮድ: ${result.otpCode}. በOTP ማረጋገጫ ገጽ ላይ ይጠቀሙ።`
          ),
          'info',
          10000
        );
      }

      showToast(
        tx('Account created. Verify OTP to activate your access.', 'መለያው ተፈጥሯል። መግቢያዎን ለማንቃት OTP ያረጋግጡ።'),
        'success'
      );

      navigate(`/auth/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err.message || tx('Unable to create account.', 'መለያ መፍጠር አልተቻለም።'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.card}`}>
        <div className={styles.header}>
          <p className={styles.kicker}>{tx('Create Account', 'መለያ ፍጠር')}</p>
          <h1>{tx('Sign Up', 'ይመዝገቡ')}</h1>
          <p className={styles.subcopy}>
            {tx(
              'Create your account, then verify OTP to activate access.',
              'መለያዎን ፍጠሩ፣ ከዚያ የOTP ማረጋገጫ በማጠናቀቅ መግቢያዎን ያንቁ።'
            )}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
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
            <span>{tx('Role', 'ሚና')}</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="enumerator">{tx('Enumerator', 'ኦዲተር')}</option>
              <option value="supervisor">{tx('Supervisor', 'ተቆጣጣሪ')}</option>
              <option value="project_manager">{tx('Project Manager', 'ፕሮጀክት አስተዳዳሪ')}</option>
              <option value="client_executive">{tx('Client Executive', 'የደንበኛ ከፍተኛ አመራር')}</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>{tx('Password', 'የይለፍ ቃል')}</span>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder={tx('At least 8 characters', 'ቢያንስ 8 ቁምፊ')}
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

          <label className={styles.field}>
            <span>{tx('Confirm Password', 'የይለፍ ቃል ያረጋግጡ')}</span>
            <div className={styles.passwordField}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError('');
                }}
                placeholder={tx('Re-enter your password', 'የይለፍ ቃልዎን እንደገና ያስገቡ')}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword
                    ? tx('Hide password', 'የይለፍ ቃል ደብቅ')
                    : tx('Show password', 'የይለፍ ቃል አሳይ')
                }
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
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

          <Button type="submit" loading={loading} full size="lg">
            {tx('Create Account', 'መለያ ፍጠር')}
          </Button>

          <div className={styles.linkRow}>
            <Link className={styles.linkButton} to="/login">
              {tx('Back to Login', 'ወደ መግቢያ ተመለስ')}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default Signup;
