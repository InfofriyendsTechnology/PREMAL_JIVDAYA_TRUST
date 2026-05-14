import { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../axiosConfig.js';
import { FiSave, FiLogOut } from 'react-icons/fi';
import styles from './AdminPanel.module.css';

const LAYOUT_PASSWORD_KEY = 'pjt_nu_layout_pass';
const LAYOUT_PASSWORD = 'Yash@5353';
const ADMIN_PASSWORD = 'PremalJivdaya@2024';

const DEFAULT_LAYOUT = {
  rvFrameCX: '0.22', rvFrameCY: '0.69', rvFrameR: '0.17',
  rvNameCX: '0.70', rvNameCY: '0.84', rvNameFontPct: '0.025', rvMaxName: '18',
};

export default function RukmaniVivahLayout() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [layoutForm, setLayoutForm] = useState(DEFAULT_LAYOUT);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutMsg, setLayoutMsg] = useState('');

  // Live preview canvas
  const previewCanvasRef = useRef(null);
  const tplRef = useRef(null);
  const [tplReady, setTplReady] = useState(false);
  const dragRef = useRef({ active: false, type: null, startX: 0, startY: 0, startLayout: null });
  const layoutFormRef = useRef(DEFAULT_LAYOUT);
  const [previewCursor, setPreviewCursor] = useState('default');

  // Load RukmaniVivah.png for preview
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const SIZE = 480;
      const off = document.createElement('canvas');
      off.width = SIZE;
      off.height = Math.round(img.naturalHeight * (SIZE / img.naturalWidth));
      off.getContext('2d').drawImage(img, 0, 0, off.width, off.height);
      tplRef.current = off;
      setTplReady(true);
    };
    img.src = '/RukmaniVivah.png';
  }, []);

  useEffect(() => { layoutFormRef.current = layoutForm; }, [layoutForm]);

  // Auto-login
  useEffect(() => {
    const saved = sessionStorage.getItem(LAYOUT_PASSWORD_KEY);
    if (saved) { setAuthed(true); fetchLayout(); }
  }, []);

  const fetchLayout = async () => {
    try {
      const { data } = await axios.get('/api/admin/rukmani-vivah-settings');
      setLayoutForm({
        rvFrameCX:     String(data.rvFrameCX),
        rvFrameCY:     String(data.rvFrameCY),
        rvFrameR:      String(data.rvFrameR),
        rvNameCX:      String(data.rvNameCX),
        rvNameCY:      String(data.rvNameCY),
        rvNameFontPct: String(data.rvNameFontPct),
        rvMaxName:     String(data.rvMaxName),
      });
    } catch { /* keep defaults */ }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError('');
    try {
      if (password === LAYOUT_PASSWORD) {
        sessionStorage.setItem(LAYOUT_PASSWORD_KEY, 'true');
        setAuthed(true); fetchLayout();
      } else { setError('Incorrect password'); }
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(LAYOUT_PASSWORD_KEY);
    setAuthed(false); setPassword('');
  };

  const handleLayoutChange = (field) => (e) =>
    setLayoutForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Live preview ──────────────────────────────────────────
  const drawPreview = useCallback((form) => {
    const canvas = previewCanvasRef.current;
    const tpl = tplRef.current;
    if (!canvas || !tpl) return;

    const cw = tpl.width, ch = tpl.height;
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(tpl, 0, 0, cw, ch);

    const fcx = parseFloat(form.rvFrameCX) || 0;
    const fcy = parseFloat(form.rvFrameCY) || 0;
    const fr  = parseFloat(form.rvFrameR) || 0;
    const ncx = parseFloat(form.rvNameCX) || 0;
    const ncy = parseFloat(form.rvNameCY) || 0;
    const nfp = parseFloat(form.rvNameFontPct) || 0.025;

    const cx = fcx * cw, cy = fcy * ch, r = fr * cw;
    const nx = ncx * cw, ny = ncy * ch;

    // Frame area — circle tint + outline
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,229,255,0.14)';
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Name sample text
    const fontSize = Math.max(8, Math.round(nfp * cw));
    ctx.save();
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.fillStyle = '#ffeb3b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.fillText('Sample Name', nx, ny, Math.round(0.38 * cw));
    ctx.shadowBlur = 0;
    // crosshair
    ctx.strokeStyle = 'rgba(255,235,59,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(nx - 30, ny); ctx.lineTo(nx + 30, ny); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nx, ny - 20); ctx.lineTo(nx, ny + 20); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Drag handles
    const HR = Math.max(7, Math.round(cw * 0.018));
    const drawH = (hx, hy, stroke, fill = '#fff') => {
      ctx.save();
      ctx.beginPath(); ctx.arc(hx, hy, HR, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    };

    // Frame: center move + edge resize handles (N,E,S,W)
    drawH(cx, cy, '#00e5ff', 'rgba(0,229,255,0.35)'); // center
    drawH(cx, cy - r, '#00e5ff');  // top
    drawH(cx + r, cy, '#00e5ff');  // right
    drawH(cx, cy + r, '#00e5ff');  // bottom
    drawH(cx - r, cy, '#00e5ff');  // left

    // Name: move handle
    drawH(nx, ny, '#ffeb3b');
  }, []);

  useEffect(() => {
    if (tplReady && !dragRef.current.active) {
      requestAnimationFrame(() => drawPreview(layoutForm));
    }
  }, [tplReady, layoutForm, drawPreview]);

  // ── Drag ──
  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches?.[0] ?? e;
    return {
      x: (p.clientX - rect.left) * (canvas.width / rect.width),
      y: (p.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const HHIT = 20;
  const hitTest = (mx, my, form, cw, ch) => {
    const fcx = parseFloat(form.rvFrameCX) * cw;
    const fcy = parseFloat(form.rvFrameCY) * ch;
    const fr  = parseFloat(form.rvFrameR) * cw;
    const ncx = parseFloat(form.rvNameCX) * cw;
    const ncy = parseFloat(form.rvNameCY) * ch;
    const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

    if (d(mx, my, ncx, ncy) <= HHIT) return 'name-move';
    if (d(mx, my, fcx, fcy - fr) <= HHIT) return 'frame-top';
    if (d(mx, my, fcx + fr, fcy) <= HHIT) return 'frame-right';
    if (d(mx, my, fcx, fcy + fr) <= HHIT) return 'frame-bottom';
    if (d(mx, my, fcx - fr, fcy) <= HHIT) return 'frame-left';
    if (d(mx, my, fcx, fcy) <= HHIT) return 'frame-move';
    if (d(mx, my, fcx, fcy) <= fr) return 'frame-move';
    return null;
  };

  const DRAG_CURSORS = {
    'frame-move': 'grab', 'frame-top': 'ns-resize',
    'frame-bottom': 'ns-resize', 'frame-right': 'ew-resize',
    'frame-left': 'ew-resize', 'name-move': 'grab',
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

    if (type === 'frame-move') {
      n.rvFrameCX = fmt(cl(parseFloat(sl.rvFrameCX) + dx / cw));
      n.rvFrameCY = fmt(cl(parseFloat(sl.rvFrameCY) + dy / ch));
    } else if (type === 'frame-top' || type === 'frame-bottom') {
      const delta = type === 'frame-top' ? -dy : dy;
      n.rvFrameR = fmt(cl(parseFloat(sl.rvFrameR) + delta / cw, 0.01, 0.5));
    } else if (type === 'frame-left' || type === 'frame-right') {
      const delta = type === 'frame-left' ? -dx : dx;
      n.rvFrameR = fmt(cl(parseFloat(sl.rvFrameR) + delta / cw, 0.01, 0.5));
    } else if (type === 'name-move') {
      n.rvNameCX = fmt(cl(parseFloat(sl.rvNameCX) + dx / cw));
      n.rvNameCY = fmt(cl(parseFloat(sl.rvNameCY) + dy / ch));
    }

    drawPreview(n);
    setLayoutForm(n);
  };

  const onPreviewUp = () => {
    dragRef.current.active = false;
    setPreviewCursor('default');
  };

  const handleLayoutSave = async () => {
    setLayoutLoading(true); setLayoutMsg('');
    try {
      await axios.put('/api/admin/rukmani-vivah-settings', {
        rvFrameCX:     parseFloat(layoutForm.rvFrameCX),
        rvFrameCY:     parseFloat(layoutForm.rvFrameCY),
        rvFrameR:      parseFloat(layoutForm.rvFrameR),
        rvNameCX:      parseFloat(layoutForm.rvNameCX),
        rvNameCY:      parseFloat(layoutForm.rvNameCY),
        rvNameFontPct: parseFloat(layoutForm.rvNameFontPct),
        rvMaxName:     parseInt(layoutForm.rvMaxName, 10),
      }, {
        headers: { 'x-admin-password': ADMIN_PASSWORD },
      });
      setLayoutMsg('saved');
    } catch { setLayoutMsg('error'); }
    finally { setLayoutLoading(false); setTimeout(() => setLayoutMsg(''), 3000); }
  };

  // ── Login screen ──
  if (!authed) {
    return (
      <div className={styles.loginPage}>
        <form className={styles.loginCard} onSubmit={handleLogin}>
          <div className={styles.loginIcon}>🔐</div>
          <h2 className={styles.loginTitle}>Rukmani Vivah Layout</h2>
          <p className={styles.loginSub}>Configure Rukmani Vivah Poster Layout</p>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="Enter password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
          <button className={`btn btn-primary ${styles.loginBtn}`} type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  const layoutFields = [
    {
      section: 'Photo Frame (Circle)', fields: [
        { key: 'rvFrameCX', label: 'Center X (0–1)', hint: 'Horizontal center of frame' },
        { key: 'rvFrameCY', label: 'Center Y (0–1)', hint: 'Vertical center of frame' },
        { key: 'rvFrameR', label: 'Radius (0–1)', hint: 'Radius as fraction of width' },
      ]
    },
    {
      section: 'Name Text', fields: [
        { key: 'rvNameCX', label: 'Center X (0–1)', hint: 'Horizontal center of name' },
        { key: 'rvNameCY', label: 'Center Y (0–1)', hint: 'Vertical center of name' },
        { key: 'rvNameFontPct', label: 'Font size (0–1)', hint: 'Font size as fraction of width' },
        { key: 'rvMaxName', label: 'Max chars', hint: 'Max name length', integer: true },
      ]
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>Rukmani Vivah Layout</h1>
          <span className={styles.headerSub}>Configure Rukmani Vivah Poster Layout</span>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-danger" style={{ opacity: 0.7 }} onClick={handleLogout}>
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className={styles.settingsLayout}>
        {/* LEFT — form */}
        <div className={styles.settingsFormCol}>
          <p className={styles.settingsNote}>
            All values are <strong>fractions of the canvas</strong> (0–1), except Max chars.
            Changes are reflected live in the preview.
          </p>

          {layoutFields.map(({ section, fields }) => (
            <div key={section} className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>{section}</h3>
              <div className={styles.settingsGrid}>
                {fields.map(({ key, label, hint, integer }) => (
                  <div key={key} className={styles.settingsField}>
                    <label className={styles.settingsLabel}>{label}</label>
                    <input
                      type="number"
                      step={integer ? '1' : '0.001'}
                      min={integer ? '1' : '0'}
                      max={integer ? '100' : '1'}
                      value={layoutForm[key]}
                      onChange={handleLayoutChange(key)}
                      className={styles.settingsInput}
                    />
                    <span className={styles.settingsHint}>{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.settingsSaveRow}>
            <button className={`btn btn-accent ${styles.settingsSaveBtn}`}
              onClick={handleLayoutSave} disabled={layoutLoading}>
              <FiSave size={16} />
              {layoutLoading ? 'Saving…' : 'Save Layout'}
            </button>
            {layoutMsg === 'saved' && <span className={styles.settingsMsgOk}>&#10003; Saved!</span>}
            {layoutMsg === 'error' && <span className={styles.settingsMsgErr}>&#10005; Save failed</span>}
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div className={styles.settingsPreviewCol}>
          <p className={styles.previewTitle}>Live Preview</p>
          <p className={styles.previewSub}>
            Drag <span className={styles.previewLegendPhoto}>● handles</span> to move/resize frame
            &nbsp;·&nbsp;
            drag <span className={styles.previewLegendName}>● handle</span> to move name
          </p>
          {tplReady
            ? (
              <canvas
                ref={previewCanvasRef}
                className={styles.previewCanvas}
                style={{ cursor: previewCursor, touchAction: 'none' }}
                onMouseDown={onPreviewDown}
                onMouseMove={onPreviewMove}
                onMouseUp={onPreviewUp}
                onMouseLeave={onPreviewUp}
                onTouchStart={onPreviewDown}
                onTouchMove={onPreviewMove}
                onTouchEnd={onPreviewUp}
              />
            )
            : <div className={styles.previewPlaceholder}>Loading template…</div>
          }
        </div>
      </div>
    </div>
  );
}
