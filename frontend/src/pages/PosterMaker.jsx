import { useState, useRef, useEffect } from 'react';
import axios from '../axiosConfig.js';
import { FiUploadCloud, FiDownload, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import Footer from '../components/Footer.jsx';
import premalLogo from '../assets/premal_logo.jpg';
import styles from './PosterMaker.module.css';

// ══════════════════════════════════════════════════════════════
// POSTER LAYOUT — defaults (overridden by /api/admin/settings)
// ══════════════════════════════════════════════════════════════
const CANVAS_W = 1080;
const PREV = 300;   // adjust modal canvas size (px)
const DEFAULT_LAYOUT = {
  photoLeft: 0.022,
  photoTop: 0.148,
  photoWidth: 0.308,
  photoHeight: 0.515,
  nameCX: 0.528,
  nameCY: 0.598,
  nameFontPct: 0.025,
  maxName: 18,
};
// ══════════════════════════════════════════════════════════════

export default function PosterMaker() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const tplRef = useRef(null);   // offscreen PDF canvas
  const imgRef = useRef(null);   // photo Image object

  // Adjust modal — all live values in refs (no re-renders during drag)
  const adjCanvasRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // React state — triggers re-renders & poster redraw
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [tplReady, setTplReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [canvasH, setCanvasH] = useState(CANVAS_W);
  const [photoSrc, setPhotoSrc] = useState(null);
  const [adjOffset, setAdjOffset] = useState({ x: 0, y: 0 });  // confirmed offset
  const [adjZoom, setAdjZoom] = useState(1.0);               // confirmed zoom
  const [showAdjust, setShowAdjust] = useState(false);
  const [sliderVal, setSliderVal] = useState(1.0);
  const [currentTab, setCurrentTab] = useState('create'); // 'create' or 'adjust'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── 0. Fetch layout settings from backend ────────────────────
  useEffect(() => {
    axios.get('/api/admin/settings')
      .then(({ data }) => setLayout({
        photoLeft: data.photoLeft ?? DEFAULT_LAYOUT.photoLeft,
        photoTop: data.photoTop ?? DEFAULT_LAYOUT.photoTop,
        photoWidth: data.photoWidth ?? DEFAULT_LAYOUT.photoWidth,
        photoHeight: data.photoHeight ?? DEFAULT_LAYOUT.photoHeight,
        nameCX: data.nameCX ?? DEFAULT_LAYOUT.nameCX,
        nameCY: data.nameCY ?? DEFAULT_LAYOUT.nameCY,
        nameFontPct: data.nameFontPct ?? DEFAULT_LAYOUT.nameFontPct,
        maxName: data.maxName ?? DEFAULT_LAYOUT.maxName,
      }))
      .catch(() => { }); // keep defaults on error
  }, []);

  // ── 1. Wait for custom fonts (Baloo Bhai 2 / Poppins) ──────────
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  // ── 2. Load PNG template once ────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const img = new Image();
    img.onload = () => {
      const scale = CANVAS_W / img.naturalWidth;
      const off = document.createElement('canvas');
      off.width = CANVAS_W;
      off.height = Math.round(img.naturalHeight * scale);
      off.getContext('2d').drawImage(img, 0, 0, off.width, off.height);
      tplRef.current = off;
      setCanvasH(off.height);
      setTplReady(true);
      setLoading(false);
    };
    img.onerror = () => {
      console.error('PNG template load failed');
      setLoading(false);
    };
    img.src = '/template.png';
  }, []);

  // ── 3. Redraw poster whenever anything changes ────────────────
  useEffect(() => {
    if (!tplReady) return;
    const canvas = canvasRef.current;
    const tpl = tplRef.current;
    if (!canvas || !tpl) return;

    const doDraw = (img) => {
      const ctx = canvas.getContext('2d');
      const cw = tpl.width;
      const ch = tpl.height;

      ctx.clearRect(0, 0, cw, ch);

      // ── Step 1: Photo FIRST (behind template) clipped to diamond area ──
      if (img) {
        const px = layout.photoLeft * cw;
        const py = layout.photoTop * ch;
        const pw = layout.photoWidth * cw;
        const ph = layout.photoHeight * ch;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px + pw / 2, py);
        ctx.lineTo(px + pw, py + ph / 2);
        ctx.lineTo(px + pw / 2, py + ph);
        ctx.lineTo(px, py + ph / 2);
        ctx.closePath();
        ctx.clip();

        const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
        const sc = base * adjZoom;
        const sw = img.naturalWidth * sc;
        const sh = img.naturalHeight * sc;

        // Offset is already in poster pixel coordinates, apply directly
        ctx.drawImage(img,
          px + (pw - sw) / 2 + adjOffset.x,
          py + (ph - sh) / 2 + adjOffset.y,
          sw, sh);
        ctx.restore();
      }

      // ── Step 2: Template ON TOP — ornate border sits over the photo ──
      ctx.drawImage(tpl, 0, 0, cw, ch);

      // ── Step 3: Name in dark banner ──
      const full = `${firstName} ${lastName}`.trim();
      if (full) {
        const fontSize = Math.round(layout.nameFontPct * cw);
        ctx.font = `700 ${fontSize}px 'Baloo Bhai 2', Poppins, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 12;
        // If full name is wider than the banner, show only first name to keep it centered & readable
        const maxWidth = Math.round(0.38 * cw);
        const displayName = ctx.measureText(full).width > maxWidth
          ? (firstName.trim() || full)
          : full;
        ctx.fillText(displayName, layout.nameCX * cw, layout.nameCY * ch, maxWidth);
        ctx.shadowBlur = 0;
      }
    };

    if (photoSrc && imgRef.current) {
      doDraw(imgRef.current);          // fast path — synchronous
    } else if (photoSrc) {
      // fallback: re-load from data URL (handles React timing edge case)
      const img = new Image();
      img.onload = () => { imgRef.current = img; doDraw(img); };
      img.src = photoSrc;
    } else {
      doDraw(null);                    // no photo yet
    }
  }, [tplReady, fontsReady, photoSrc, adjOffset, adjZoom, firstName, lastName, layout]);

  // ── 3. Adjust-modal preview (imperative, no state updates) ────
  const drawPreview = () => {
    const c = adjCanvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, PREV, PREV);

    // Calculate dimensions - SAME as poster logic
    const photoW = layout.photoWidth * CANVAS_W;
    const photoH = layout.photoHeight * CANVAS_W;

    // Same scaling as poster
    const base = Math.max(photoW / img.naturalWidth, photoH / img.naturalHeight);
    const sc = base * zoomRef.current;
    const sw = img.naturalWidth * sc;
    const sh = img.naturalHeight * sc;

    // Scale shape for preview display (not for image scaling)
    const maxDim = Math.max(photoW, photoH);
    const scalePreview = (PREV * 0.85) / maxDim;
    const shapeW = photoW * scalePreview;
    const shapeH = photoH * scalePreview;
    const shapeX = (PREV - shapeW) / 2;
    const shapeY = (PREV - shapeH) / 2;

    // Scale image dimensions for preview display
    const swPreview = sw * scalePreview;
    const shPreview = sh * scalePreview;

    // Draw shape background with subtle color
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(shapeX + shapeW / 2, shapeY);
    ctx.lineTo(shapeX + shapeW, shapeY + shapeH / 2);
    ctx.lineTo(shapeX + shapeW / 2, shapeY + shapeH);
    ctx.lineTo(shapeX, shapeY + shapeH / 2);
    ctx.closePath();
    ctx.fill();

    // Draw image clipped to shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(shapeX + shapeW / 2, shapeY);
    ctx.lineTo(shapeX + shapeW, shapeY + shapeH / 2);
    ctx.lineTo(shapeX + shapeW / 2, shapeY + shapeH);
    ctx.lineTo(shapeX, shapeY + shapeH / 2);
    ctx.closePath();
    ctx.clip();

    // Convert offset from poster pixels to preview pixels for display
    const offsetXPreview = offsetRef.current.x * scalePreview;
    const offsetYPreview = offsetRef.current.y * scalePreview;

    ctx.drawImage(img,
      shapeX + (shapeW - swPreview) / 2 + offsetXPreview,
      shapeY + (shapeH - shPreview) / 2 + offsetYPreview,
      swPreview, shPreview);
    ctx.restore();

    // Draw shape outline with cyan border
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(shapeX + shapeW / 2, shapeY);
    ctx.lineTo(shapeX + shapeW, shapeY + shapeH / 2);
    ctx.lineTo(shapeX + shapeW / 2, shapeY + shapeH);
    ctx.lineTo(shapeX, shapeY + shapeH / 2);
    ctx.closePath();
    ctx.stroke();

    // 3×3 guide grid inside shape
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.8;
    [1, 2].forEach(i => {
      ctx.beginPath();
      ctx.moveTo(shapeX + (shapeW * i / 3), shapeY);
      ctx.lineTo(shapeX + (shapeW * i / 3), shapeY + shapeH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(shapeX, shapeY + (shapeH * i / 3));
      ctx.lineTo(shapeX + shapeW, shapeY + (shapeH * i / 3));
      ctx.stroke();
    });

    // Dimension labels
    const dimText = `${Math.round(photoW)}×${Math.round(photoH)}px @ ${Math.round(zoomRef.current * 100)}%`;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText(dimText, PREV / 2, PREV - 5);
  };

  // Draw preview when modal opens
  useEffect(() => {
    if (!showAdjust) return;
    const t = setTimeout(drawPreview, 40);
    return () => clearTimeout(t);
  }, [showAdjust]);

  // ── 4. Drag handlers ──────────────────────────────────────────
  const getPos = (e) => {
    const p = e.touches?.[0] ?? e;
    return { x: p.clientX, y: p.clientY };
  };
  const onDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    const { x, y } = getPos(e);
    dragStart.current = { x, y, ox: offsetRef.current.x, oy: offsetRef.current.y };
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);

    // Calculate scaling factor from preview to poster
    const photoW = layout.photoWidth * CANVAS_W;
    const photoH = layout.photoHeight * CANVAS_W;
    const maxDim = Math.max(photoW, photoH);
    const scalePreview = (PREV * 0.85) / maxDim;

    // Convert canvas movement to poster pixel movement
    // preview mouse pixels → poster pixel coordinates
    const scaleFactor = 1 / scalePreview;

    offsetRef.current = {
      x: dragStart.current.ox + (x - dragStart.current.x) * scaleFactor,
      y: dragStart.current.oy + (y - dragStart.current.y) * scaleFactor,
    };
    drawPreview();
  };
  const onUp = () => { dragging.current = false; };

  const onSlider = (e) => {
    const val = parseFloat(e.target.value);
    zoomRef.current = val;
    setSliderVal(val);
    drawPreview();
  };
  const zoomStep = (delta) => {
    const val = Math.min(3, Math.max(0.5, zoomRef.current + delta));
    zoomRef.current = val;
    setSliderVal(val);
    drawPreview();
  };

  // ── 5. Open / Apply / Cancel adjust ──────────────────────────
  const openAdjust = () => {
    offsetRef.current = { ...adjOffset };
    zoomRef.current = adjZoom;
    setSliderVal(adjZoom);
    setShowPasswordModal(true); // Show password modal first
    setPasswordInput('');
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === 'Yash') {
      setShowPasswordModal(false);
      setPasswordInput('');
      setCurrentTab('adjust'); // Switch to adjust tab
    } else {
      showToast('❌ Wrong password!');
      setPasswordInput('');
    }
  };

  const applyAdjust = () => {
    setAdjOffset({ ...offsetRef.current });  // confirmed → triggers poster redraw
    setAdjZoom(zoomRef.current);
    setCurrentTab('create'); // Back to create tab after applying
  };

  // ── 6. Photo file selected — direct to poster, then open adjust ─
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;          // store for sync draw
        offsetRef.current = { x: 0, y: 0 };
        zoomRef.current = 1.0;
        setAdjOffset({ x: 0, y: 0 });
        setAdjZoom(1.0);
        setSliderVal(1.0);
        setPhotoSrc(src);                 // → triggers useEffect → redraws poster
        setCurrentTab('adjust');          // → auto-switch to adjust tab
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // ── 7. Helpers ────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const handleDownload = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      showToast('⚠️ Please fill all fields before downloading');
      return;
    }
    setDownloading(true);
    try {
      axios.post('/api/log', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      }).catch(() => { });
      const link = document.createElement('a');
      link.download = `${firstName}_${lastName}_poster.png`;
      link.href = canvasRef.current.toDataURL('image/png', 1.0);
      link.click();
      showToast('✅ Poster downloaded!');
    } catch {
      showToast('❌ Download failed, please try again');
    } finally {
      setDownloading(false);
    }
  };

  const canDownload = firstName.trim() && lastName.trim() && phone.trim() && tplReady && !downloading;

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className={styles.page}>

      {/* ══ PASSWORD MODAL ═════════════════════════════════════════ */}
      {showPasswordModal && (
        <div className={styles.adjOverlay}>
          <div className={styles.passwordModal}>
            <h3 className={styles.passwordTitle}>🔐 Enter Password to Adjust</h3>
            <p className={styles.passwordSub}>Password required to modify photo placement</p>

            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                className={styles.passwordInput}
                autoFocus
              />
              <button
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                type="button"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            <div className={styles.passwordBtns}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setShowPassword(false);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-accent"
                onClick={handlePasswordSubmit}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADJUST PHOTO MODAL ══════════════════════════════════ */}
      {showAdjust && (
        <div className={styles.adjOverlay}>
          <div className={styles.adjModal}>

            <div className={styles.adjHeader}>
              <span className={styles.adjTitle}>Adjust Your Photo</span>
              <span className={styles.adjSub}>Drag photo to fit within the shape • Diamond outline = proper frame</span>
            </div>

            <canvas
              ref={adjCanvasRef}
              width={PREV}
              height={PREV}
              className={styles.adjCanvas}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
              onTouchStart={onDown}
              onTouchMove={onMove}
              onTouchEnd={onUp}
            />

            <div className={styles.adjSliderRow}>
              <span className={styles.adjLabel}>Zoom</span>
              <button className={styles.adjZoomBtn} onClick={() => zoomStep(-0.1)}>−</button>
              <input
                type="range"
                min="0.5" max="3" step="0.05"
                value={sliderVal}
                onChange={onSlider}
                className={styles.adjSlider}
              />
              <button className={styles.adjZoomBtn} onClick={() => zoomStep(+0.1)}>+</button>
              <span className={styles.adjPct}>{Math.round(sliderVal * 100)}%</span>
            </div>

            <div className={styles.adjBtns}>
              <button className="btn btn-outline" onClick={() => setShowAdjust(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={applyAdjust}>Apply</button>
            </div>

          </div>
        </div>
      )}

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <img src={premalLogo} alt="Premal Jivdaya Trust" className={styles.headerLogo} />
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>પ્રેમાળ જીવદયા ટ્રસ્ટ</h1>
            <p className={styles.headerSub}>Create Your Poster · આપ પણ આપનું પોસ્ટર બનાવો</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── LEFT: Poster canvas ── */}
        <section className={styles.canvasSection}>
          <div className={styles.canvasWrap}>
            {loading && (
              <div className={styles.canvasLoader}>
                <span className={styles.spinner} />
                <p>Loading template…</p>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={canvasH}
              className={styles.canvas}
            />
          </div>
        </section>

        {/* ── RIGHT: Controls ── */}
        <aside className={styles.controls}>

          {/* Photo card */}
          <div className={`card ${styles.controlCard}`}>
            <div className={styles.cardHeader}>
              <FiUploadCloud size={22} />
              <span>Upload Profile Pic</span>
            </div>
            <p className={styles.cardSub}>આપનો ફોટો અહીં મૂકવો.</p>

            <div
              className={styles.uploadBox}
              onClick={() => fileInputRef.current.click()}
              style={photoSrc ? { backgroundImage: `url(${photoSrc})` } : {}}
            >
              {!photoSrc && (
                <>
                  <FiUser size={40} color="#ffffff" />
                  <span>Click to upload photo</span>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhoto}
            />

            {/* Change + Adjust buttons after photo is set */}
            {photoSrc && (
              <div className={styles.photoActions}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => fileInputRef.current.click()}
                >
                  Change Photo
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={openAdjust}
                >
                  Adjust
                </button>
              </div>
            )}
          </div>

          {/* Name card */}
          <div className={`card ${styles.controlCard}`}>
            <div className={styles.cardHeader}>
              <FiUser size={20} />
              <span>Enter Your Name</span>
            </div>
            <p className={styles.cardSub}>આપનું નામ અહીં લખો.</p>
            <div className={styles.nameRow}>
              <div className="input-group">
                <label>First Name / નામ</label>
                <input
                  type="text"
                  placeholder="e.g. Yash"
                  value={firstName}
                  maxLength={Math.max(1, layout.maxName - lastName.trim().length)}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Last Name / અટક</label>
                <input
                  type="text"
                  placeholder="e.g. Patel"
                  value={lastName}
                  maxLength={Math.max(1, layout.maxName - firstName.trim().length)}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.nameCounter}>
              <span style={{ color: (firstName.trim().length + lastName.trim().length) >= layout.maxName ? '#e53e3e' : '#888' }}>
                {firstName.trim().length + lastName.trim().length} / {layout.maxName} characters
              </span>
            </div>
            <div className="input-group" style={{ marginTop: 16 }}>
              <label>Phone No. / ફોન નંબર</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={15}
              />
            </div>
          </div>

          {/* Download button */}
          <button
            className={`btn btn-accent ${styles.downloadBtn}`}
            onClick={handleDownload}
            disabled={!canDownload}
          >
            <FiDownload size={20} />
            {downloading ? 'Downloading…' : 'DOWNLOAD'}
          </button>

          {toast && <div className={styles.toast}>{toast}</div>}
        </aside>
      </main>

      <Footer />
    </div>
  );
}
