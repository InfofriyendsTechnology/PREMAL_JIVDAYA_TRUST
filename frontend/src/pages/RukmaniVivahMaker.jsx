import { useState, useRef, useEffect } from 'react';
import axios from '../axiosConfig.js';
import { FiUploadCloud, FiDownload, FiUser } from 'react-icons/fi';
import Footer from '../components/Footer.jsx';
import premalLogo from '../assets/premal_logo.jpg';
import styles from './RukmaniVivahMaker.module.css';

// ══════════════════════════════════════════════════════════════
// NAND UTSAV POSTER — canvas layout constants (defaults, overridden by backend)
// ══════════════════════════════════════════════════════════════
const CANVAS_W = 1080;
const PREV = 300;

const DEFAULT_FRAME = { cx: 0.22, cy: 0.69, r: 0.17 };
const DEFAULT_NAME = { cx: 0.70, cy: 0.84, fontPct: 0.025, maxName: 18 };

export default function RukmaniVivahMaker() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const tplRef = useRef(null);
  const imgRef = useRef(null);

  // Adjust modal refs
  const adjCanvasRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Dynamic layout from backend
  const [FRAME, setFRAME] = useState(DEFAULT_FRAME);
  const [NAME, setNAME] = useState(DEFAULT_NAME);

  // State
  const [tplReady, setTplReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [canvasH, setCanvasH] = useState(CANVAS_W);
  const [photoSrc, setPhotoSrc] = useState(null);
  const [adjOffset, setAdjOffset] = useState({ x: 0, y: 0 });
  const [adjZoom, setAdjZoom] = useState(1.0);
  const [showAdjust, setShowAdjust] = useState(false);
  const [sliderVal, setSliderVal] = useState(1.0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState('');

  // ── 0. Fetch layout settings from backend ──
  useEffect(() => {
    axios.get('/api/admin/rukmani-vivah-settings')
      .then(({ data }) => {
        setFRAME({
          cx: data.rvFrameCX ?? DEFAULT_FRAME.cx,
          cy: data.rvFrameCY ?? DEFAULT_FRAME.cy,
          r:  data.rvFrameR  ?? DEFAULT_FRAME.r,
        });
        setNAME({
          cx:      data.rvNameCX      ?? DEFAULT_NAME.cx,
          cy:      data.rvNameCY      ?? DEFAULT_NAME.cy,
          fontPct: data.rvNameFontPct ?? DEFAULT_NAME.fontPct,
          maxName: data.rvMaxName     ?? DEFAULT_NAME.maxName,
        });
      })
      .catch(() => {}); // keep defaults on error
  }, []);

  // ── 1. Fonts ──
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  // ── 2. Load RukmaniVivah.png template ──
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
      console.error('RukmaniVivah template load failed');
      setLoading(false);
    };
    img.src = '/RukmaniVivah.png';
  }, []);

  // ── 3. Redraw poster ──
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

      // Step 1: Draw user photo FIRST (behind template) clipped to circle
      if (img) {
        const cx = FRAME.cx * cw;
        const cy = FRAME.cy * ch;
        const r = FRAME.r * cw;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const diameter = r * 2;
        const base = Math.max(diameter / img.naturalWidth, diameter / img.naturalHeight);
        const sc = base * adjZoom;
        const sw = img.naturalWidth * sc;
        const sh = img.naturalHeight * sc;

        ctx.drawImage(img,
          cx - sw / 2 + adjOffset.x,
          cy - sh / 2 + adjOffset.y,
          sw, sh);
        ctx.restore();
      }

      // Step 2: Template ON TOP — ornate border covers photo edges
      ctx.drawImage(tpl, 0, 0, cw, ch);

      // Step 3: Name in dark banner
      const full = `${firstName} ${lastName}`.trim();
      if (full) {
        const fontSize = Math.round(NAME.fontPct * cw);
        ctx.font = `700 ${fontSize}px 'Baloo Bhai 2', Poppins, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 12;
        const maxWidth = Math.round(0.38 * cw);
        const displayName = ctx.measureText(full).width > maxWidth
          ? (firstName.trim() || full)
          : full;
        ctx.fillText(displayName, NAME.cx * cw, NAME.cy * ch, maxWidth);
        ctx.shadowBlur = 0;
      }
    };

    if (photoSrc && imgRef.current) {
      doDraw(imgRef.current);
    } else if (photoSrc) {
      const img = new Image();
      img.onload = () => { imgRef.current = img; doDraw(img); };
      img.src = photoSrc;
    } else {
      doDraw(null);
    }
  }, [tplReady, fontsReady, photoSrc, adjOffset, adjZoom, firstName, lastName, FRAME, NAME]);

  // ── 4. Adjust preview ──
  const drawPreview = () => {
    const c = adjCanvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, PREV, PREV);

    const diameter = FRAME.r * CANVAS_W * 2;
    const scalePreview = (PREV * 0.85) / diameter;
    const shapeR = (diameter / 2) * scalePreview;
    const shapeCX = PREV / 2;
    const shapeCY = PREV / 2;

    // Background
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(shapeCX, shapeCY, shapeR, 0, Math.PI * 2);
    ctx.fill();

    // Photo clipped to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(shapeCX, shapeCY, shapeR, 0, Math.PI * 2);
    ctx.clip();

    const base = Math.max(diameter / img.naturalWidth, diameter / img.naturalHeight);
    const sc = base * zoomRef.current;
    const sw = img.naturalWidth * sc;
    const sh = img.naturalHeight * sc;
    const swP = sw * scalePreview;
    const shP = sh * scalePreview;
    const oxP = offsetRef.current.x * scalePreview;
    const oyP = offsetRef.current.y * scalePreview;

    ctx.drawImage(img,
      shapeCX - swP / 2 + oxP,
      shapeCY - shP / 2 + oyP,
      swP, shP);
    ctx.restore();

    // Border
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(shapeCX, shapeCY, shapeR, 0, Math.PI * 2);
    ctx.stroke();

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.8;
    [1, 2].forEach(i => {
      const y = shapeCY - shapeR + (shapeR * 2 * i / 3);
      ctx.beginPath(); ctx.moveTo(shapeCX - shapeR, y); ctx.lineTo(shapeCX + shapeR, y); ctx.stroke();
      const x = shapeCX - shapeR + (shapeR * 2 * i / 3);
      ctx.beginPath(); ctx.moveTo(x, shapeCY - shapeR); ctx.lineTo(x, shapeCY + shapeR); ctx.stroke();
    });

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(diameter)}px @ ${Math.round(zoomRef.current * 100)}%`, PREV / 2, PREV - 5);
  };

  useEffect(() => {
    if (!showAdjust) return;
    const t = setTimeout(drawPreview, 40);
    return () => clearTimeout(t);
  }, [showAdjust]);

  // ── 5. Drag handlers ──
  const getPos = (e) => { const p = e.touches?.[0] ?? e; return { x: p.clientX, y: p.clientY }; };
  const onDown = (e) => {
    e.preventDefault(); dragging.current = true;
    const { x, y } = getPos(e);
    dragStart.current = { x, y, ox: offsetRef.current.x, oy: offsetRef.current.y };
  };
  const onMove = (e) => {
    if (!dragging.current) return; e.preventDefault();
    const { x, y } = getPos(e);
    const diameter = FRAME.r * CANVAS_W * 2;
    const scalePreview = (PREV * 0.85) / diameter;
    const sf = 1 / scalePreview;
    offsetRef.current = {
      x: dragStart.current.ox + (x - dragStart.current.x) * sf,
      y: dragStart.current.oy + (y - dragStart.current.y) * sf,
    };
    drawPreview();
  };
  const onUp = () => { dragging.current = false; };

  const onSlider = (e) => { const v = parseFloat(e.target.value); zoomRef.current = v; setSliderVal(v); drawPreview(); };
  const zoomStep = (d) => { const v = Math.min(3, Math.max(0.5, zoomRef.current + d)); zoomRef.current = v; setSliderVal(v); drawPreview(); };

  // ── 6. Open / Apply adjust ──
  const openAdjust = () => {
    offsetRef.current = { ...adjOffset }; zoomRef.current = adjZoom; setSliderVal(adjZoom); setShowAdjust(true);
  };
  const applyAdjust = () => {
    setAdjOffset({ ...offsetRef.current }); setAdjZoom(zoomRef.current); setShowAdjust(false);
  };

  // ── 7. Photo upload ──
  const handlePhoto = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        offsetRef.current = { x: 0, y: 0 }; zoomRef.current = 1.0;
        setAdjOffset({ x: 0, y: 0 }); setAdjZoom(1.0); setSliderVal(1.0);
        setPhotoSrc(src); setShowAdjust(true);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // ── 8. Helpers ──
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3200); };

  const handleDownload = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) { showToast('⚠️ Please fill all fields'); return; }
    if (!/^\d{10}$/.test(phone.trim())) { showToast('⚠️ Phone must be 10 digits'); return; }
    setDownloading(true);
    try {
      axios.post('/api/log', { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() }).catch(() => {});
      const link = document.createElement('a');
      link.download = `${firstName}_${lastName}_nand_utsav.png`;
      link.href = canvasRef.current.toDataURL('image/png', 1.0);
      link.click();
      showToast('✅ Poster downloaded!');
    } catch { showToast('❌ Download failed'); }
    finally { setDownloading(false); }
  };

  const isPhoneValid = /^\d{10}$/.test(phone.trim());
  const canDownload = firstName.trim() && lastName.trim() && isPhoneValid && photoSrc && tplReady && !downloading;

  // ══════════════════════════════════════════════════════════════
  return (
    <div className={styles.page}>

      {/* ADJUST MODAL */}
      {showAdjust && (
        <div className={styles.adjOverlay}>
          <div className={styles.adjModal}>
            <div className={styles.adjHeader}>
              <span className={styles.adjTitle}>Adjust Your Photo</span>
              <span className={styles.adjSub}>Drag to position • Circle = frame area</span>
            </div>
            <canvas ref={adjCanvasRef} width={PREV} height={PREV} className={styles.adjCanvas}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} />
            <div className={styles.adjSliderRow}>
              <span className={styles.adjLabel}>Zoom</span>
              <button className={styles.adjZoomBtn} onClick={() => zoomStep(-0.1)}>−</button>
              <input type="range" min="0.5" max="3" step="0.05" value={sliderVal} onChange={onSlider} className={styles.adjSlider} />
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

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <img src={premalLogo} alt="Premal Jivdaya Trust" className={styles.headerLogo} />
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>પ્રેમાળ જીવદયા ટ્રસ્ટ — રૂક્ષ્મણી વિવાહ</h1>
            <p className={styles.headerSub}>Create Your Rukmani Vivah Poster · રૂક્ષ્મણી વિવાહ પોસ્ટર બનાવો</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* LEFT: Canvas */}
        <section className={styles.canvasSection}>
          <div className={styles.canvasWrap}>
            {loading && (
              <div className={styles.canvasLoader}>
                <span className={styles.spinner} />
                <p>Loading template…</p>
              </div>
            )}
            <canvas ref={canvasRef} width={CANVAS_W} height={canvasH} className={styles.canvas} />
          </div>
        </section>

        {/* RIGHT: Controls */}
        <aside className={styles.controls}>
          {/* Photo card */}
          <div className={`card ${styles.controlCard}`}>
            <div className={styles.cardHeader}>
              <FiUploadCloud size={22} />
              <span>Upload Profile Pic</span>
            </div>
            <p className={styles.cardSub}>આપનો ફોટો અહીં મૂકવો.</p>
            <div className={styles.uploadBox} onClick={() => fileInputRef.current.click()}
              style={photoSrc ? { backgroundImage: `url(${photoSrc})` } : {}}>
              {!photoSrc && (<><FiUser size={40} color="#ffffff" /><span>Click to upload photo</span></>)}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            {photoSrc && (
              <div className={styles.photoActions}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => fileInputRef.current.click()}>Change Photo</button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={openAdjust}>Adjust</button>
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
                <input type="text" placeholder="e.g. Yash" value={firstName}
                  maxLength={Math.max(1, NAME.maxName - lastName.trim().length)}
                  onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Last Name / અટક</label>
                <input type="text" placeholder="e.g. Patel" value={lastName}
                  maxLength={Math.max(1, NAME.maxName - firstName.trim().length)}
                  onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className={styles.nameCounter}>
              <span style={{ color: (firstName.trim().length + lastName.trim().length) >= NAME.maxName ? '#e53e3e' : '#888' }}>
                {firstName.trim().length + lastName.trim().length} / {NAME.maxName} characters
              </span>
            </div>
            <div className="input-group" style={{ marginTop: 16 }}>
              <label>Phone No. / ફોન નંબર</label>
              <input type="tel" placeholder="e.g. 9876543210" value={phone}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setPhone(v); }}
                maxLength="10" style={{ borderColor: phone && !isPhoneValid ? '#ef4444' : '' }} />
            </div>
          </div>

          {/* Download */}
          <button className={`btn btn-accent ${styles.downloadBtn}`} onClick={handleDownload} disabled={!canDownload}>
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
