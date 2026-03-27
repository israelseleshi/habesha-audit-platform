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
            <span>{tx('Confirm Password', 'የይለፍ ቃል ያረጋግጡ')}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError('');
              }}
              placeholder={tx('Re-enter your password', 'የይለፍ ቃልዎን እንደገና ያስገቡ')}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" loading={loading} full size="lg">
            {tx('Create Account', 'መለያ ፍጠር')}
          </Button>

          <div className={styles.linkRow}>
            <Link className={styles.linkButton} to="/login">
              {tx('Back to Login', 'ወደ መግቢያ ተመለስ')}
            </Link>
            <Link className={styles.linkButton} to="/auth/verify-otp">
              {tx('Verify OTP', 'OTP ያረጋግጡ')}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default Signup;
