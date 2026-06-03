import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './styles/index.css';
import './styles/landing.css';
import { LanguageProvider } from './i18n/LanguageContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/* ── Error Boundary — surfaces runtime errors instead of a blank page ── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'DM Sans, sans-serif', color: '#1A1916' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Terjadi kesalahan</h1>
          <pre style={{ fontSize: 13, color: '#6B6860', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, border: '1px solid #D9D6C8', cursor: 'pointer' }}
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const content = (
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          {content}
        </GoogleOAuthProvider>
      ) : (
        content
      )}
    </ErrorBoundary>
  </React.StrictMode>
);