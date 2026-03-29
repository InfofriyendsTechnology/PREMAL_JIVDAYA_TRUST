import { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../axiosConfig.js';
import { FiSave, FiLogOut, FiRefreshCw } from 'react-icons/fi';
import styles from './NewsMitraAdmin.module.css';

const ADMIN_KEY = 'nm_admin_pass';
const DEFAULT_LAYOUT = {
  captionX: '0.500', captionY: '0.205',
  captionFontPct: '0.038', captionMaxWidth: '0.800',
  videoLeft: '0.060', videoTop: '0.268',
  videoWidth: '0.866', videoHeight: '0.600',
};

export default function NewsMitraAdmin() {
  const [password, setPassword]   = useState('');
  const [authed, setAuthed]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  
  const [layoutForm, setLayoutForm] = useState(DEFAULT_LAYOUT);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');

  // Live preview canvas
  const previewCanvasRef = useRef(null);
  const frameRef = useRef(null);
  const [frameReady, setFrameReady] = useState(false);
  const dragRef = useRef({ active: false, type: null, startX: 0, startY: 0, startLayout: null });
  const layoutFormRef = useRef(DEFAULT_LAYOUT);
  const [previewCursor, setPreviewCursor] = useState('default');

  // Load frame.png once for live preview
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const SIZE = 420; // smaller preview size to fit screen better
      const off = document.createElement('canvas');
      off.width = SIZE;
      off.height = Math.round(img.naturalHeight * (SIZE / img.naturalWidth));
      off.getContext('2d').drawImage(img, 0, 0, off.width, off.height);
      frameRef.current = off;
      setFrameReady(true);
    };
    img.src = '/newsmitra_frame.png';
  }, []);

  // Keep layoutFormRef in sync with state
  useEffect(() => { layoutFormRef.current = layoutForm; }, [layoutForm]);

  // Auto-login
  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY);
    if (saved) {
      setAuthed(true);
      fetchLayout();
    }
  }, []);

  const fetchLayout = async () => {
    try {
      const { data } = await axios.get('/api/newsmitra/settings');
      setLayoutForm({
        captionX: String(data.captionX), captionY: String(data.captionY),
        captionFontPct: String(data.captionFontPct), captionMaxWidth: String(data.captionMaxWidth),
        videoLeft: String(data.videoLeft), videoTop: String(data.videoTop),
        videoWidth: String(data.videoWidth), videoHeight: String(data.videoHeight),
      });
    } catch { /* defaults */ }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError('');
    try {
      await axios.get('/api/newsmitra/auth', { headers: { 'x-admin-password': password } });
      sessionStorage.setItem(ADMIN_KEY, password);
      setAuthed(true);
      fetchLayout();
    } catch { setError('Incorrect password'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_KEY);
    setAuthed(false); setPassword('');
  };

  const handleLayoutChange = (field) => (e) => setLayoutForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Live preview draw ────────────────────────────────────────
  const drawPreview = useCallback((form) => {
    const canvas = previewCanvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    const cw = frame.width;
    const ch = frame.height;
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(frame, 0, 0, cw, ch);

    const vl = parseFloat(form.videoLeft) || 0;
    const vt = parseFloat(form.videoTop) || 0;
    const vw = parseFloat(form.videoWidth) || 0;
    const vh = parseFloat(form.videoHeight) || 0;
    const cx = parseFloat(form.captionX) || 0;
    const cy = parseFloat(form.captionY) || 0;
    const cfp = parseFloat(form.captionFontPct) || 0.038;

    const px = vl * cw, py = vt * ch, pW = vw * cw, pH = vh * ch;
    const nx = cx * cw, ny = cy * ch;

    // Video area — tinted box + outline
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pW, pH);
    ctx.fillStyle = 'rgba(239,68,68,0.15)'; // Red tint for video area
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Label
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';
    ctx.fillText('VIDEO AREA', px + pW/2, py + pH/2);
    ctx.restore();

    // Caption — sample text
    const fontSize = Math.max(8, Math.round(cfp * cw * 1.5)); // slightly larger in preview for visibility
    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#38bdf8'; // light blue for edit mode
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sample Caption Here', nx, ny, Math.round((parseFloat(form.captionMaxWidth)||0.8) * cw));
    
    // crosshair
    ctx.strokeStyle = 'rgba(56,189,248,0.5)';
    ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(nx - 40, ny); ctx.lineTo(nx + 40, ny); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nx, ny - 25); ctx.lineTo(nx, ny + 25); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── Drag handles ──
    const HR = Math.max(6, Math.round(cw * 0.015));
    const drawH = (hx, hy, stroke, fill = '#fff') => {
      ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, HR, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    };

    // Video handles
    drawH(px + pW / 2, py, '#ef4444');
    drawH(px + pW, py + pH / 2, '#ef4444');
    drawH(px + pW / 2, py + pH, '#ef4444');
    drawH(px, py + pH / 2, '#ef4444');
    drawH(px + pW / 2, py + pH / 2, '#ef4444', 'rgba(239,68,68,0.3)'); // center move

    // Caption move handle
    drawH(nx, ny, '#38bdf8');
  }, []);

  useEffect(() => {
    if (frameReady && !dragRef.current.active) {
      requestAnimationFrame(() => drawPreview(layoutForm));
    }
  }, [frameReady, layoutForm, drawPreview]);

  // ── Drag interaction ──────────────────────────────
  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches?.[0] ?? e;
    return {
      x: (p.clientX - rect.left) * (canvas.width / rect.width),
      y: (p.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const HHIT = 15;
  const hitTest = (x, y, form, cw, ch) => {
    const vl = parseFloat(form.videoLeft), vt = parseFloat(form.videoTop);
    const vw = parseFloat(form.videoWidth), vh = parseFloat(form.videoHeight);
    const cx = parseFloat(form.captionX), cy = parseFloat(form.captionY);
    const px = vl * cw, py = vt * ch, pW = vw * cw, pH = vh * ch;
    const nx = cx * cw, ny = cy * ch;
    const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
    
    if (d(x, y, nx, ny) <= HHIT) return 'caption-move';
    if (d(x, y, px + pW / 2, py) <= HHIT) return 'video-top';
    if (d(x, y, px + pW, py + pH / 2) <= HHIT) return 'video-right';
    if (d(x, y, px + pW / 2, py + pH) <= HHIT) return 'video-bottom';
    if (d(x, y, px, py + pH / 2) <= HHIT) return 'video-left';
    if (d(x, y, px + pW / 2, py + pH / 2) <= HHIT) return 'video-move';
    if (Math.abs(x - (px + pW / 2)) / (pW / 2) + Math.abs(y - (py + pH / 2)) / (pH / 2) <= 1) return 'video-move';
    return null;
  };

  const DRAG_CURSORS = {
    'video-move': 'grab', 'video-top': 'ns-resize', 'video-bottom': 'ns-resize',
    'video-right': 'ew-resize', 'video-left': 'ew-resize', 'caption-move': 'grab',
  };

  const onPreviewDown = (e) => {
    e.preventDefault();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasPos(e, canvas);
    const type = hitTest(x, y, layoutFormRef.current, canvas.width, canvas.height);
    if (!type) return;
    dragRef.current = { active: true, type, startX: x, startY: y, startLayout: { ...layoutFormRef.current } };
    setPreviewCursor(type.includes('move') ? 'grabbing' : DRAG_CURSORS[type]);
  };

  const onPreviewMove = (e) => {
    e.preventDefault();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasPos(e, canvas);
    const cw = canvas.width, ch = canvas.height;

    if (!dragRef.current.active) {
      const type = hitTest(x, y, layoutFormRef.current, cw, ch);
      setPreviewCursor(type ? (DRAG_CURSORS[type] ?? 'grab') : 'default');
      return;
    }

    const { type, startX, startY, startLayout: sl } = dragRef.current;
    const dx = x - startX, dy = y - startY;
    const cl = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
    const fmt = (v) => parseFloat(v.toFixed(4)).toString();
    const n = { ...sl };

    if (type === 'video-move') {
      n.videoLeft = fmt(cl(parseFloat(sl.videoLeft) + dx / cw));
      n.videoTop = fmt(cl(parseFloat(sl.videoTop) + dy / ch));
    } else if (type === 'video-top') {
      n.videoTop = fmt(cl(parseFloat(sl.videoTop) + dy / ch));
      n.videoHeight = fmt(cl(parseFloat(sl.videoHeight) - dy / ch, 0.01));
    } else if (type === 'video-bottom') {
      n.videoHeight = fmt(cl(parseFloat(sl.videoHeight) + dy / ch, 0.01));
    } else if (type === 'video-right') {
      n.videoWidth = fmt(cl(parseFloat(sl.videoWidth) + dx / cw, 0.01));
    } else if (type === 'video-left') {
      n.videoLeft = fmt(cl(parseFloat(sl.videoLeft) + dx / cw));
      n.videoWidth = fmt(cl(parseFloat(sl.videoWidth) - dx / cw, 0.01));
    } else if (type === 'caption-move') {
      n.captionX = fmt(cl(parseFloat(sl.captionX) + dx / cw));
      n.captionY = fmt(cl(parseFloat(sl.captionY) + dy / ch));
    }

    drawPreview(n);
    setLayoutForm(n);
  };

  const onPreviewUp = () => { dragRef.current.active = false; setPreviewCursor('default'); };

  const handleLayoutSave = async () => {
    setSaving(true);
    try {
      await axios.put('/api/newsmitra/settings', {
        videoLeft: parseFloat(layoutForm.videoLeft), videoTop: parseFloat(layoutForm.videoTop),
        videoWidth: parseFloat(layoutForm.videoWidth), videoHeight: parseFloat(layoutForm.videoHeight),
        captionX: parseFloat(layoutForm.captionX), captionY: parseFloat(layoutForm.captionY),
        captionFontPct: parseFloat(layoutForm.captionFontPct), captionMaxWidth: parseFloat(layoutForm.captionMaxWidth),
      }, { headers: { 'x-admin-password': sessionStorage.getItem(ADMIN_KEY) } });
      showToast('✅ Saved successfully!');
    } catch { showToast('❌ Save failed'); }
    finally { setSaving(false); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  if (!authed) return (
    <div className={styles.loginPage}>
      <form className={styles.loginCard} onSubmit={handleLogin}>
        <img src="/newsmitra_logo.png" alt="News Mitra" className={styles.loginLogo} />
        <h2 className={styles.loginTitle}>Admin Settings</h2>
        <div className="input-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
        </div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        <button className={`btn btn-accent ${styles.loginBtn}`} type="submit" disabled={loading}>Login</button>
      </form>
    </div>
  );

  const formFields = [
    {
      section: 'Video Area', fields: [
        { key: 'videoLeft', label: 'Left' }, { key: 'videoTop', label: 'Top' },
        { key: 'videoWidth', label: 'Width' }, { key: 'videoHeight', label: 'Height' }
      ]
    },
    {
      section: 'Caption Position', fields: [
        { key: 'captionX', label: 'Center X' }, { key: 'captionY', label: 'Center Y' },
        { key: 'captionFontPct', label: 'Font Size' }, { key: 'captionMaxWidth', label: 'Max Width' }
      ]
    }
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/newsmitra_logo.png" alt="News Mitra" className={styles.headerLogo} />
          <div>
            <h1 className={styles.headerTitle}>News Mitra Editor</h1>
            <span className={styles.headerSub}>Drag boxes on the canvas to adjust positions</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-danger" onClick={handleLogout}><FiLogOut size={16} /> Logout</button>
        </div>
      </header>

      <div className={styles.mainContent}>
        
        {/* LEFT — form controls */}
        <div className={styles.controlsCol}>
          <div className={styles.infoBox}>Drag elements on the right preview, or edit exact fractions below (0 to 1).</div>

          {formFields.map(({ section, fields }) => (
            <div key={section} className={styles.sectionCard}>
              <h3 className={styles.sectionTitle}>{section}</h3>
              <div className={styles.grid}>
                {fields.map(({ key, label }) => (
                  <div key={key} className={styles.field}>
                    <label className={styles.fieldLabel}>{label}</label>
                    <input type="number" step="0.001" min="0" max="1"
                      value={layoutForm[key]} onChange={handleLayoutChange(key)} className={styles.fieldInput} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button className={`btn btn-accent ${styles.saveBtn}`} onClick={handleLayoutSave} disabled={saving}>
            <FiSave size={18} /> {saving ? 'Saving…' : 'Save Layout Positions'}
          </button>
        </div>

        {/* RIGHT — canvas preview */}
        <div className={styles.previewCol}>
          <div className={styles.previewHeader}>Live Canvas Preview</div>
          <div className={styles.previewWrap}>
            {!frameReady ? <div className={styles.loading}>Loading frame...</div> : (
              <canvas
                ref={previewCanvasRef}
                className={styles.previewCanvas}
                style={{ cursor: previewCursor, touchAction: 'none' }}
                onMouseDown={onPreviewDown} onMouseMove={onPreviewMove} onMouseUp={onPreviewUp} onMouseLeave={onPreviewUp}
                onTouchStart={onPreviewDown} onTouchMove={onPreviewMove} onTouchEnd={onPreviewUp}
              />
            )}
          </div>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
