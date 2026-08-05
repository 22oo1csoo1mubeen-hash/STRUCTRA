import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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
 * Vertically & horizontally centered:
 *   Logo → STRUCTRA wordmark → subtitle → CTA button
 */
export default function HeroSection() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      <motion.div
        className="flex flex-col items-center"
        style={{ gap: 0, pointerEvents: 'auto' }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Logo ──────────────────────────────────── */}
        <motion.div variants={itemVariants} style={{ marginBottom: 20, marginTop: -90 }}>
          <img
            src="/logo.png"
            alt="Structra Logo"
            draggable={false}
            style={{
              width: 100,
              height: 100,
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
            fontSize: 'clamp(44px, 7vw, 65px)',
            fontWeight: 700,
            letterSpacing: '0.28em',
            backgroundImage: 'linear-gradient(to bottom, #ffffff 0%, #f0f0f0 40%, #c8c8c8 55%, #e8e8e8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
            textAlign: 'center',
            marginBottom: 10,
            textShadow: '0 2px 40px rgba(255,255,255,0.15)',
            userSelect: 'none',
            /* nudge right to visually compensate for letter-spacing on last char */
            paddingLeft: '0.40em',
          }}
        >
          STRUCTRA
        </motion.h1>

        {/* ── Subtitle ──────────────────────────────── */}
        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 'clamp(12px, 1.25vw, 16px)',
            fontWeight: 400,
            letterSpacing: '0.32em',
            color: 'rgba(255,255,255,0.68)',
            textAlign: 'center',
            marginBottom: 42,
            userSelect: 'none',
            paddingLeft: '0.32em',
          }}
        >
          AI Document Intelligence Platform
        </motion.p>

        {/* ── CTA button ────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <CTAButton />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── CTA Button ────────────────────────────────────── */
function CTAButton() {
  const navigate = useNavigate();
  return (
    <motion.button
      onClick={() => navigate('/login')}
      id="hero-cta-btn"
      aria-label="Get Started with Structra"
      whileHover="hover"
      whileTap={{ scale: 0.97 }}
      initial="rest"
      animate="rest"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 36,
        padding: '12px 22px 12px 32px',
        borderRadius: 9999,
        background: 'none',
        border: '1px solid rgba(237, 139, 59, 0.87)',
        boxShadow: 'inset 0 0 24px rgba(153, 127, 91, 0.5), inset 0 2px 2px rgba(255, 255, 255, 0.1)',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        textDecoration: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
        <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  );
}
