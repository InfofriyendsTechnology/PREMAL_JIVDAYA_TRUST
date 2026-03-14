import { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../axiosConfig.js';
import { FiSave, FiLogOut } from 'react-icons/fi';
import styles from './AdminPanel.module.css';

const LAYOUT_PASSWORD_KEY = 'pjt_layout_pass';
const LAYOUT_PASSWORD = 'Yash@5353';

const DEFAULT_LAYOUT = {
    photoLeft: '0.022', photoTop: '0.148', photoWidth: '0.308', photoHeight: '0.515',
    nameCX: '0.528', nameCY: '0.598', nameFontPct: '0.025', maxName: '18',
};

export default function LayoutSettings() {
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

    // Load template.png once for live preview
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
        img.src = '/template.png';
    }, []);

    // Keep layoutFormRef in sync with state
    useEffect(() => { layoutFormRef.current = layoutForm; }, [layoutForm]);

    // Auto-login if password was saved in session
    useEffect(() => {
        const saved = sessionStorage.getItem(LAYOUT_PASSWORD_KEY);
        if (saved) {
            setAuthed(true);
            fetchLayout();
        }
    }, []);

    const fetchLayout = async () => {
        try {
            const { data } = await axios.get('/api/admin/settings');
            setLayoutForm({
                photoLeft: String(data.photoLeft),
                photoTop: String(data.photoTop),
                photoWidth: String(data.photoWidth),
                photoHeight: String(data.photoHeight),
                nameCX: String(data.nameCX),
                nameCY: String(data.nameCY),
                nameFontPct: String(data.nameFontPct),
                maxName: String(data.maxName),
            });
        } catch {
            // keep defaults
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!password.trim()) return;
        setLoading(true);
        setError('');
        try {
            if (password === LAYOUT_PASSWORD) {
                sessionStorage.setItem(LAYOUT_PASSWORD_KEY, 'true');
                setAuthed(true);
                fetchLayout();
            } else {
                setError('Incorrect password');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(LAYOUT_PASSWORD_KEY);
        setAuthed(false);
        setPassword('');
    };

    // ── All hooks must be called before any conditionals ────
    const handleLayoutChange = (field) => (e) =>
        setLayoutForm((prev) => ({ ...prev, [field]: e.target.value }));

    // ── Live preview draw ────────────────────────────────────────
    const drawPreview = useCallback((form) => {
        const canvas = previewCanvasRef.current;
        const tpl = tplRef.current;
        if (!canvas || !tpl) return;

        const cw = tpl.width;
        const ch = tpl.height;
        canvas.width = cw;
        canvas.height = ch;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(tpl, 0, 0, cw, ch);

        const pl = parseFloat(form.photoLeft) || 0;
        const pt = parseFloat(form.photoTop) || 0;
        const pw = parseFloat(form.photoWidth) || 0;
        const ph = parseFloat(form.photoHeight) || 0;
        const ncx = parseFloat(form.nameCX) || 0;
        const ncy = parseFloat(form.nameCY) || 0;
        const nfp = parseFloat(form.nameFontPct) || 0.025;

        const px = pl * cw, py = pt * ch, pW = pw * cw, pH = ph * ch;
        const nx = ncx * cw, ny = ncy * ch;

        // Photo area — diamond tint + outline
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px + pW / 2, py);
        ctx.lineTo(px + pW, py + pH / 2);
        ctx.lineTo(px + pW / 2, py + pH);
        ctx.lineTo(px, py + pH / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,229,255,0.14)';
        ctx.fill();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        // Name — sample text
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

        // ── Drag handles (drawn on top of everything) ──
        const HR = Math.max(7, Math.round(cw * 0.018));
        const drawH = (hx, hy, stroke, fill = '#fff') => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(hx, hy, HR, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
        };

        // Photo: 4 vertex resize handles + centre move handle
        drawH(px + pW / 2, py, '#00e5ff');
        drawH(px + pW, py + pH / 2, '#00e5ff');
        drawH(px + pW / 2, py + pH, '#00e5ff');
        drawH(px, py + pH / 2, '#00e5ff');
        drawH(px + pW / 2, py + pH / 2, '#00e5ff', 'rgba(0,229,255,0.35)');

        // Name: move handle
        drawH(nx, ny, '#ffeb3b');
    }, []);

    // Redraw on form change
    useEffect(() => {
        if (tplReady && !dragRef.current.active) {
            requestAnimationFrame(() => drawPreview(layoutForm));
        }
    }, [tplReady, layoutForm, drawPreview]);

    // ── Drag interaction helpers ──────────────────────────────
    const getCanvasPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const p = e.touches?.[0] ?? e;
        return {
            x: (p.clientX - rect.left) * (canvas.width / rect.width),
            y: (p.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const HHIT = 20;
    const hitTest = (cx, cy, form, cw, ch) => {
        const pl = parseFloat(form.photoLeft), pt = parseFloat(form.photoTop);
        const pw = parseFloat(form.photoWidth), ph = parseFloat(form.photoHeight);
        const ncx = parseFloat(form.nameCX), ncy = parseFloat(form.nameCY);
        const px = pl * cw, py = pt * ch, pW = pw * cw, pH = ph * ch;
        const nx = ncx * cw, ny = ncy * ch;
        const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
        if (d(cx, cy, nx, ny) <= HHIT) return 'name-move';
        if (d(cx, cy, px + pW / 2, py) <= HHIT) return 'photo-top';
        if (d(cx, cy, px + pW, py + pH / 2) <= HHIT) return 'photo-right';
        if (d(cx, cy, px + pW / 2, py + pH) <= HHIT) return 'photo-bottom';
        if (d(cx, cy, px, py + pH / 2) <= HHIT) return 'photo-left';
        if (d(cx, cy, px + pW / 2, py + pH / 2) <= HHIT) return 'photo-move';
        if (Math.abs(cx - (px + pW / 2)) / (pW / 2) + Math.abs(cy - (py + pH / 2)) / (pH / 2) <= 1) return 'photo-move';
        return null;
    };

    const DRAG_CURSORS = {
        'photo-move': 'grab', 'photo-top': 'ns-resize',
        'photo-bottom': 'ns-resize', 'photo-right': 'ew-resize',
        'photo-left': 'ew-resize', 'name-move': 'grab',
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

        if (type === 'photo-move') {
            n.photoLeft = fmt(cl(parseFloat(sl.photoLeft) + dx / cw));
            n.photoTop = fmt(cl(parseFloat(sl.photoTop) + dy / ch));
        } else if (type === 'photo-top') {
            n.photoTop = fmt(cl(parseFloat(sl.photoTop) + dy / ch));
            n.photoHeight = fmt(cl(parseFloat(sl.photoHeight) - dy / ch, 0.01));
        } else if (type === 'photo-bottom') {
            n.photoHeight = fmt(cl(parseFloat(sl.photoHeight) + dy / ch, 0.01));
        } else if (type === 'photo-right') {
            n.photoWidth = fmt(cl(parseFloat(sl.photoWidth) + dx / cw, 0.01));
        } else if (type === 'photo-left') {
            n.photoLeft = fmt(cl(parseFloat(sl.photoLeft) + dx / cw));
            n.photoWidth = fmt(cl(parseFloat(sl.photoWidth) - dx / cw, 0.01));
        } else if (type === 'name-move') {
            n.nameCX = fmt(cl(parseFloat(sl.nameCX) + dx / cw));
            n.nameCY = fmt(cl(parseFloat(sl.nameCY) + dy / ch));
        }

        drawPreview(n);
        setLayoutForm(n);
    };

    const onPreviewUp = () => {
        dragRef.current.active = false;
        setPreviewCursor('default');
    };

    const handleLayoutSave = async () => {
        setLayoutLoading(true);
        setLayoutMsg('');
        try {
            await axios.put('/api/admin/settings', {
                photoLeft: parseFloat(layoutForm.photoLeft),
                photoTop: parseFloat(layoutForm.photoTop),
                photoWidth: parseFloat(layoutForm.photoWidth),
                photoHeight: parseFloat(layoutForm.photoHeight),
                nameCX: parseFloat(layoutForm.nameCX),
                nameCY: parseFloat(layoutForm.nameCY),
                nameFontPct: parseFloat(layoutForm.nameFontPct),
                maxName: parseInt(layoutForm.maxName, 10),
            }, {
                headers: { 'x-admin-password': LAYOUT_PASSWORD },
            });
            setLayoutMsg('saved');
        } catch {
            setLayoutMsg('error');
        } finally {
            setLayoutLoading(false);
            setTimeout(() => setLayoutMsg(''), 3000);
        }
    };

    // ── Login screen ──
    if (!authed) {
        return (
            <div className={styles.loginPage}>
                <form className={styles.loginCard} onSubmit={handleLogin}>
                    <div className={styles.loginIcon}>🔐</div>
                    <h2 className={styles.loginTitle}>Layout Settings</h2>
                    <p className={styles.loginSub}>Premal Jivdaya Trust – Configure Poster Layout</p>
                    <div className="input-group">
                        <label>Password</label>
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

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>Layout Settings</h1>
                    <span className={styles.headerSub}>Premal Jivdaya Trust – Configure Poster Layout</span>
                </div>
                <div className={styles.headerActions}>
                    <button className={`btn btn-danger`} style={{ opacity: 0.7 }} onClick={handleLogout}>
                        <FiLogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <div className={styles.settingsLayout}>
                {/* LEFT — form */}
                <div className={styles.settingsFormCol}>
                    <p className={styles.settingsNote}>
                        All values are <strong>fractions of the canvas</strong> (0–1), except Max chars.
                        Changes are reflected live in the preview on the right.
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
                        <button
                            className={`btn btn-accent ${styles.settingsSaveBtn}`}
                            onClick={handleLayoutSave}
                            disabled={layoutLoading}
                        >
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
                        Drag <span className={styles.previewLegendPhoto}>◆ handles</span> to move/resize photo
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
