import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanding } from './LandingLayoutContext';

/**
 * NavBar
 * Top-right: luminous glass pill "About STRUCTRA" + continuous attraction glow & instant hover
 * Responsive for desktop and touch-friendly mobile safe areas.
 */
export default function NavBar({ className = '', style = {} }) {
  const navigate = useNavigate();
  const landingCtx = useLanding();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1366
  );

  useEffect(() => {
    if (landingCtx?.isMobile !== undefined) return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [landingCtx?.isMobile]);

  const isMobile = landingCtx?.isMobile !== undefined
    ? landingCtx.isMobile
    : windowWidth < 768;

  const s = landingCtx?.s ?? 1;

  const navPadding = isMobile
    ? 'max(16px, env(safe-area-inset-top, 16px)) max(16px, env(safe-area-inset-right, 16px)) 0'
    : `${Math.round(24 * s)}px ${Math.round(32 * s)}px`;

  const btnPadding = isMobile
    ? '7px 16px'
    : `${Math.round(11 * s)}px ${Math.round(22 * s)}px`;

  const fontSize = isMobile ? 12.5 : Math.round(14 * s);
  const gap = isMobile ? 7 : Math.round(10 * s);

  return (
    <motion.nav
      className={`absolute top-0 left-0 right-0 z-50 flex items-start justify-end ${className}`}
      style={{ padding: navPadding, pointerEvents: 'auto', ...style }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
    >
      {/* ── About STRUCTRA button wrapper ────────────── */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        {/* ── Interactive glass pill button ──────────── */}
        <motion.button
          onClick={() => navigate('/about')}
          id="nav-about-btn"
          aria-label="About STRUCTRA"
          initial="rest"
          animate="rest"
          whileHover="hover"
          whileTap="tap"
          variants={{
            rest: {
              scale: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow:
                '0 2px 16px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              transition: { duration: 0.2, ease: 'easeOut', delay: 0 },
            },
            hover: {
              scale: 1.035,
              backgroundColor: 'rgba(255, 255, 255, 0.13)',
              borderColor: 'rgba(255, 255, 255, 0.35)',
              boxShadow:
                '0 8px 28px rgba(0, 0, 0, 0.45), 0 0 20px rgba(255, 255, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
              transition: { duration: 0.16, ease: 'easeOut', delay: 0 },
            },
            tap: {
              scale: 0.97,
              transition: { duration: 0.1, delay: 0 },
            },
          }}
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap,
            padding: btnPadding,
            minHeight: 44, // Touch-target requirement
            borderRadius: '9999px',
            border: '1px solid',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            textDecoration: 'none',
            cursor: 'pointer',
            overflow: 'hidden',
            background: 'none',
          }}
        >
          {/* Subtle continuous light sheen sweep to attract users */}
          <motion.span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '50%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
            animate={{
              left: ['-100%', '200%'],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              repeatDelay: 2.6,
              ease: 'easeInOut',
            }}
          />

          <span
            style={{
              position: 'relative',
              zIndex: 2,
              color: 'rgba(255, 255, 255, 0.90)',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize,
              fontWeight: 400,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            About{' '}
            <span
              style={{
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: '#ffffff',
              }}
            >
              STRUCTRA
            </span>
          </span>

          <ExternalLinkIcon isMobile={isMobile} s={s} />
        </motion.button>
      </div>
    </motion.nav>
  );
}

/* ─── Inline SVG icons ───────────────────────────────── */

function ExternalLinkIcon({ isMobile, s = 1 }) {
  const sz = isMobile ? 12 : Math.round(13 * s);
  return (
    <motion.svg
      width={sz}
      height={sz}
      viewBox="0 0 13 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, position: 'relative', zIndex: 2 }}
      variants={{
        rest: {
          x: 0,
          y: 0,
          opacity: 0.72,
          transition: { duration: 0.2, ease: 'easeOut', delay: 0 },
        },
        hover: {
          x: 2,
          y: -2,
          opacity: 1,
          transition: { duration: 0.16, ease: 'easeOut', delay: 0 },
        },
      }}
    >
      <path
        d="M2 11L11 2M11 2H5.5M11 2V7.5"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
