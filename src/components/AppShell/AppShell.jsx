import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthHooks';
import { useToast } from '../Toast/ToastContext';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './AppShell.module.css';

function AppShell({ children }) {
  const { language, setLanguage, tx } = useLanguage();
  const { role, email, signOut } = useAuth();
  const { showToast } = useToast();

  const navItems = [
    { to: '/audit/new', label: tx('Audit Form', 'የኦዲት ቅጽ'), roles: ['enumerator'] },
    { to: '/supervisor', label: tx('Supervisor', 'ተቆጣጣሪ'), roles: ['supervisor'] },
    { to: '/admin', label: tx('Admin', 'አስተዳደር'), roles: ['project_manager'] },
    { to: '/executive', label: tx('Executive', 'ከፍተኛ አመራር'), roles: ['client_executive'] },
    {
      to: '/map',
      label: tx('Map', 'ካርታ'),
      roles: ['supervisor', 'project_manager', 'client_executive'],
    },
    {
      to: '/outlets/outlet-001',
      label: tx('Outlet Profile', 'የመሸጫ መገለጫ'),
      roles: ['supervisor', 'project_manager'],
    },
    {
      to: '/admin/questionnaire',
      label: tx('Questionnaire', 'መጠይቅ'),
      roles: ['project_manager'],
    },
    {
      to: '/admin/escalations',
      label: tx('Escalations', 'አስቸኳይ ጉዳዮች'),
      roles: ['project_manager', 'supervisor'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await signOut();
      showToast(tx('Signed out successfully.', 'በተሳካ ሁኔታ ወጥተዋል።'), 'success');
    } catch (error) {
      showToast(
        error.message || tx('Unable to sign out.', 'መውጣት አልተቻለም።'),
        'error'
      );
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandWrap}>
            <p className={styles.brandTop}>{tx('Habesha Breweries', 'ሀበሻ ቢራዎች')}</p>
            <p className={styles.brandBottom}>
              {tx('Promotional Audit Platform', 'የፕሮሞሽን ኦዲት ስርዓት')}
            </p>
          </div>

          <div className={styles.actionsWrap}>
            <span className={styles.userEmail}>{email}</span>
            <span className={styles.languageLabel}>{tx('Language', 'ቋንቋ')}</span>
            <button
              type="button"
              className={`${styles.langButton} ${language === 'en' ? styles.langButtonActive : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`${styles.langButton} ${language === 'am' ? styles.langButtonActive : ''}`}
              onClick={() => setLanguage('am')}
            >
              አማ
            </button>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              {tx('Logout', 'ውጣ')}
            </button>
          </div>
        </div>

        <nav className={styles.nav}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className={styles.pageBody}>{children}</div>
    </div>
  );
}

export default AppShell;
