import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { useToast } from '../../components/Toast/ToastContext';
import { useAuth } from '../../auth/AuthHooks';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './AuthPages.module.css';

function ForgotPassword() {
  const { tx } = useLanguage();
  const { sendPasswordReset, authMode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetCodePreview, setResetCodePreview] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(tx('Email is required.', 'ኢሜይል ያስፈልጋል።'));
      return;
    }

    try {
      setLoading(true);
      const result = await sendPasswordReset({ email: email.trim() });

      if (authMode === 'demo' && result?.resetCode) {
        setResetCodePreview(result.resetCode);
        showToast(
          tx(
            `Demo reset code: ${result.resetCode}. Use it in the reset page.`,
            `የሙከራ የይለፍ ቃል መቀየሪያ ኮድ: ${result.resetCode}. በመቀየሪያ ገጽ ላይ ይጠቀሙ።`
          ),
          'info',
          10000
        );
      }

      showToast(
        tx('Password reset instructions were sent.', 'የይለፍ ቃል መቀየሪያ መመሪያዎች ተልከዋል።'),
        'success'
      );
    } catch (err) {
      setError(err.message || tx('Unable to send reset instructions.', 'የመቀየሪያ መመሪያ መላክ አልተቻለም።'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.card}`}>
        <div className={styles.header}>
          <p className={styles.kicker}>{tx('Account Recovery', 'መለያ መመለሻ')}</p>
          <h1>{tx('Forgot Password', 'የይለፍ ቃል ረስቻለሁ')}</h1>
          <p className={styles.subcopy}>
            {tx(
              'Enter your email and we will send password reset instructions.',
              'ኢሜይልዎን ያስገቡ እና የይለፍ ቃል መቀየሪያ መመሪያ እንልካለን።'
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

          {resetCodePreview && (
            <p className={styles.info}>
              {tx('Demo reset code', 'የሙከራ መቀየሪያ ኮድ')}: <strong>{resetCodePreview}</strong>
            </p>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" loading={loading} full size="lg">
            {tx('Send Reset Link', 'የመቀየሪያ ሊንክ ላክ')}
          </Button>

          <div className={styles.linkRow}>
            <Link className={styles.linkButton} to="/login">
              {tx('Back to Login', 'ወደ መግቢያ ተመለስ')}
            </Link>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => navigate(`/auth/reset-password?email=${encodeURIComponent(email.trim())}`)}
              disabled={!email.trim()}
            >
              {tx('Go to Reset Page', 'ወደ መቀየሪያ ገጽ ሂድ')}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ForgotPassword;
