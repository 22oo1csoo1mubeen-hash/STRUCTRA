import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import bgImage from '../../assets/bg.webp';

const amber80 = 'rgba(255, 195, 90, 0.85)';
const amber100 = 'rgba(255, 220, 150, 1)';

/* ─── Glowing Primary Button (Amber with continuous attraction sheen) ─── */
function GlowAmberButton({ onClick, children, size = 'md', showArrow = true, id }) {
  const isSm = size === 'sm';
  return (
    <motion.button
      id={id}
      onClick={onClick}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="tap"
      variants={{
        rest: {
          scale: 1,
          boxShadow: '0 0 16px rgba(245, 158, 11, 0.22), inset 0 0 14px rgba(245, 158, 11, 0.16)',
          borderColor: 'rgba(245, 158, 11, 0.65)',
          backgroundColor: 'rgba(237, 139, 59, 0.14)',
          transition: { duration: 0.18, ease: 'easeOut', delay: 0 },
        },
        hover: {
          scale: 1.04,
          boxShadow: '0 0 32px rgba(245, 158, 11, 0.60), inset 0 0 20px rgba(245, 158, 11, 0.35)',
          borderColor: 'rgba(255, 215, 130, 0.95)',
          backgroundColor: 'rgba(237, 139, 59, 0.25)',
          transition: { duration: 0.14, ease: 'easeOut', delay: 0 },
        },
        tap: {
          scale: 0.97,
          transition: { duration: 0.1, delay: 0 },
        },
      }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSm ? 8 : 12,
        padding: isSm ? '7px 20px' : '13px 32px',
        borderRadius: 9999,
        border: '1px solid rgba(245, 158, 11, 0.65)',
        color: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: isSm ? 13 : 14.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        userSelect: 'none',
      }}
    >
      {/* Continuous luminous sheen sweep */}
      <motion.span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '50%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 235, 190, 0.28), transparent)',
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }}
        animate={{
          left: ['-100%', '200%'],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          repeatDelay: 2.4,
          ease: 'easeInOut',
        }}
      />

      <span style={{ position: 'relative', zIndex: 2, whiteSpace: 'nowrap' }}>
        {children}
      </span>

      {showArrow && (
        <motion.span
          variants={{
            rest: { x: 0, opacity: 0.85 },
            hover: { x: 4, opacity: 1 },
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}
        >
          <svg width={isSm ? "13" : "15"} height={isSm ? "9" : "10"} viewBox="0 0 17 10" fill="none">
            <path d="M1 5H16M16 5L12 1M16 5L12 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.span>
      )}
    </motion.button>
  );
}

/* ─── Glowing Secondary Button (Luminous glass with amber-accented glow) ─── */
function GlowSecondaryButton({ onClick, children, size = 'md', id }) {
  const isSm = size === 'sm';
  return (
    <motion.button
      id={id}
      onClick={onClick}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="tap"
      variants={{
        rest: {
          scale: 1,
          boxShadow: '0 2px 14px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.10)',
          borderColor: 'rgba(255, 255, 255, 0.20)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'rgba(255, 255, 255, 0.88)',
          transition: { duration: 0.18, ease: 'easeOut', delay: 0 },
        },
        hover: {
          scale: 1.04,
          boxShadow: '0 0 24px rgba(255, 195, 90, 0.35), inset 0 0 14px rgba(255, 255, 255, 0.16)',
          borderColor: 'rgba(255, 195, 90, 0.65)',
          backgroundColor: 'rgba(255, 255, 255, 0.10)',
          color: '#ffffff',
          transition: { duration: 0.14, ease: 'easeOut', delay: 0 },
        },
        tap: {
          scale: 0.97,
          transition: { duration: 0.1, delay: 0 },
        },
      }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isSm ? '7px 20px' : '13px 32px',
        borderRadius: 9999,
        border: '1px solid rgba(255, 255, 255, 0.20)',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: isSm ? 13 : 14.5,
        fontWeight: 500,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        userSelect: 'none',
      }}
    >
      {/* Continuous light sheen sweep */}
      <motion.span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '50%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent)',
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }}
        animate={{
          left: ['-100%', '200%'],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 2.6,
          ease: 'easeInOut',
        }}
      />
      <span style={{ position: 'relative', zIndex: 2, whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </motion.button>
  );
}

function FadeUp({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function Section({ children, id }) {
  return (
    <section
      id={id}
      className="structra-about-section"
      style={{
        width: '100%',
        maxWidth: 1180,
        margin: '0 auto',
        padding: '80px 24px 0',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {children}
    </section>
  );
}

function SectionHeader({ label, title, subtitle }) {
  return (
    <FadeUp>
      <div className="structra-about-section-header" style={{ marginBottom: 44, textAlign: 'center' }}>
        {label && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: amber80,
              textTransform: 'uppercase',
              marginBottom: 12,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {label}
          </span>
        )}
        <h2
          style={{
            fontFamily: "'Syncopate', 'Michroma', sans-serif",
            fontSize: 'clamp(20px, 3vw, 32px)',
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: '#ffffff',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              marginTop: 14,
              fontSize: 15,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.7,
              maxWidth: 640,
              margin: '14px auto 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </FadeUp>
  );
}

function FeatureBlock({ icon, title, description, steps, delay = 0, style = {} }) {
  return (
    <FadeUp delay={delay} style={{ height: '100%', display: 'flex', flex: 1, ...style }}>
      <div
        className="structra-about-feature-card"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 20,
          padding: '30px 26px',
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.035)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxSizing: 'border-box',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        <div className="structra-about-feature-intro">
          <div className="structra-about-feature-heading-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div
              className="structra-about-feature-icon"
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 185, 80, 0.10)',
                border: '1px solid rgba(255, 185, 80, 0.20)',
              }}
            >
              {icon}
            </div>
            <div className="structra-about-feature-copy" style={{ flex: 1 }}>
              <h3
                className="structra-about-feature-title"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 16.5,
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 6px',
                  lineHeight: 1.35,
                }}
              >
                {title}
              </h3>
              <p
                className="structra-about-feature-description"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 13.5,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {description}
              </p>
            </div>
          </div>
        </div>
        {steps && (
          <ul
            className="structra-about-feature-steps"
            style={{
              paddingLeft: 18,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              listStyle: 'disc',
            }}
          >
            {steps.map((s, i) => (
              <li
                key={i}
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.48)',
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: 'rgba(255,185,80,0.85)', fontWeight: 600 }}>
                  {s.label}
                </span>{' '}
                {s.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </FadeUp>
  );
}

function Grid2({ children }) {
  return (
    <div
      className="structra-about-grid-two"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 20,
        alignItems: 'stretch',
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      className="structra-about-divider"
      style={{
        width: '100%',
        maxWidth: 1180,
        margin: '80px auto 0',
        height: 1,
        background:
          'linear-gradient(90deg, transparent, rgba(255,185,80,0.25), rgba(255,255,255,0.10), transparent)',
        position: 'relative',
        zIndex: 1,
      }}
    />
  );
}

function FlowStep({ n, title, body, delay = 0 }) {
  return (
    <FadeUp delay={delay}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(255,185,80,0.60)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: amber80,
            background: 'rgba(255,185,80,0.10)',
          }}
        >
          {n}
        </div>
        <div>
          <p
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              color: '#ffffff',
              margin: '3px 0 5px',
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13.5,
              color: 'rgba(255,255,255,0.50)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {body}
          </p>
        </div>
      </div>
    </FadeUp>
  );
}

function Pill({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 999,
        background: 'rgba(255,185,80,0.09)',
        border: '1px solid rgba(255,185,80,0.22)',
        color: amber100,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'Inter', system-ui, sans-serif",
        letterSpacing: '0.04em',
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

function IconUpload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 16V4M12 4L8 8M12 4L16 8" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="rgba(255,185,80,0.55)" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="rgba(255,185,80,0.55)" strokeWidth="1.7"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="rgba(255,185,80,0.55)" strokeWidth="1.7"/>
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7"/>
      <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7"/>
      <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="rgba(255,185,80,0.55)" strokeWidth="1.7"/>
      <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="rgba(255,185,80,0.55)" strokeWidth="1.7"/>
    </svg>
  );
}

function IconCategories() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function IconAssistant() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C7.03 3 3 7.03 3 12c0 1.6.4 3.1 1.1 4.4L3 21l4.6-1.1C8.9 20.6 10.4 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M8 12h8M8 9h5" stroke="rgba(255,185,80,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7"/>
      <path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="rgba(255,185,80,0.55)" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function IconSecurity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 6v6c0 5.25 3.75 10.15 8 11 4.25-.85 8-5.75 8-11V6L12 2z" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke="rgba(255,185,80,0.85)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: pageRef });
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
      <div
        className="structra-about-page"
      ref={pageRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#050505',
        color: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── 1. Full-viewport persistent background image matching other pages ── */}
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center bottom',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── 2. Subtle dark overlay for contrast & readability ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 4, 3, 0.65)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Scroll progress bar */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 2,
          width: progressWidth,
          background: 'linear-gradient(90deg, rgba(255,185,80,0.7), rgba(255,145,50,0.95))',
          zIndex: 200,
          transformOrigin: 'left',
        }}
      />

      {/* Ambient blobs */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-5%',
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,150,40,0.06) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '-10%',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,180,80,0.04) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Sticky top bar */}
      <div
        className="structra-about-topbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: 60,
          background: 'rgba(7, 6, 5, 0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 185, 80, 0.12)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 13.5,
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, sans-serif",
            padding: '6px 0',
            transition: 'color 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8L10 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <span
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          STRUCTRA
        </span>
        <GlowAmberButton
          onClick={() => navigate('/login')}
          size="sm"
          id="topbar-get-started-btn"
        >
          Get Started
        </GlowAmberButton>
      </div>

      {/* Hero */}
      <section
        className="structra-about-hero"
        style={{
          textAlign: 'center',
          padding: 'clamp(72px, 10vh, 120px) 24px clamp(60px, 8vh, 96px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '6px 18px',
              borderRadius: 999,
              background: 'rgba(255,185,80,0.08)',
              border: '1px solid rgba(255,185,80,0.22)',
              color: amber80,
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 28,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            About STRUCTRA
          </span>
          <h1
            className="structra-about-hero-title"
            style={{
              fontFamily: "'Syncopate', 'Michroma', sans-serif",
              fontSize: 'clamp(30px, 5.5vw, 64px)',
              fontWeight: 700,
              letterSpacing: '0.24em',
              backgroundImage:
                'linear-gradient(to bottom, #ffffff 0%, #f0f0f0 40%, #c8c8c8 60%, #e0e0e0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 24px',
              lineHeight: 1.15,
              paddingLeft: '0.24em',
            }}
          >
            STRUCTRA
          </h1>
          <p
            className="structra-about-hero-copy"
            style={{
              fontSize: 'clamp(15px, 2vw, 19px)',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.75,
              maxWidth: 680,
              margin: '0 auto 20px',
              fontWeight: 400,
            }}
          >
            An AI-powered document intelligence platform. Upload any document and STRUCTRA{' '}
            <span style={{ color: amber100, fontWeight: 600 }}>extracts</span>,{' '}
            <span style={{ color: amber100, fontWeight: 600 }}>understands</span>, and{' '}
            <span style={{ color: amber100, fontWeight: 600 }}>organizes</span>{' '}
            the information automatically.
          </p>
          <p
            className="structra-about-hero-caption"
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.40)',
              lineHeight: 1.65,
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            Everything you need to manage, search, and converse with your documents.
          </p>

          <div
            className="structra-about-hero-actions"
            style={{
              marginTop: 36,
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <GlowAmberButton
              onClick={() => navigate('/login')}
              id="hero-get-started-btn"
            >
              Get Started
            </GlowAmberButton>
            <GlowSecondaryButton
              onClick={() => navigate('/register')}
              id="hero-sign-up-btn"
            >
              Sign Up
            </GlowSecondaryButton>
          </div>
        </motion.div>
      </section>

      <Divider />

      {/* What is STRUCTRA - 4 boxes all in ONE row, equal height & width */}
      <Section id="what-is">
        <SectionHeader
          label="Overview"
          title="What is STRUCTRA?"
          subtitle="Most document platforms just store files. STRUCTRA goes further, reading, interpreting, and surfacing the knowledge locked inside your documents."
        />
        <div
          className="structra-about-overview-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 18,
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          {[
            {
              title: 'Intelligent Extraction',
              body: "Upload a PDF, image, or scanned document and STRUCTRA's AI reads and captures every field, value, and data point automatically.",
            },
            {
              title: 'Auto-Classification',
              body: 'Documents are automatically sorted into the right category. STRUCTRA identifies whether a file is an invoice, contract, report, or something else instantly.',
            },
            {
              title: 'Conversational Access',
              body: 'Ask questions about your documents in plain language. The AI Assistant understands context and retrieves answers from your files.',
            },
            {
              title: 'Analytics at a Glance',
              body: 'Your Dashboard gives you a live overview: document counts by type, upload trends, and processing statistics.',
            },
          ].map((c, i) => (
            <FadeUp key={i} delay={i * 0.06} style={{ height: '100%', display: 'flex' }}>
              <div
                style={{
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '26px 22px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.25s ease, transform 0.25s ease',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: amber80,
                    boxShadow: '0 0 10px rgba(255, 185, 80, 0.50)',
                    marginBottom: 14,
                    flexShrink: 0,
                  }}
                />
                <h3
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: '0 0 10px',
                    lineHeight: 1.35,
                  }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.52)',
                    lineHeight: 1.68,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {c.body}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </Section>

      <Divider />

      {/* How it works */}
      <Section id="how-it-works">
        <SectionHeader
          label="Workflow"
          title="How STRUCTRA Works"
          subtitle="From upload to insight in seconds."
        />
        <div
          className="structra-about-workflow"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            maxWidth: 680,
            margin: '0 auto',
          }}
        >
          <FlowStep
            n={1}
            title="Upload your document"
            body="Drag and drop a file or click to browse. STRUCTRA accepts PDFs, images (JPEG, PNG, WEBP), and scanned documents of virtually any size."
            delay={0}
          />
          <FlowStep
            n={2}
            title="AI reads and extracts"
            body="The AI engine processes the file and extracts structured data: vendor names, dates, totals, contract clauses, key figures, and more."
            delay={0.06}
          />
          <FlowStep
            n={3}
            title="Auto-classification"
            body="STRUCTRA identifies the document type and assigns it to the correct category automatically. You can also manually reassign it later."
            delay={0.12}
          />
          <FlowStep
            n={4}
            title="Stored in your Library"
            body="The processed document and all extracted data appear in your Document Library. Search, filter, view, download, or delete at any time."
            delay={0.18}
          />
          <FlowStep
            n={5}
            title="Explore, ask, and analyze"
            body="Use the AI Assistant to ask questions, check your Dashboard for trends, and browse Categories to find specific document groups."
            delay={0.24}
          />
        </div>
      </Section>

      <Divider />

      {/* Features - Structured 2-column grid of equal-height pairs */}
      <Section id="features">
        <SectionHeader
          label="Features"
          title="Everything Inside STRUCTRA"
          subtitle="A complete tour of every major section of the application."
        />
        <div
          className="structra-about-features-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 20,
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          <FeatureBlock
            icon={<IconUpload />}
            title="Upload — Add New Documents"
            description="The Upload page is where every document journey begins. Drop a file onto the upload zone or click to select from your device."
            steps={[
              { label: 'Supported formats:', text: 'PDF, JPEG, PNG, WEBP — any standard business document.' },
              { label: 'Duplicate detection:', text: "STRUCTRA warns you if you've already uploaded the same file, preventing accidental duplicates." },
              { label: 'Processing feedback:', text: 'A live status indicator shows each stage: uploading, extracting, classifying, complete.' },
              { label: 'Instant result:', text: 'The document appears in your Library as soon as processing is done.' },
            ]}
            delay={0}
          />

          <FeatureBlock
            icon={<IconLibrary />}
            title="Library — Your Document Collection"
            description="Every document STRUCTRA has processed lives here, searchable and filterable in real time."
            steps={[
              { label: 'Search:', text: 'Type any keyword — a vendor name, a date, an amount — and results appear instantly.' },
              { label: 'Filter by category:', text: 'Narrow the view to invoices, contracts, reports, or any document type.' },
              { label: 'Document detail:', text: 'Click any document to open a panel showing all extracted fields and values.' },
              { label: 'Download and delete:', text: 'Download the original file at any time, or permanently delete a document.' },
            ]}
            delay={0.04}
          />

          <FeatureBlock
            icon={<IconDashboard />}
            title="Dashboard — Analytics and Insights"
            description="A bird's-eye view of everything in your account: patterns, volumes, and activity without opening a single document."
            steps={[
              { label: 'Document counts:', text: 'Total documents uploaded, broken down by category.' },
              { label: 'Upload activity:', text: 'A chart showing how many documents were uploaded over time.' },
              { label: 'Recent uploads:', text: 'A quick list of your most recently processed files.' },
              { label: 'Category distribution:', text: 'Visual breakdown showing the proportion of each document type in your library.' },
            ]}
            delay={0.04}
          />

          <FeatureBlock
            icon={<IconCategories />}
            title="Categories — Organized by Type"
            description="All your documents grouped by their classified type. Jump straight to Invoices or Contracts and see only those files."
            steps={[
              { label: 'Automatic grouping:', text: 'STRUCTRA groups documents as soon as they are classified — no manual sorting needed.' },
              { label: 'Browse by type:', text: 'Select any category to see all documents within it, with the same search and filter tools as the Library.' },
              { label: 'Re-categorize:', text: "If STRUCTRA got a category wrong, you can manually correct it from the document detail view." },
              { label: 'Category counts:', text: "Each category shows how many documents it contains so you know what's where at a glance." },
            ]}
            delay={0.04}
          />

          <FeatureBlock
            icon={<IconAssistant />}
            title="AI Assistant — Ask Anything"
            description="A conversational interface that lets you ask plain-language questions about your documents. It reads and reasons over everything in your Library."
            steps={[
              { label: 'Natural questions:', text: 'Ask things like: What was the total on the Acme Corp invoice in March? or List all contracts expiring this year.' },
              { label: 'Grounded answers:', text: 'Responses are based on the actual content of your documents — not guesswork.' },
              { label: 'Full history:', text: 'Chat history is preserved so you can scroll back and reference past answers.' },
              { label: 'Context-aware:', text: "The assistant understands follow-up questions so you don't need to repeat yourself." },
            ]}
            delay={0.04}
          />

          <FeatureBlock
            icon={<IconProfile />}
            title="Profile — Your Account Settings"
            description="Manage everything related to your account: your name, avatar, password, and notification preferences."
            steps={[
              { label: 'Display name and avatar:', text: 'Update how your name and picture appear throughout the app.' },
              { label: 'Change password:', text: 'Securely update your password at any time.' },
              { label: 'Notification settings:', text: 'Control which in-app notifications you receive about document processing and account activity.' },
              { label: 'Sign out:', text: 'Safely end your session from any device.' },
            ]}
            delay={0.04}
          />
        </div>
      </Section>

      <Divider />

      {/* Authentication - 2 boxes in ONE row, equal height & width */}
      <Section id="auth">
        <SectionHeader
          label="Authentication"
          title="Your Account and Security"
          subtitle="STRUCTRA keeps your data private and secure."
        />
        <Grid2>
          <FeatureBlock
            icon={<IconSecurity />}
            title="Creating an Account"
            description="Register with your email and password. You'll receive a confirmation email with a link to verify your address before your first login."
            steps={[
              {
                label: 'Google Sign-In:',
                text: 'Sign up and log in instantly using your Google account — no separate password needed.',
              },
              {
                label: 'Email confirmation:',
                text: 'For email and password accounts, confirm your email before logging in for the first time.',
              },
            ]}
            delay={0}
          />
          <FeatureBlock
            icon={<IconSecurity />}
            title="Logging In and Sessions"
            description="Log in with email and password or via Google. Tick Remember me to stay logged in. Your session is securely managed."
            steps={[
              {
                label: 'Forgot password:',
                text: 'Use the Forgot Password link on the login page to receive a reset email.',
              },
              {
                label: 'Secure sessions:',
                text: 'Sessions expire automatically when you sign out or after a period of inactivity.',
              },
            ]}
            delay={0.05}
          />
        </Grid2>
      </Section>

      <Divider />

      {/* Document types */}
      <Section id="doc-types">
        <SectionHeader
          label="Document Types"
          title="What STRUCTRA Can Process"
          subtitle="STRUCTRA recognizes and extracts data from a broad range of real-world business documents."
        />
        <FadeUp>
          <div
            className="structra-about-type-pills"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            {[
              'Invoices',
              'Contracts',
              'Receipts',
              'Bank Statements',
              'Tax Documents',
              'Reports',
              'Purchase Orders',
              'Pay Stubs',
              'Utility Bills',
              'Expense Claims',
              'Legal Agreements',
              'Business Letters',
              'Certificates',
              'Insurance Policies',
              'Medical Records',
            ].map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div
            className="structra-about-type-note"
            style={{
              padding: '20px 24px',
              borderRadius: 14,
              background: 'rgba(255,185,80,0.05)',
              border: '1px solid rgba(255,185,80,0.18)',
              textAlign: 'center',
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            <p
              style={{
                fontSize: 13.5,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              Do not see your document type listed? If the document contains readable text or fields, STRUCTRA will extract what it can and place it in a general category.
            </p>
          </div>
        </FadeUp>
      </Section>

      <Divider />

      {/* Tips - 3 columns, equal height & width */}
      <Section id="tips">
        <SectionHeader label="Tips" title="Getting the Most Out of STRUCTRA" />
        <div
          className="structra-about-tips-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 18,
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          {[
            { emoji: '📂', title: 'Start with a batch upload', body: 'Drop multiple files onto the Upload zone. STRUCTRA processes them in sequence.' },
            { emoji: '🔍', title: 'Use the Library search', body: 'Try searching by vendor name, total amount, or any keyword that appears in a document.' },
            { emoji: '💬', title: 'Ask the AI Assistant', body: 'Instead of browsing manually, ask: Show me all invoices over $500 or What is the renewal date on my contract?' },
            { emoji: '📊', title: 'Check the Dashboard weekly', body: 'Get a running summary of your document activity and spot trends or missing uploads over time.' },
            { emoji: '🗂️', title: 'Use Categories for navigation', body: 'Bookmark the Categories page for faster navigation to specific document groups.' },
            { emoji: '⚙️', title: 'Update your Profile', body: 'Add your name and avatar. Review notification settings to stay informed without being overwhelmed.' },
          ].map((tip, i) => (
            <FadeUp key={i} delay={i * 0.05} style={{ height: '100%', display: 'flex' }}>
              <div
                style={{
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '22px 20px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.032)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 12 }}>{tip.emoji}</div>
                <h4
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: '0 0 8px',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {tip.title}
                </h4>
                <p
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.48)',
                    lineHeight: 1.65,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {tip.body}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </Section>

      {/* CTA Footer */}
      <section
        className="structra-about-footer-cta"
        style={{
          textAlign: 'center',
          padding: 'clamp(80px, 12vh, 140px) 24px clamp(60px, 8vh, 100px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <FadeUp>
          <h2
            style={{
              fontFamily: "'Syncopate', 'Michroma', sans-serif",
              fontSize: 'clamp(20px, 3.2vw, 32px)',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#ffffff',
              margin: '0 0 14px',
            }}
          >
            READY TO START?
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.55)',
              margin: '0 auto 36px',
              maxWidth: 480,
              lineHeight: 1.65,
            }}
          >
            Create a free account and upload your first document in under a minute.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <GlowAmberButton
              onClick={() => navigate('/register')}
              id="cta-signup-btn"
            >
              Sign Up
            </GlowAmberButton>
            <GlowSecondaryButton
              onClick={() => navigate('/login')}
              id="cta-signin-btn"
            >
              Sign In
            </GlowSecondaryButton>
          </div>
        </FadeUp>
      </section>

      {/* Bottom wordmark */}
      <div style={{ textAlign: 'center', paddingBottom: 40, position: 'relative', zIndex: 1 }}>
        <span
          style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.28em',
            color: 'rgba(255,255,255,0.20)',
          }}
        >
          STRUCTRA
        </span>
      </div>
    </div>
  );
}
