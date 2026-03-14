import { useState, useEffect } from 'react';
import axios from '../axiosConfig.js';
import { FiDownload, FiRefreshCw, FiLogOut, FiUsers, FiTrash2, FiLayout } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import styles from './AdminPanel.module.css';

const ADMIN_PASSWORD_KEY = 'pjt_admin_pass';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('submissions');

  // Auto-login if password was saved in session
  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
    if (saved) { setAuthed(true); fetchData(saved); }
  }, []);


  const fetchData = async (pass) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/admin/submissions', {
        headers: { 'x-admin-password': pass || sessionStorage.getItem(ADMIN_PASSWORD_KEY) },
      });
      setSubmissions(data.submissions);
      setTotal(data.total);
    } catch (e) {
      if (e.response?.status === 401) {
        setError('Incorrect password');
        setAuthed(false);
        sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
      } else {
        setError('Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/admin/submissions', {
        headers: { 'x-admin-password': password },
      });
      sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
      setAuthed(true);
      setSubmissions(data.submissions);
      setTotal(data.total);
      fetchLayout();
    } catch (e) {
      console.error('Login error:', e.message, e.response);
      if (e.response?.status === 401) setError('Incorrect password');
      else if (e.code === 'ERR_NETWORK') setError('Cannot connect to backend. Is the server running on localhost:5001?');
      else setError(`Server error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const pass = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
    window.location.href = `/api/admin/export?password=${pass}`;
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await axios.delete(`/api/admin/submissions/${id}`, {
        headers: { 'x-admin-password': sessionStorage.getItem(ADMIN_PASSWORD_KEY) },
      });
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      alert('Failed to delete record');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL records? This cannot be undone!')) return;
    try {
      await axios.delete('/api/admin/submissions', {
        headers: { 'x-admin-password': sessionStorage.getItem(ADMIN_PASSWORD_KEY) },
      });
      setSubmissions([]);
      setTotal(0);
    } catch {
      alert('Failed to delete all records');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    setAuthed(false);
    setSubmissions([]);
    setPassword('');
  };

  const handleLayoutTabClick = () => {
    navigate('/layout');
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  // ── Login screen ──
  if (!authed) {
    return (
      <div className={styles.loginPage}>
        <form className={styles.loginCard} onSubmit={handleLogin}>
          <div className={styles.loginIcon}><FiUsers size={36} /></div>
          <h2 className={styles.loginTitle}>Admin Panel</h2>
          <p className={styles.loginSub}>Premal Jivdaya Trust – Poster Maker</p>
          <div className="input-group">
            <label>Admin Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
          <button className={`btn btn-primary ${styles.loginBtn}`} type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  // ── Layout Settings tab helpers ──────────────────────────────
  const layoutFields = [
    {
      section: 'Photo Frame', fields: [
        { key: 'photoLeft', label: 'Left (0–1)', hint: 'X start of photo area' },
        { key: 'photoTop', label: 'Top (0–1)', hint: 'Y start of photo area' },
        { key: 'photoWidth', label: 'Width (0–1)', hint: 'Width of photo area' },
        { key: 'photoHeight', label: 'Height (0–1)', hint: 'Height of photo area' },
      ]
    },
    {
      section: 'Name Text', fields: [
        { key: 'nameCX', label: 'Center X (0–1)', hint: 'Horizontal center of name' },
        { key: 'nameCY', label: 'Center Y (0–1)', hint: 'Vertical center of name' },
        { key: 'nameFontPct', label: 'Font size (0–1)', hint: 'Font size as fraction of width' },
        { key: 'maxName', label: 'Max chars', hint: 'Max combined firstName+lastName length', integer: true },
      ]
    },
  ];

  // ── Dashboard ──
  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>Admin Panel</h1>
          <span className={styles.headerSub}>Premal Jivdaya Trust</span>
        </div>
        {/* Mobile: show count on right of header */}
        <div className={styles.headerCount}>
          <span className={styles.headerCountNum}>{total}</span>
          <span className={styles.headerCountLabel}>Downloads</span>
        </div>
        {/* Desktop: action buttons in header */}
        <div className={styles.headerActions}>
          <button className={`btn btn-green`} onClick={handleExport}>
            <FiDownload size={16} /> Export Excel
          </button>
          <button className={`btn btn-outline`} onClick={() => fetchData()} disabled={loading}>
            <FiRefreshCw size={16} /> Refresh
          </button>
          <button className={`btn btn-danger`} onClick={handleDeleteAll}>
            <FiTrash2 size={16} /> Delete All
          </button>
          <button className={`btn btn-danger`} style={{ opacity: 0.7 }} onClick={handleLogout}>
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Mobile: 4-button action strip (LinkedIn style) */}
      <div className={styles.mobileBar}>
        <button className={styles.mobileBarBtn} onClick={handleExport}>
          <FiDownload size={20} />
          <span>Export</span>
        </button>
        <button className={styles.mobileBarBtn} onClick={() => fetchData()} disabled={loading}>
          <FiRefreshCw size={20} />
          <span>Refresh</span>
        </button>
        <button className={`${styles.mobileBarBtn} ${styles.mobileBarDanger}`} onClick={handleDeleteAll}>
          <FiTrash2 size={20} />
          <span>Delete All</span>
        </button>
        <button className={`${styles.mobileBarBtn} ${styles.mobileBarDanger}`} onClick={handleLogout}>
          <FiLogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'submissions' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          <FiUsers size={15} /> Submissions
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'layout' ? styles.tabActive : ''}`}
          onClick={handleLayoutTabClick}
        >
          <FiLayout size={15} /> Layout Settings
        </button>
      </div>

      {/* ── Submissions tab ── */}
      {activeTab === 'submissions' && (
        <>
          {/* Desktop: stats card */}
          <div className={styles.statsBar}>
            <div className={styles.statCard}>
              <span className={styles.statNum}>{total}</span>
              <span className={styles.statLabel}>Total Posters Downloaded</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            {loading ? (
              <div className={styles.loadingMsg}>Loading…</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Phone</th>
                    <th>Date &amp; Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyRow}>No data available yet.</td>
                    </tr>
                  ) : (
                    submissions.map((s, i) => (
                      <tr key={s._id}>
                        <td>{i + 1}</td>
                        <td>{s.firstName}</td>
                        <td>{s.lastName}</td>
                        <td>{s.phone}</td>
                        <td>{formatDate(s.createdAt)}</td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteOne(s._id)}
                            title="Delete"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            {error && <p className={styles.errorMsg} style={{ padding: 16 }}>{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
