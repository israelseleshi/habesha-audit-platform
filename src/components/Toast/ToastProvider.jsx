import { useCallback, useMemo, useState } from 'react';
import { ToastContext } from './ToastContext';
import styles from './ToastProvider.module.css';

let toastCounter = 0;

function nextToastId() {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', durationMs = 4500) => {
      const id = nextToastId();
      const safeType = ['success', 'warning', 'error', 'info'].includes(type) ? type : 'info';

      setToasts((prev) => [...prev, { id, message, type: safeType }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className={styles.viewport} role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}
            role="status"
            aria-live="polite"
          >
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className={styles.closeButton}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
