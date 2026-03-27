import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className={styles.page}>
        <section className={`tibeb-border ${styles.card}`}>
          <h1>Application Error</h1>
          <p>{this.state.message}</p>
          <button type="button" onClick={this.handleReload} className={styles.button}>
            Reload Application
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
