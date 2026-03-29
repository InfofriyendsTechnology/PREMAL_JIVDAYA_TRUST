import { useState, useRef, useEffect, useCallback } from 'react';
import axios from '../axiosConfig.js';
import { FiUploadCloud, FiDownload, FiVideo, FiType, FiZoomIn, FiSliders } from 'react-icons/fi';
import Footer from '../components/Footer.jsx';
import styles from './NewsMitraMaker.module.css';

const BASE_W = 1080;
const BASE_H = 1920;

const DEFAULT_LAYOUT = {
  captionX: 0.500, captionY: 0.205,
  captionFontPct: 0.038, captionMaxWidth: 0.800,
  videoLeft: 0.060, videoTop: 0.268,
  videoWidth: 0.866, videoHeight: 0.600,
};

export default function NewsMitraMaker() {
  const canvasRef    = useRef(null);
  const videoRef     = useRef(null);
  const fileInputRef = useRef(null);
  const frameRef     = useRef(null);
  const animRef      = useRef(null);
  const recorderRef  = useRef(null);
  const progRef      = useRef(null);

  const [makerAuthed, setMakerAuthed]     = useState(false);
  const [makerPassword, setMakerPassword] = useState('');
  const [makerError, setMakerError]       = useState('');

  const [layout, setLayout]               = useState(DEFAULT_LAYOUT);
  const [frameReady, setFrameReady]       = useState(false);
  const [videoSrc, setVideoSrc]           = useState(null);
  const [caption, setCaption]             = useState('');
  const [captionColor, setCaptionColor]   = useState('#213B69');
  const [videoState, setVideoState]       = useState({ scale: 1, panX: 0, panY: 0 });
  const [captionFont, setCaptionFont]     = useState('Baloo Bhai 2');
  const [captionPos, setCaptionPos]       = useState({ x: DEFAULT_LAYOUT.captionX, y: DEFAULT_LAYOUT.captionY });
  const [showCapAdjust, setShowCapAdjust] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isRecording, setIsRecording]     = useState(false);
  const [recProgress, setRecProgress]     = useState(0);
  const [toast, setToast]                 = useState('');
  const [loading, setLoading]             = useState(false);

  // Fetch layout settings
  useEffect(() => {
    if (sessionStorage.getItem('nm_maker_pass') === '2004') setMakerAuthed(true);
    
    axios.get('/api/newsmitra/settings')
      .then(({ data }) => {
        setLayout(prev => ({ ...prev, ...data }));
        setCaptionPos({ x: data.captionX, y: data.captionY });
      })
      .catch(() => {});
  }, []);

  const handleMakerLogin = (e) => {
    e.preventDefault();
    if (makerPassword === '2004') {
      sessionStorage.setItem('nm_maker_pass', '2004');
      setMakerAuthed(true);
    } else {
      setMakerError('Incorrect Password');
    }
  };

  const RENDER_SCALE = isRecording ? 1 : 0.40;
  const CANVAS_W = Math.round(BASE_W * RENDER_SCALE);
  const CANVAS_H = Math.round(BASE_H * RENDER_SCALE);

  // Load frame PNG into offscreen canvas (Keep it original size)
  useEffect(() => {
    setLoading(true);
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = BASE_W; off.height = BASE_H;
      off.getContext('2d').drawImage(img, 0, 0, BASE_W, BASE_H);
      frameRef.current = off;
      setFrameReady(true);
      setLoading(false);
    };
    img.onerror = () => setLoading(false);
    img.src = '/newsmitra_frame.png';
  }, []);

  // Draw one frame on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const frame  = frameRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 

    // Important: Update canvas dimensions if scale changed
    if (canvas.width !== CANVAS_W) { canvas.width = CANVAS_W; canvas.height = CANVAS_H; }

    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 1) Video (cover-fit inside video area underneath the frame)
    const vid = videoRef.current;
    if (vid && videoSrc && vid.readyState >= 2) {
      const vx = layout.videoLeft   * CANVAS_W;
      const vy = layout.videoTop    * CANVAS_H;
      const vw = layout.videoWidth  * CANVAS_W;
      const vh = layout.videoHeight * CANVAS_H;
      ctx.save();
      // Only draw inside the defined box so it doesn't bleed out entirely, but frame will cover it anyway
      ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
      
      const va = vid.videoWidth / vid.videoHeight;
      const ra = vw / vh;
      let sw, sh;
      if (va > ra) { sh = vh; sw = vh * va; }
      else         { sw = vw; sh = vw / va; }
      
      sw *= videoState.scale;
      sh *= videoState.scale;

      const sx = vx - (sw - vw) / 2 + (videoState.panX * vw / 2);
      const sy = vy - (sh - vh) / 2 + (videoState.panY * vh / 2);

      ctx.drawImage(vid, sx, sy, sw, sh);
      ctx.restore();
    }

    // 2) Frame as background OVER the video
    ctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H);

    // 3) Caption text with word-wrap
    if (caption.trim()) {
      const fs   = Math.round(layout.captionFontPct * CANVAS_W);
      const maxW = Math.round(layout.captionMaxWidth * CANVAS_W);
      const cx   = captionPos.x * CANVAS_W;
      const cy   = captionPos.y * CANVAS_H;
      ctx.font         = `bold ${fs}px '${captionFont}', sans-serif`;
      ctx.fillStyle    = captionColor;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      // Word wrap
      const words = caption.trim().split(' ');
      const lines = []; let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      const lh = fs * 1.45;
      const startY = cy - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lh, maxW));
    }
  }, [videoSrc, caption, captionColor, captionFont, captionPos, layout, frameReady, videoState]);

  // Render loop - locked to display refresh rate for buttery smooth VSync playback
  useEffect(() => {
    let animId;
    const vid = videoRef.current;
    
    // We use requestVideoFrameCallback if available and video is playing to avoid duplicate frame judder
    if (videoSrc && vid && 'requestVideoFrameCallback' in vid) {
      const loop = () => {
        draw();
        animId = vid.requestVideoFrameCallback(loop);
      };
      animId = vid.requestVideoFrameCallback(loop);
      return () => vid.cancelVideoFrameCallback(animId);
    } else {
      const loop = () => {
        draw();
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animId);
    }
  }, [draw, videoSrc]);

  // Handle video file upload
  const handleVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoState({ scale: 1, panX: 0, panY: 0 }); // reset on new upload
    setPlaybackSpeed(1); // reset speed
    const vid = videoRef.current;
    if (vid) {
      // Must not be muted for captureStream to get audio, 
      // but we will keep volume at 0 during preview if we want, or just let them hear it!
      // Let's set muted to false so audio tracks work, but we can set volume low if needed on preview.
      // We'll leave it playing with sound for their preview so they know it has voice.
      vid.src = url; vid.loop = true; vid.muted = false; vid.volume = 0.5;
      vid.load();
      vid.play().catch(() => {});
    }
  };

  // Keep video speed synced
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed, videoSrc]);

  // Record canvas stream and download as WebM
  const handleDownload = async () => {
    if (!videoSrc)       { showToast('⚠️ Please upload a video first'); return; }
    if (!caption.trim()) { showToast('⚠️ Please enter a caption'); return; }
    const mime = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
      .find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) { showToast('❌ Browser does not support video export'); return; }

    setIsRecording(true); 
    setRecProgress(0);
    showToast('🎬 Preparing ultra high-quality download...');

    // Wait for React to apply `isRecording=true` which updates CANVAS_W and canvas.width!
    setTimeout(async () => {
      const vid      = videoRef.current;
      const canvas   = canvasRef.current;
      
      // Combine Video Canvas + Original Audio Track
      const canvasStream = canvas.captureStream(60); // 60 FPS for smooth 'as original' output
      let finalStream = canvasStream;

    try {
      // Try to get audio tracks from the original video
      const vidStream = vid.captureStream ? vid.captureStream() : vid.mozCaptureStream ? vid.mozCaptureStream() : null;
      if (vidStream && vidStream.getAudioTracks().length > 0) {
        finalStream = new MediaStream([ 
          ...canvasStream.getVideoTracks(), 
          ...vidStream.getAudioTracks() 
        ]);
      }
    } catch (e) { console.warn("Could not capture audio", e); }

    // Use a much higher bitrate for maximum "as original" quality (16 Mbps)
    const recorder = new MediaRecorder(finalStream, { mimeType: mime, videoBitsPerSecond: 16_000_000 });
    recorderRef.current = recorder;
    const chunks   = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'newsmitra_post.webm'; a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false); setRecProgress(0);
      if (progRef.current) clearInterval(progRef.current);
      showToast('✅ Video downloaded!');
      vid.loop = true; // restore loop
      vid.play().catch(() => {});
    };

    const dur = (vid.duration || 30) / playbackSpeed;
    const t0  = Date.now();
    progRef.current = setInterval(() => {
      setRecProgress(Math.min(99, Math.round(((Date.now() - t0) / 1000 / dur) * 100)));
    }, 300);

    vid.loop = false; // ensure it stops at the end for recording
    vid.currentTime = 0;
    vid.playbackRate = playbackSpeed;
    await vid.play();
    recorder.start();
    vid.onended = () => { 
      if (progRef.current) clearInterval(progRef.current); 
      if (recorder.state === 'recording') recorder.stop(); 
      vid.onended = null; 
    };
      // Failsafe timeout
      setTimeout(() => { 
        if (progRef.current) clearInterval(progRef.current); 
        if (recorderRef.current && recorderRef.current.state === 'recording') recorderRef.current.stop(); 
      }, (dur + 3) * 1000);
      
    }, 200); // 200ms delay gives canvas enough time to stretch to 1080x1920 physically
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      if (progRef.current) clearInterval(progRef.current);
      showToast('🛑 Stopping early and saving...');
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };
  const canDownload = videoSrc && caption.trim() && frameReady && !isRecording;

  if (!makerAuthed) return (
    <div className={styles.loginPage}>
      <form className={styles.loginCard} onSubmit={handleMakerLogin}>
        <img src="/newsmitra_logo.png" alt="News Mitra" className={styles.loginLogo} />
        <h2 className={styles.loginTitle}>News Mitra Editor</h2>
        <p className={styles.loginSub}>Private Area - Auth Required</p>
        <div className="input-group">
          <label>Access Password</label>
          <input type="password" placeholder="Enter password (2004)" value={makerPassword}
            onChange={e => setMakerPassword(e.target.value)} autoFocus style={{ textAlign: 'center' }} />
        </div>
        {makerError && <p className={styles.errorMsg}>{makerError}</p>}
        <button className={`btn btn-accent ${styles.loginBtn}`} type="submit">Unlock Maker</button>
      </form>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <img src="/newsmitra_logo.png" alt="News Mitra" className={styles.headerLogo} />
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>News Mitra</h1>
            <p className={styles.headerSub}>Create Your News Post · @newzmitra_</p>
          </div>
        </div>
      </header>

      {/* Hidden video element for canvas rendering */}
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline crossOrigin="anonymous" />

      <main className={styles.main}>
        {/* Canvas preview */}
        <section className={styles.canvasSection}>
          <div className={styles.canvasWrap}>
            {loading && (
              <div className={styles.canvasLoader}>
                <span className={styles.spinner} />
                <p>Loading frame…</p>
              </div>
            )}
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className={styles.canvas} />
            {isRecording && (
              <div className={styles.recordingOverlay}>
                <span className={styles.recDot} />
                <span>Recording {recProgress}%</span>
                <div className={styles.recBar}>
                  <div className={styles.recBarFill} style={{ width: `${recProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Controls */}
        <aside className={styles.controls}>

          {/* Video upload card */}
          <div className={`card ${styles.controlCard}`}>
            <div className={styles.cardHeader}><FiVideo size={20} /><span>Upload Video</span></div>
            <p className={styles.cardSub}>Frame ni andar video set thashe</p>
            <div
              className={`${styles.uploadBox} ${videoSrc ? styles.uploadLoaded : ''}`}
              onClick={() => fileInputRef.current.click()}
            >
              {videoSrc ? (
                <div className={styles.videoLoadedState}>
                  <FiVideo size={32} /><span>Video Loaded ✓</span><small>Click to change</small>
                </div>
              ) : (
                <><FiUploadCloud size={40} color="#ffffff" /><span>Click to upload video</span></>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideo} />

            {videoSrc && (
              <div className={styles.videoAdjustBox} style={{ marginTop: '0' }}>
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiZoomIn size={14} /> Zoom: {videoState.scale.toFixed(1)}x
                  </label>
                  <input type="range" min="1" max="4" step="0.1" value={videoState.scale} onChange={e => setVideoState(p => ({ ...p, scale: parseFloat(e.target.value) }))}/>
                </div>
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiSliders size={14} /> Horizontal Move
                  </label>
                  <input type="range" min="-1" max="1" step="0.05" value={videoState.panX} onChange={e => setVideoState(p => ({ ...p, panX: parseFloat(e.target.value) }))}/>
                </div>
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiSliders size={14} /> Vertical Move
                  </label>
                  <input type="range" min="-1" max="1" step="0.05" value={videoState.panY} onChange={e => setVideoState(p => ({ ...p, panY: parseFloat(e.target.value) }))}/>
                </div>
                <div className="input-group" style={{ marginTop: '8px', borderTop: '1px solid #cbd5e1', paddingTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#213B69' }}>
                    ⚡ Playback Speed: {playbackSpeed}x
                  </label>
                  <input type="range" min="0.5" max="2" step="0.25" value={playbackSpeed} onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}/>
                </div>
              </div>
            )}
          </div>

          {/* Caption card */}
          <div className={`card ${styles.controlCard}`}>
            <div className={styles.cardHeader}><FiType size={20} /><span>Caption / Headline</span></div>
            <p className={styles.cardSub}>Video ni uppar dekhaastu headline</p>
            <div className="input-group">
              <label>Caption Text</label>
              <textarea
                className={styles.captionInput}
                placeholder="e.g. સુરતમાં અનોખી સુવર્ણ રામાયણ..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
              />
            </div>

            {/* Font Family Selection */}
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label>Font Family</label>
              <select className={styles.captionInput} value={captionFont} onChange={e => setCaptionFont(e.target.value)}>
                <option value="Baloo Bhai 2">Baloo Bhai 2</option>
                <option value="Noto Sans Gujarati">Noto Sans Gujarati</option>
                <option value="Anek Gujarati">Anek Gujarati</option>
                <option value="Hind Vadodara">Hind Vadodara</option>
                <option value="Arial">Arial</option>
              </select>
            </div>

            {/* Color selection */}
            <div className={styles.colorRow}>
              <span className={styles.colorLabel}>Text Color</span>
              <div className={styles.colorOptions}>
                <button
                  className={`${styles.colorBtn} ${captionColor === '#213B69' ? styles.colorActive : ''}`}
                  style={{ background: '#213B69' }}
                  onClick={() => setCaptionColor('#213B69')}
                  title="Navy Blue (Default)"
                />
                <button
                  className={`${styles.colorBtn} ${captionColor === '#ffffff' ? styles.colorActive : ''}`}
                  style={{ background: '#ffffff', border: '2px solid #ccc' }}
                  onClick={() => setCaptionColor('#ffffff')}
                  title="White"
                />
                <label className={styles.customColorWrap} title="Custom color">
                  <input
                    type="color"
                    className={styles.colorPickerInput}
                    value={captionColor}
                    onChange={e => setCaptionColor(e.target.value)}
                  />
                  <span className={styles.customColorPreview} style={{ background: captionColor }} />
                </label>
              </div>
              <span className={styles.colorHex}>{captionColor.toUpperCase()}</span>
            </div>

            {/* Custom Caption Position Toggle */}
            <div style={{ marginTop: '16px' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', fontSize: '0.85rem', padding: '10px' }}
                onClick={() => setShowCapAdjust(p => !p)}
              >
                <FiSliders size={14} style={{ marginRight: '6px' }}/> 
                {showCapAdjust ? 'Hide Position Settings' : 'Adjust Caption Position'}
              </button>
              
              {showCapAdjust && (
                <div className={styles.videoAdjustBox}>
                  <div className="input-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiSliders size={14} /> Horizontal (X) Left ↔ Right
                    </label>
                    <input type="range" min="0.1" max="0.9" step="0.005" value={captionPos.x} onChange={e => setCaptionPos(p => ({ ...p, x: parseFloat(e.target.value) }))}/>
                  </div>
                  <div className="input-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiSliders size={14} /> Vertical (Y) Top ↕ Bottom
                    </label>
                    <input type="range" min="0.05" max="0.95" step="0.005" value={captionPos.y} onChange={e => setCaptionPos(p => ({ ...p, y: parseFloat(e.target.value) }))}/>
                  </div>
                  <button 
                    style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', padding: '6px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', marginTop: '4px' }}
                    onClick={() => setCaptionPos({ x: layout.captionX, y: layout.captionY })}
                  >
                    Reset to Default
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Download / Stop Recording */}
          {isRecording ? (
            <button
              className={`btn btn-danger ${styles.downloadBtn}`}
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
              onClick={handleStopRecording}
            >
              <FiDownload size={20} />
              🛑 STOP & SAVE NOW ({recProgress}%)
            </button>
          ) : (
            <button
              className={`btn btn-accent ${styles.downloadBtn}`}
              onClick={handleDownload}
              disabled={!canDownload}
            >
              <FiDownload size={20} />
              START DOWNLOAD
            </button>
          )}

          {toast && <div className={styles.toast}>{toast}</div>}
        </aside>
      </main>
      <Footer />
    </div>
  );
}
