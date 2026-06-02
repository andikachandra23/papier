import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import LanguageSwitch from '../components/LanguageSwitch';
import { useLanguage } from '../i18n/LanguageContext';

const StatCard = ({ label, value, color }) => (
  <div style={{
    background: 'var(--cream-100)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--cream-300)',
    minWidth: '160px',
  }}>
    <div style={{ fontSize: '32px', fontWeight: 700, color: color || 'var(--ink-800)', marginBottom: '4px' }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    <div style={{ fontSize: '14px', color: 'var(--ink-500)' }}>{label}</div>
  </div>
);

const Admin = ({ onLogout, onBackToLibrary }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [aiUsage, setAiUsage] = useState([]);
  const [aiUsageTotal, setAiUsageTotal] = useState(0);
  const [aiUsageSummary, setAiUsageSummary] = useState(null);
  const [aiPage, setAiPage] = useState(1);
  const [aiFilter, setAiFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const perPage = 20;

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await client.get('/auth/me');
      setCurrentUser(res.data);
    } catch (err) {
      console.error('Failed to fetch current user', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await client.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        client.get('/admin/users', { params: { page: userPage, per_page: perPage, search: userSearch } }),
        client.get('/admin/users/count', { params: { search: userSearch } }),
      ]);
      setUsers(listRes.data);
      setUsersTotal(countRes.data.total);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  }, [userPage, userSearch]);

  const fetchAiUsage = useCallback(async () => {
    try {
      const params = { page: aiPage, per_page: perPage };
      if (aiFilter) params.feature = aiFilter;
      const [listRes, countRes, summaryRes] = await Promise.all([
        client.get('/admin/ai-usage', { params }),
        client.get('/admin/ai-usage/count', { params }),
        client.get('/admin/ai-usage/summary'),
      ]);
      setAiUsage(listRes.data);
      setAiUsageTotal(countRes.data.total);
      setAiUsageSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch AI usage', err);
    }
  }, [aiPage, aiFilter]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await client.get('/admin/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  }, []);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMsg('');
    try {
      await client.put('/admin/settings', {
        ai_base_url: settings.ai_base_url || '',
        ai_api_key: settings.ai_api_key || '',
        ai_model: settings.ai_model || '',
      });
      setSettingsMsg(t('admin.settingsSaved'));
      fetchSettings();
    } catch (err) {
      setSettingsMsg(t('admin.settingsSaveFailed'));
    }
    setSettingsSaving(false);
  };

  useEffect(() => {
    if (tab === 'dashboard') fetchStats();
    if (tab === 'users') fetchUsers();
    if (tab === 'ai-usage') fetchAiUsage();
    if (tab === 'settings') fetchSettings();
  }, [tab, fetchStats, fetchUsers, fetchAiUsage, fetchSettings]);

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await client.put(`/admin/users/${userId}`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await client.put(`/admin/users/${userId}`, { is_active: !isActive });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('admin.confirmDeleteUser'))) return;
    try {
      await client.delete(`/admin/users/${userId}`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const totalPages = (total) => Math.ceil(total / perPage);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--cream-200)',
        background: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--ink-800)' }}>
            Papier <span style={{ fontSize: '13px', color: 'var(--sage-600)', background: 'var(--sage-100)', padding: '2px 8px', borderRadius: '99px' }}>Admin</span>
          </span>
          <button
            onClick={onBackToLibrary}
            style={{
              background: 'var(--cream-100)', border: '1px solid var(--cream-300)',
              borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: 'var(--ink-700)',
            }}
          >
            ← {t('admin.backToLibrary')}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSwitch />
          <span style={{ fontSize: '14px', color: 'var(--ink-500)' }}>{currentUser?.email}</span>
          <button
            onClick={onLogout}
            style={{
              background: 'var(--rose-50)', border: '1px solid var(--rose-100)',
              borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: 'var(--rose-600)',
            }}
          >
            {t('common.logout')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        padding: '0 24px',
        background: 'white',
        borderBottom: '1px solid var(--cream-200)',
      }}>
        {[
          { key: 'dashboard', label: t('admin.dashboard'), icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
              <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
              <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
            </svg>
          )},
          { key: 'users', label: t('admin.users'), icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          )},
          { key: 'ai-usage', label: t('admin.aiUsage'), icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
              <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
              <path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/>
              <path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>
            </svg>
          )},
          { key: 'settings', label: t('admin.settings'), icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )},
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === item.key ? '2px solid var(--sage-600)' : '2px solid transparent',
              color: tab === item.key ? 'var(--sage-600)' : 'var(--ink-500)',
              fontWeight: tab === item.key ? 600 : 400,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Dashboard Tab */}
        {tab === 'dashboard' && stats && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 600 }}>{t('admin.dashboard')}</h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <StatCard label={t('admin.totalUsers')} value={stats.total_users} color="var(--steel-600)" />
              <StatCard label={t('admin.activeUsers')} value={stats.active_users} color="var(--sage-600)" />
              <StatCard label={t('admin.totalPapers')} value={stats.total_papers} color="var(--amber-600)" />
              <StatCard label={t('admin.totalAICalls')} value={stats.total_ai_calls} color="var(--lavender-600)" />
              <StatCard label={t('admin.totalTokens')} value={stats.total_tokens_used} color="var(--rose-600)" />
              <StatCard label={t('admin.usersToday')} value={stats.users_today} />
              <StatCard label={t('admin.papersToday')} value={stats.papers_today} />
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>{t('admin.users')}</h2>
              <input
                type="text"
                placeholder={t('admin.searchUsers')}
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--cream-300)',
                  fontSize: '14px', width: '280px', outline: 'none',
                }}
              />
            </div>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--cream-200)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--cream-100)', textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px' }}>ID</th>
                    <th style={{ padding: '14px 16px' }}>Email</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.role')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.status')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.date')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderTop: '1px solid var(--cream-200)' }}>
                      <td style={{ padding: '14px 16px' }}>{user.id}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>{user.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '99px', fontSize: '13px',
                          background: user.role === 'admin' ? 'var(--sage-100)' : 'var(--cream-100)',
                          color: user.role === 'admin' ? 'var(--sage-600)' : 'var(--ink-500)',
                          fontWeight: 500,
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '99px', fontSize: '13px',
                          background: user.is_active ? 'var(--sage-50)' : 'var(--rose-50)',
                          color: user.is_active ? 'var(--sage-600)' : 'var(--rose-600)',
                        }}>
                          {user.is_active ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--ink-400)', fontSize: '13px' }}>
                        {formatDate(user.created_at)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleUpdateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                              background: 'var(--steel-50)', border: '1px solid var(--steel-100)', color: 'var(--steel-600)',
                            }}
                          >
                            {user.role === 'admin' ? t('admin.makeUser') : t('admin.makeAdmin')}
                          </button>
                          <button
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                              background: user.is_active ? 'var(--amber-50)' : 'var(--sage-50)',
                              border: user.is_active ? '1px solid var(--amber-100)' : '1px solid var(--sage-100)',
                              color: user.is_active ? 'var(--amber-600)' : 'var(--sage-600)',
                            }}
                          >
                            {user.is_active ? t('admin.deactivate') : t('admin.activate')}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                              background: 'var(--rose-50)', border: '1px solid var(--rose-100)', color: 'var(--rose-600)',
                            }}
                          >
                            {t('admin.deleteUser')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-400)', fontSize: '14px' }}>
                        {t('common.loading')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Pagination */}
              {usersTotal > perPage && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
                  <button disabled={userPage <= 1} onClick={() => setUserPage(userPage - 1)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--cream-300)', background: 'white', cursor: 'pointer' }}>
                    ‹
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: '14px', color: 'var(--ink-500)' }}>
                    {userPage} / {totalPages(usersTotal)}
                  </span>
                  <button disabled={userPage >= totalPages(usersTotal)} onClick={() => setUserPage(userPage + 1)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--cream-300)', background: 'white', cursor: 'pointer' }}>
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Usage Tab */}
        {tab === 'ai-usage' && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: 600 }}>{t('admin.aiUsage')}</h2>

            {/* Summary Cards */}
            {aiUsageSummary && (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <StatCard label={t('admin.totalCalls')} value={aiUsageSummary.total_calls} color="var(--lavender-600)" />
                <StatCard label={t('admin.inputTokens')} value={aiUsageSummary.total_prompt_tokens} color="var(--steel-600)" />
                <StatCard label={t('admin.outputTokens')} value={aiUsageSummary.total_completion_tokens} color="var(--amber-600)" />
                <StatCard label={t('admin.totalTokensLabel')} value={aiUsageSummary.total_tokens} color="var(--rose-600)" />
                <StatCard label={t('admin.summarizeCalls')} value={aiUsageSummary.summarize_calls} />
                <StatCard label={t('admin.highlightCalls')} value={aiUsageSummary.auto_highlight_calls} />
              </div>
            )}

            {/* Filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <select
                value={aiFilter}
                onChange={(e) => { setAiFilter(e.target.value); setAiPage(1); }}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--cream-300)',
                  fontSize: '14px', outline: 'none', background: 'white',
                }}
              >
                <option value="">{t('admin.allUsers')}</option>
                <option value="summarize">{t('admin.summarize')}</option>
                <option value="auto_highlight">{t('admin.autoHighlight')}</option>
              </select>
            </div>

            {/* Usage Table */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--cream-200)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--cream-100)', textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px' }}>ID</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.user')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.feature')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.paper')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.inputTokens')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.outputTokens')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.totalTokensLabel')}</th>
                    <th style={{ padding: '14px 16px' }}>{t('admin.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {aiUsage.map((log) => (
                    <tr key={log.id} style={{ borderTop: '1px solid var(--cream-200)' }}>
                      <td style={{ padding: '14px 16px' }}>{log.id}</td>
                      <td style={{ padding: '14px 16px' }}>{log.user_email || log.user_id}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '99px', fontSize: '12px',
                          background: log.feature === 'summarize' ? 'var(--steel-50)' : 'var(--lavender-50)',
                          color: log.feature === 'summarize' ? 'var(--steel-600)' : 'var(--lavender-600)',
                        }}>
                          {log.feature === 'summarize' ? t('admin.summarize') : t('admin.autoHighlight')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.paper_title || '-'}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                        {log.prompt_tokens.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                        {log.completion_tokens.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>
                        {log.total_tokens.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--ink-400)', fontSize: '13px' }}>
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                  {aiUsage.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-400)', fontSize: '14px' }}>
                        {t('admin.noUsage')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Pagination */}
              {aiUsageTotal > perPage && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
                  <button disabled={aiPage <= 1} onClick={() => setAiPage(aiPage - 1)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--cream-300)', background: 'white', cursor: 'pointer' }}>
                    ‹
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: '14px', color: 'var(--ink-500)' }}>
                    {aiPage} / {totalPages(aiUsageTotal)}
                  </span>
                  <button disabled={aiPage >= totalPages(aiUsageTotal)} onClick={() => setAiPage(aiPage + 1)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--cream-300)', background: 'white', cursor: 'pointer' }}>
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 600 }}>{t('admin.aiSettings')}</h2>
            <div style={{
              background: 'white', borderRadius: '12px', border: '1px solid var(--cream-200)',
              padding: '24px', maxWidth: '600px',
            }}>
              {/* Base URL */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ink-700)', marginBottom: '6px' }}>
                  {t('admin.aiBaseUrl')}
                </label>
                <input
                  type="text"
                  value={settings.ai_base_url || ''}
                  onChange={(e) => setSettings({ ...settings, ai_base_url: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--cream-300)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>

              {/* API Key */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ink-700)', marginBottom: '6px' }}>
                  {t('admin.aiApiKey')}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.ai_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                    placeholder="sk-..."
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--cream-300)', fontSize: '14px', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                      background: 'var(--cream-100)', border: '1px solid var(--cream-300)', color: 'var(--ink-600)',
                    }}
                  >
                    {showApiKey ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {settings.ai_api_key_masked && !showApiKey && (
                  <div style={{ fontSize: '12px', color: 'var(--ink-400)', marginTop: '4px' }}>
                    Current: {settings.ai_api_key_masked}
                  </div>
                )}
              </div>

              {/* Model */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--ink-700)', marginBottom: '6px' }}>
                  {t('admin.aiModel')}
                </label>
                <input
                  type="text"
                  value={settings.ai_model || ''}
                  onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                  placeholder="mimo-v2.5-pro"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--cream-300)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>

              {/* Save Button & Message */}
              {settingsMsg && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px',
                  background: settingsMsg.includes('berhasil') || settingsMsg.includes('success') ? 'var(--sage-50)' : 'var(--rose-50)',
                  color: settingsMsg.includes('berhasil') || settingsMsg.includes('success') ? 'var(--sage-600)' : 'var(--rose-600)',
                }}>
                  {settingsMsg}
                </div>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                style={{
                  padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                  cursor: settingsSaving ? 'not-allowed' : 'pointer',
                  background: settingsSaving ? 'var(--cream-200)' : 'var(--sage-600)',
                  border: 'none', color: 'white',
                }}
              >
                {settingsSaving ? t('common.saving') : t('admin.saveSettings')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
