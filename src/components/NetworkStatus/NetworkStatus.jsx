import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './NetworkStatus.module.css';

function NetworkStatus() {
  const { tx } = useLanguage();
  const [online, setOnline] = useState(window.navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className={styles.banner} role="status" aria-live="assertive">
      {tx('You are offline. Changes may not sync until connection returns.', 'ከኢንተርኔት ግንኙነት ውጭ ነዎት። ግንኙነቱ እስኪመለስ ድረስ ለውጦች ላይተመሳሰሉ ይችላሉ።')}
    </div>
  );
}

export default NetworkStatus;
