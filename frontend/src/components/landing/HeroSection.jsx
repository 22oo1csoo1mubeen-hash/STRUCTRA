import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanding } from './LandingLayoutContext';

/**
 * Stagger variants for the hero children
 */
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.25,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * HeroSection
 * Vertically & horizontally positioned in lockstep with the background planet geometry
 * on desktop, and cleanly adapted with intentional hierarchy on mobile.
 */
export default function HeroSection() {
  const { s, heroTop, isMobile, isSmallMobile, isShort, isLandscape } = useLanding();

  // Responsive dimensions
  const logoSize = !isMobile
    ? Math.round(80 * s)
    : isLandscape
      ? 38
      : isSmallMobile
        ? 56
        : isShort
          ? 62
          : 68;

  const logoMargin = !isMobile
    ? Math.round(14 * s)
    : isLandscape
      ? 4
      : isShort
        ? 8
        : 12;

  const wordmarkSize = !isMobile
    ? Math.round(62 * s)
    : isLandscape
      ? 24
      : isSmallMobile
        ? 28
        : isShort
          ? 32
          : 36;

  const wordmarkMargin = !isMobile
    ? Math.round(10 * s)
    : isLandscape
      ? 4
      : isShort
        ? 6
        : 8;

  const subtitleSize = !isMobile
    ? Math.round(14.5 * s)
    : isLandscape
      ? 10.5
      : isSmallMobile
        ? 12
        : isShort
          ? 13
          : 14;

  const subtitleMargin = !isMobile
    ? Math.round(34 * s)
    : isLandscape
      ? 12
      : isShort
        ? 20
        : 26;

  const letterSpacingWordmark = isMobile ? '0.22em' : '0.28em';
  const paddingLeftWordmark = isMobile ? '0.22em' : '0.40em';
  const letterSpacingSub = isMobile ? '0.04em' : '0.32em';
  const paddingLeftSub = isMobile ? '0' : '0.32em';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${heroTop}px`,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 10,
        paddingLeft: '16px',
        paddingRight: '16px',
        boxSizing: 'border-box',
      }}
    >
      <motion.div
        className="flex flex-col items-center"
        style={{ gap: 0, pointerEvents: 'auto', maxWidth: '100%' }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Logo ──────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          style={{
            marginBottom: `${logoMargin}px`,
          }}
        >
          <img
            src="/logo.png"
            alt="Structra Logo"
            draggable={false}
            style={{
              width: `${logoSize}px`,
              height: `${logoSize}px`,
              objectFit: 'contain',
              userSelect: 'none',
              filter: 'drop-shadow(0 2px 20px rgba(255,255,255,0.15))',
            }}
          />
        </motion.div>

        {/* ── Wordmark ──────────────────────────────── */}
        <motion.h1
          variants={itemVariants}
          style={{
            fontFamily: "'Syncopate', 'Michroma', sans-serif",
            fontSize: `${wordmarkSize}px`,
            fontWeight: 700,
            letterSpacing: letterSpacingWordmark,
            backgroundImage: 'linear-gradient(to bottom, #ffffff 0%, #f0f0f0 40%, #c8c8c8 55%, #e8e8e8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
            textAlign: 'center',
            marginBottom: `${wordmarkMargin}px`,
            textShadow: '0 2px 40px rgba(255,255,255,0.15)',
            userSelect: 'none',
            paddingLeft: paddingLeftWordmark,
            maxWidth: '100%',
          }}
        >
          STRUCTRA
        </motion.h1>

        {/* ── Subtitle ──────────────────────────────── */}
        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: `${subtitleSize}px`,
            fontWeight: 400,
            letterSpacing: letterSpacingSub,
            color: 'rgba(255,255,255,0.72)',
            textAlign: 'center',
            marginBottom: `${subtitleMargin}px`,
            userSelect: 'none',
            paddingLeft: paddingLeftSub,
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          AI Document Intelligence Platform
        </motion.p>

        {/* ── CTA button ────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <CTAButton s={s} isMobile={isMobile} isSmallMobile={isSmallMobile} isLandscape={isLandscape} />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── CTA Button ────────────────────────────────────── */
function CTAButton({ s = 1, isMobile = false, isSmallMobile = false, isLandscape = false }) {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleGetStarted = () => {
    if (session) {
      navigate('/app/upload');
    } else {
      navigate('/login');
    }
  };

  const arrowW = isMobile
    ? isLandscape
      ? 14
      : isSmallMobile
        ? 16
        : 18
    : Math.round(17 * s);
  const arrowH = isMobile
    ? isLandscape
      ? 8.5
      : isSmallMobile
        ? 9.5
        : 11
    : Math.round(10 * s);

  const btnPadding = isMobile
    ? isLandscape
      ? '8px 20px'
      : isSmallMobile
        ? '11px 26px'
        : '13px 32px'
    : `${Math.round(11 * s)}px ${Math.round(24 * s)}px ${Math.round(11 * s)}px ${Math.round(28 * s)}px`;

  const btnFontSize = isMobile
    ? isLandscape
      ? 14
      : isSmallMobile
        ? 15.5
        : 17
    : Math.round(16 * s);

  const btnGap = isMobile ? (isLandscape ? 18 : isSmallMobile ? 18 : 22) : Math.round(28 * s);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <motion.button
        onClick={handleGetStarted}
        id="hero-cta-btn"
        aria-label="Get Started with Structra"
        whileHover="hover"
        whileTap={{ scale: 0.96 }}
        initial="rest"
        animate="rest"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${btnGap}px`,
          padding: btnPadding,
          minHeight: isMobile ? (isLandscape ? 40 : 48) : 44, // Touch-target standard
          borderRadius: 9999,
          background: isMobile ? 'rgba(16, 20, 26, 0.70)' : 'none',
          border: '1px solid rgba(245, 155, 60, 0.85)',
          boxShadow: isMobile
            ? '0 0 28px rgba(235, 140, 50, 0.48), inset 0 0 16px rgba(210, 120, 40, 0.24)'
            : 'inset 0 0 24px rgba(153, 127, 91, 0.5), inset 0 2px 2px rgba(255, 255, 255, 0.1)',
          color: '#fff',
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: `${btnFontSize}px`,
          fontWeight: 600,
          letterSpacing: '0.01em',
          cursor: 'pointer',
          textDecoration: 'none',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          userSelect: 'none',
        }}
      >
        <motion.span
          variants={{
            rest: { x: 0 },
            hover: { x: 0 },
          }}
          style={{ whiteSpace: 'nowrap' }}
        >
          Get Started
        </motion.span>

        {/* Arrow — custom thin SVG */}
        <motion.span
          variants={{
            rest: { x: 0, opacity: 0.85 },
            hover: { x: 4, opacity: 1 },
          }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width={arrowW} height={arrowH} viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 5H16M16 5L12 1M16 5L12 9" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.span>

        {/* Hover glow overlay */}
        <motion.span
          variants={{
            rest: { opacity: 0 },
            hover: { opacity: 1 },
          }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 9999,
            border: '1px solid rgba(255, 140, 50, 1)',
            boxShadow: '0 0 42px rgba(203, 158, 127, 0.85)',
            pointerEvents: 'none',
          }}
        />
      </motion.button>
    </div>
  );
}
