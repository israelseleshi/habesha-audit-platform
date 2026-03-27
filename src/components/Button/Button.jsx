import { forwardRef } from 'react';
import styles from './Button.module.css';

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      full = false,
      loading = false,
      disabled = false,
      onClick,
      type = 'button',
      className = '',
      ...rest
    },
    ref
  ) => {
    const classes = [
      styles.button,
      styles[variant],
      size !== 'md' && styles[size],
      full && styles.full,
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        onClick={onClick}
        {...rest}
      >
        {loading && <span className={styles.spinner} aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
