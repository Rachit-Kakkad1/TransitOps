import { useEffect, useRef, useCallback } from 'react';

/* ── Animation configs ── */
const ANIMATIONS = [
  { frames: 100, height: 100 * 40, path: (i) => `/frames/ezgif-frame-${String(i + 37).padStart(3, '0')}.jpg` },
  { frames: 72, height: 72 * 40, path: (i) => `/frames2/ezgif-frame-${String(i).padStart(3, '0')}.jpg` },
  { frames: 110, height: 110 * 40, path: (i) => `/frames3/ezgif-frame-${String(i).padStart(3, '0')}.jpg` },
];

/* ── Shared draw helper ── */
function drawImageCover(canvas, img) {
  if (!canvas || !img || !img.complete || !img.naturalWidth) return;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

function App() {
  const canvasRefs = [useRef(null), useRef(null), useRef(null)];
  const imagesRefs = [useRef([]), useRef([]), useRef([])];
  const frameRefs = [useRef(0), useRef(0), useRef(0)];
  const rafRef = useRef(null);
  
  // Overlay references for direct DOM manipulation
  const darkOverlayRef = useRef(null);
  
  // Chap 1 elements
  const ch1p1Ref = useRef(null);
  const ch1p2Ref = useRef(null);
  const ch1p3Ref = useRef(null);
  
  // Chap 2 elements
  const ch2p1Ref = useRef(null);
  const ch2p2Ref = useRef(null);
  const ch2cardsRef = useRef(null);
  
  // Chap 3 elements
  const ch3p1Ref = useRef(null);
  const ch3cardsRef = useRef(null);

  /* ── Resize all canvases ── */
  const handleResize = useCallback(() => {
    canvasRefs.forEach((ref, i) => {
      const c = ref.current;
      if (!c) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      drawImageCover(c, imagesRefs[i].current[frameRefs[i].current]);
    });
  }, []);

  /* ── Scroll handler ── */
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      const scrollY = window.scrollY;

      /* Get spacer positions from the DOM */
      const spacers = ANIMATIONS.map((_, i) => document.getElementById(`spacer-${i}`));
      const whites = [
        document.getElementById('white-section-0'),
        document.getElementById('white-section-1'),
      ];

      let activeCanvas = -1; // -1 = white zone (no canvas)

      ANIMATIONS.forEach((anim, i) => {
        const spacer = spacers[i];
        if (!spacer) return;

        const start = spacer.offsetTop;
        const end = start + anim.height;

        if (scrollY >= start && scrollY < end) {
          activeCanvas = i;

          /* Map scroll within this spacer to frame index */
          const localScroll = scrollY - start;
          const frac = Math.min(Math.max(localScroll / anim.height, 0), 1);
          const idx = Math.min(Math.floor(frac * anim.frames), anim.frames - 1);

          if (idx !== frameRefs[i].current) {
            frameRefs[i].current = idx;
            drawImageCover(canvasRefs[i].current, imagesRefs[i].current[idx]);
          }

          /* --- DOM OVERLAY ANIMATIONS --- */
          
          if (i === 0) {
            // Chapter 1: Cargo Loading
            const p1 = ch1p1Ref.current;
            const p2 = ch1p2Ref.current;
            const p3 = ch1p3Ref.current;
            
            if (p1 && p2 && p3) {
              if (frac < 0.15) {
                // Fade out part 1
                const localFrac = frac / 0.15; // 0 to 1
                p1.style.opacity = 1 - localFrac;
                p1.style.transform = `translateY(${-(localFrac) * 30}px)`;
                p1.style.pointerEvents = localFrac > 0.8 ? 'none' : 'auto';
                
                p2.style.opacity = 0;
                p2.style.transform = `translateY(30px)`;
                p2.style.pointerEvents = 'none';

                p3.style.opacity = 0;
                p3.style.transform = `translateY(30px)`;
                p3.style.pointerEvents = 'none';
              } else if (frac < 0.55) {
                // Staggered features scroll
                p1.style.opacity = 0;
                p1.style.pointerEvents = 'none';
                
                const p2Frac = (frac - 0.15) / 0.4; // 0 to 1
                
                p2.style.opacity = 1;
                p2.style.transform = `translateY(${-(p2Frac * 160)}%)`;
                p2.style.pointerEvents = 'auto';

                if (p2.children) {
                   Array.from(p2.children).forEach((block, index) => {
                      const startTop = 60 + (index * 40);
                      const screenY = startTop - (p2Frac * 160);
                      
                      let opacity = 1;
                      if (screenY < 20) opacity = Math.max(0, screenY / 20); // fade out at top
                      if (screenY > 80) opacity = Math.max(0, (100 - screenY) / 20); // fade in from bottom
                      
                      block.style.opacity = opacity;
                   });
                }

                p3.style.opacity = 0;
                p3.style.transform = `translateY(30px)`;
                p3.style.pointerEvents = 'none';
              } else {
                // Fade in part 3 (Stats Grid)
                const localFrac = Math.min((frac - 0.55) / 0.1, 1);
                p1.style.opacity = 0;
                p2.style.opacity = 0;
                p2.style.pointerEvents = 'none';

                p3.style.opacity = localFrac;
                p3.style.transform = `translateY(${(1 - localFrac) * 30}px)`;
                p3.style.pointerEvents = 'auto';
              }
            }
          }
          
          if (i === 1) {
            // Chapter 2: Truck Transportation
            const p1 = ch2p1Ref.current;
            const p2 = ch2p2Ref.current;
            const cards = ch2cardsRef.current;
            
            if (p1 && p2) {
               if (frac < 0.25) {
                 // Show part 1
                 const p1Frac = Math.min(frac / 0.1, 1);
                 p1.style.opacity = p1Frac;
                 p1.style.transform = `translateY(${(1 - p1Frac) * 30}px)`;
                 p1.style.pointerEvents = 'auto';
                 
                 p2.style.opacity = 0;
                 p2.style.transform = `translateY(30px)`;
                 p2.style.pointerEvents = 'none';
                 
                 if (cards && cards.children) {
                    Array.from(cards.children).forEach((card, index) => {
                       const cardStart = 0.05 + (index * 0.05);
                       if (frac > cardStart) {
                          const cardFrac = Math.min((frac - cardStart) / 0.1, 1);
                          card.style.opacity = cardFrac;
                          card.style.transform = `translateY(${(1 - cardFrac) * 20}px)`;
                       } else {
                          card.style.opacity = 0;
                          card.style.transform = `translateY(20px)`;
                       }
                    });
                 }
               } else if (frac < 0.35) {
                 // Fade out part 1
                 const fadeOutFrac = (frac - 0.25) / 0.1;
                 p1.style.opacity = 1 - fadeOutFrac;
                 p1.style.transform = `translateY(${-(fadeOutFrac) * 30}px)`;
                 p1.style.pointerEvents = 'none';
                 
                 p2.style.opacity = 0;
                 p2.style.transform = `translateY(30px)`;
                 p2.style.pointerEvents = 'none';
                 
                 if (cards && cards.children) {
                    Array.from(cards.children).forEach((card) => {
                       card.style.opacity = 1 - fadeOutFrac;
                       card.style.transform = `translateY(${-(fadeOutFrac) * 20}px)`;
                    });
                 }
               } else {
                 // Fade in part 2 (Features Grid)
                 p1.style.opacity = 0;
                 p1.style.pointerEvents = 'none';
                 
                 const localFrac = Math.min((frac - 0.35) / 0.1, 1);
                 p2.style.opacity = localFrac;
                 p2.style.transform = `translateY(${(1 - localFrac) * 30}px)`;
                 p2.style.pointerEvents = 'auto';
                 
                 if (cards && cards.children) {
                    Array.from(cards.children).forEach((card) => card.style.opacity = 0);
                 }
               }
            }
          }
          
          if (i === 2) {
            // Chapter 3: Cargo Unloading
            const p1 = ch3p1Ref.current;
            const cards = ch3cardsRef.current;
            
            if (p1) {
               const p1Frac = Math.min(frac / 0.1, 1);
               p1.style.opacity = p1Frac;
               p1.style.transform = `translateY(${(1 - p1Frac) * 30}px)`;
            }
            
            if (cards && cards.children) {
               Array.from(cards.children).forEach((card, index) => {
                  const cardStart = 0.15 + (index * 0.08);
                  if (frac > cardStart) {
                     const cardFrac = Math.min((frac - cardStart) / 0.1, 1);
                     card.style.opacity = cardFrac;
                  } else {
                     card.style.opacity = 0;
                  }
               });
            }
          }
        }
      });

      /* If we're past the last spacer, keep showing the last animation's final frame */
      const lastSpacer = spacers[ANIMATIONS.length - 1];
      if (lastSpacer && scrollY >= lastSpacer.offsetTop + ANIMATIONS[ANIMATIONS.length - 1].height) {
        activeCanvas = ANIMATIONS.length - 1;
      }

      /* Check if we're in a white zone */
      whites.forEach((el) => {
        if (!el) return;
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        // Small buffer to make transition smoother
        if (scrollY >= top - 200 && scrollY < bottom) {
          activeCanvas = -1;
        }
      });

      /* Toggle canvas and dark overlay visibility */
      const isAnimActive = activeCanvas !== -1;
      
      canvasRefs.forEach((ref, i) => {
        if (ref.current) {
          ref.current.style.opacity = i === activeCanvas ? '1' : '0';
        }
      });
      
      if (darkOverlayRef.current) {
         darkOverlayRef.current.style.opacity = isAnimActive ? '1' : '0';
      }

      rafRef.current = null;
    });
  }, []);

  /* ── Preload images ── */
  useEffect(() => {
    ANIMATIONS.forEach((anim, i) => {
      const imgs = [];
      for (let f = 0; f < anim.frames; f++) {
        const img = new Image();
        img.src = anim.path(f + 1);
        if (f === 0) {
          img.onload = () => {
            drawImageCover(canvasRefs[i].current, img);
          };
        }
        imgs.push(img);
      }
      imagesRefs[i].current = imgs;
    });

    handleResize();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll, handleResize]);

  /* ── Styles ── */
  const canvasStyle = (opacity) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'block',
    zIndex: 2,
    transition: 'opacity 0.4s ease',
    opacity,
    pointerEvents: 'none',
  });

  const darkOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'var(--bg-overlay)',
    zIndex: 3,
    transition: 'opacity 0.4s ease',
    pointerEvents: 'none',
  };
  
  const spacerStyle = (height) => ({
    height: `${height}px`,
    position: 'relative',
    zIndex: 10, // Must be above fixed backgrounds so sticky works correctly
  });

  return (
    <>
      {/* ── Fixed Backgrounds ── */}
      <canvas ref={canvasRefs[0]} style={canvasStyle(1)} />
      <canvas ref={canvasRefs[1]} style={canvasStyle(0)} />
      <canvas ref={canvasRefs[2]} style={canvasStyle(0)} />
      
      {/* Dark overlay for images (fades out over white sections) */}
      <div ref={darkOverlayRef} style={darkOverlayStyle} />

      {/* ── Chapter 1: Cargo Loading ── */}
      <div id="spacer-0" style={spacerStyle(ANIMATIONS[0].height)}>
        <div className="overlay-container">
          
          {/* Part 1 */}
          <div ref={ch1p1Ref} className="left-col pointer-auto" style={{ position: 'absolute' }}>
            <div className="badge">🚚 AI Powered Smart Logistics Platform</div>
            <h1 className="hero-heading">Digitizing Every Mile of Transport Operations.</h1>
            <p className="body-text" style={{ marginBottom: '32px' }}>
              Manage fleets, track shipments in real time, optimize routes with AI, monitor every loading operation, and digitize the complete transport lifecycle from dispatch to delivery.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary">Sign in</button>
              <button className="btn btn-secondary">Watch Demo</button>
            </div>
            
            {/* Scroll Indicator */}
            <div className="scroll-indicator" style={{ position: 'fixed', bottom: '40px', left: '50vw', transform: 'translateX(-50%)' }}>
              <div className="mouse"></div>
              <p className="scroll-text">Scroll Down</p>
            </div>
          </div>
          
          {/* Part 2: Staggered Features */}
          <div ref={ch1p2Ref} className="pointer-auto" style={{ position: 'absolute', width: '100%', height: '100vh', top: 0, left: 0, opacity: 0 }}>
            <div className="stagger-block left" style={{ top: '60%' }}>
              <div className="stagger-title">Smart Cargo Loading</div>
              <div className="stagger-desc">Every shipment begins with accurate loading and inventory visibility before leaving the warehouse.</div>
            </div>
            <div className="stagger-block right" style={{ top: '100%' }}>
              <div className="stagger-title">Workers Assigned</div>
              <div className="stagger-desc">Automatically assign digital tasks to warehouse workers for efficient cargo handling.</div>
            </div>
            <div className="stagger-block left" style={{ top: '140%' }}>
              <div className="stagger-title">Cargo Verified</div>
              <div className="stagger-desc">Real-time scanning ensures zero discrepancies between the manifest and the loaded goods.</div>
            </div>
            <div className="stagger-block right" style={{ top: '180%' }}>
              <div className="stagger-title">Loading Complete</div>
              <div className="stagger-desc">Digital signatures lock the manifest, instantly updating the central tracking dashboard.</div>
            </div>
          </div>
          
          {/* Part 3: Stats Grid over video */}
          <div ref={ch1p3Ref} className="pointer-auto" style={{ position: 'absolute', top: 0, height: '100vh', opacity: 0, width: '100%', left: 0, padding: '0 5%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2 className="section-heading" style={{ color: '#fff', marginBottom: '40px', textAlign: 'center' }}>Platform Performance</h2>
            <div className="stats-grid" style={{ width: '100%', maxWidth: '1000px', marginTop: '0' }}>
              <div className="stat-card">
                <div className="stat-value">99.8%</div>
                <div className="stat-label">Delivery Accuracy</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">30%</div>
                <div className="stat-label">Lower Fuel Costs</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">24/7</div>
                <div className="stat-label">Fleet Monitoring</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">100%</div>
                <div className="stat-label">Digital Workflow</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* ── White Section 1 ── */}
      <div id="white-section-0" className="premium-white-section">
        <div className="white-section-content">
          <h2 className="section-heading" style={{ maxWidth: '800px', margin: '0 auto 24px' }}>
            Built for Modern Logistics Teams.
          </h2>
          <p className="body-text dark" style={{ maxWidth: '600px', margin: '0 auto' }}>
            TransitOps replaces spreadsheets, manual dispatching, paper records, and disconnected workflows with one intelligent transport operations platform.
          </p>
        </div>
      </div>

      {/* ── Chapter 2: Truck Transportation ── */}
      <div id="spacer-1" style={spacerStyle(ANIMATIONS[1].height)}>
        <div className="route-lines" />
        <div className="overlay-container">
          
          <div ref={ch2p1Ref} className="pointer-auto" style={{ position: 'absolute', width: '100%', left: 0, padding: '0 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="left-col">
              <div className="badge">Live Fleet Tracking</div>
              <h2 className="section-heading" style={{ color: '#fff', fontSize: '64px', lineHeight: '1.1' }}>
                Every Vehicle.<br/>
                Every Route.<br/>
                Every Second.
              </h2>
              <p className="body-text">
                Monitor your entire fleet with live GPS tracking, AI route optimization, fuel analytics, ETA prediction, route history, and operational health from a unified dashboard.
              </p>
            </div>
            
            <div ref={ch2cardsRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end' }} className="hide-mobile">
              <div className="glass-card"><span style={{ color: 'var(--accent-color)' }}>📍</span> GPS Active</div>
              <div className="glass-card">
                <span style={{ color: '#94A3B8', fontSize: '14px', marginRight: '8px' }}>Truck</span> 
                TRK-102
              </div>
              <div className="glass-card">
                <span style={{ color: '#94A3B8', fontSize: '14px', marginRight: '8px' }}>Status</span> 
                <span style={{ color: '#4ADE80' }}>●</span> En Route
              </div>
              <div className="glass-card">
                <span style={{ color: '#94A3B8', fontSize: '14px', marginRight: '8px' }}>ETA</span> 
                02:15 PM
              </div>
              <div className="glass-card">
                <span style={{ color: '#94A3B8', fontSize: '14px', marginRight: '8px' }}>Fuel</span> 
                74%
              </div>
              <div className="glass-card">
                <span style={{ color: '#94A3B8', fontSize: '14px', marginRight: '8px' }}>Speed</span> 
                58 km/h
              </div>
            </div>
          </div>
          
          {/* Part 2: Features Grid over video */}
          <div ref={ch2p2Ref} className="pointer-auto" style={{ position: 'absolute', top: 0, height: '100vh', opacity: 0, width: '100%', left: 0, padding: '0 5%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2 className="section-heading" style={{ color: '#fff', marginBottom: '40px', textAlign: 'center' }}>Platform Features</h2>
            <div className="features-grid" style={{ width: '100%', maxWidth: '1200px', marginTop: '0' }}>
              <div className="feature-card">
                <div className="feature-icon">🚛</div>
                <div className="feature-title">Fleet Management</div>
                <div className="feature-desc">Manage vehicles efficiently and track maintenance schedules.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📍</div>
                <div className="feature-title">Live GPS Tracking</div>
                <div className="feature-desc">Track every movement in real-time across the globe.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🧠</div>
                <div className="feature-title">AI Route Optimization</div>
                <div className="feature-desc">Reduce travel time and fuel consumption intelligently.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📦</div>
                <div className="feature-title">Shipment Management</div>
                <div className="feature-desc">Complete visibility over the entire shipment lifecycle.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">👤</div>
                <div className="feature-title">Driver Monitoring</div>
                <div className="feature-desc">Track performance, safety, and compliance easily.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔧</div>
                <div className="feature-title">Predictive Maintenance</div>
                <div className="feature-desc">Prevent breakdowns before they happen.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⛽</div>
                <div className="feature-title">Fuel Analytics</div>
                <div className="feature-desc">Identify inefficiencies and reduce operational costs.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔐</div>
                <div className="feature-title">Role-Based Access</div>
                <div className="feature-desc">Secure permissions for dispatchers, drivers, and admins.</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* ── White Section 2 ── */}
      <div id="white-section-1" className="premium-white-section">
        <div className="white-section-content" style={{ maxWidth: '1400px' }}>
          <h2 className="section-heading" style={{ maxWidth: '800px', margin: '0 auto 24px' }}>
            Everything Your Logistics Team Needs.
          </h2>
          <p className="body-text dark" style={{ maxWidth: '600px', margin: '0 auto' }}>
            One intelligent platform for managing fleets, shipments, drivers, expenses, maintenance, and operational performance.
          </p>
        </div>
      </div>

      {/* ── Chapter 3: Cargo Unloading ── */}
      <div id="spacer-2" style={spacerStyle(ANIMATIONS[2].height)}>
        <div className="overlay-container">
          
          <div ref={ch3p1Ref} className="pointer-auto" style={{ position: 'absolute', width: '100%', left: 0, padding: '0 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="left-col">
              <div className="badge">Verified Delivery</div>
              <h2 className="section-heading" style={{ color: '#fff', fontSize: '64px', lineHeight: '1.1' }}>
                Every Delivery.<br/>
                Fully Verified.
              </h2>
              <p className="body-text">
                Capture proof of delivery, verify cargo, record timestamps, collect digital signatures, and maintain complete shipment transparency until the final destination.
              </p>
            </div>
            
            <div ref={ch3cardsRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-end' }} className="hide-mobile">
              <div className="glass-card"><span style={{ color: '#4ADE80' }}>✔</span> Delivery Completed</div>
              <div className="glass-card"><span style={{ color: 'var(--accent-color)' }}>📦</span> Cargo Received</div>
              <div className="glass-card"><span style={{ color: '#FBBF24' }}>🕒</span> Arrival Verified</div>
              <div className="glass-card"><span style={{ color: '#A78BFA' }}>✍</span> Digital Signature Captured</div>
            </div>
          </div>
          
        </div>
      </div>

      {/* ── Final CTA & Footer ── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', background: '#ffffff' }}>
        
        <div className="final-cta">
          <div className="final-cta-glow"></div>
          <h2 className="section-heading" style={{ color: '#fff', maxWidth: '600px', margin: '0 auto 24px', position: 'relative' }}>
            Ready to Modernize Your Logistics?
          </h2>
          <p className="body-text" style={{ maxWidth: '600px', margin: '0 auto 40px', position: 'relative' }}>
            Join businesses using TransitOps to streamline transport operations, reduce operational costs, and deliver every shipment with confidence.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', position: 'relative' }}>
            <button className="btn btn-primary">Start Free</button>
            <button className="btn btn-secondary" style={{ background: 'transparent' }}>Schedule Demo</button>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer style={{ background: '#0b1f3a', color: '#fff', padding: '24px 5%', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {/* Brand & Copyright */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>TransitOps</span>
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>© 2026 TransitOps. All rights reserved.</p>
            </div>
            
            {/* Contact Details */}
            <div style={{ display: 'flex', gap: '24px', color: '#94A3B8', fontSize: '13px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📞 +1 (800) 123-4567</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✉️ hello@transitops.com</span>
            </div>

            {/* Social Links */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#94A3B8'}>LinkedIn</a>
              <a href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#94A3B8'}>X (Twitter)</a>
              <a href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#94A3B8'}>GitHub</a>
            </div>
          </div>
        </footer>
        
      </div>

    </>
  );
}

export default App;
