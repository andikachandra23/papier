import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import client from '../api/client';
import LanguageSwitch from '../components/LanguageSwitch';
import { useLanguage } from '../i18n/LanguageContext';

const Login = ({ onLogin }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('auth.required'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await client.post(endpoint, { email, password });
      localStorage.setItem('token', res.data.access_token);
      window.location.href = '/app';
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.error'));
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await client.post('/auth/google', {
        id_token: credentialResponse.credential,
      });
      localStorage.setItem('token', res.data.access_token);
      window.location.href = '/app';
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.googleError'));
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(t('auth.googleError'));
  };

  return (
    <div className="login-page">
      <div className="login-language-switch"><LanguageSwitch /></div>
      <div className="login-card">
        <h1 className="login-title">Papier</h1>
        <p className="login-subtitle">
          {isRegister ? t('auth.registerSubtitle') : t('auth.signInSubtitle')}
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="section-header">Email</div>
            <input
              className="input-field"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <div className="section-header">Password</div>
            <input
              className="input-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? t('common.loading') : (isRegister ? t('auth.register') : t('auth.signIn'))}
          </button>
        </form>
        <div className="login-divider">
          <span>{t('auth.or')}</span>
        </div>
        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
            shape="rectangular"
            width="100%"
            disabled={googleLoading}
          />
          {googleLoading && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--ink-400)', marginTop: '8px' }}>
              {t('common.loading')}
            </p>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--ink-400)' }}>
          {isRegister ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
          <button
            style={{ background: 'none', border: 'none', color: 'var(--steel-600)', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? t('auth.signIn') : t('auth.register')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
