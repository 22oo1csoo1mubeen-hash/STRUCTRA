import { motion } from 'framer-motion';

/**
 * NavBar
 * Top-left: circular glass hamburger button
 * Top-right: glass pill "About Structra" + external-link icon
 */
export default function NavBar() {
  return (
    <motion.nav
      className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between"
      style={{ padding: '28px 32px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
    >
      {/* ── Hamburger button ─────────────────────────── */}
      <motion.button
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        aria-label="Open menu"
        id="nav-menu-btn"
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <HamburgerIcon />
      </motion.button>

      {/* ── About button ─────────────────────────────── */}
      <motion.a
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        href="#"
        id="nav-about-btn"
        aria-label="About Structra"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 22px',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          textDecoration: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.88)',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          About Structra
        </span>
        <ExternalLinkIcon />
      </motion.a>
    </motion.nav>
  );
}

/* ─── Inline SVG icons ───────────────────────────────── */
function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="13"
      viewBox="0 0 18 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect y="0"  width="18" height="1.8" rx="0.9" fill="rgba(255,255,255,0.82)" />
      <rect y="5.6" width="18" height="1.8" rx="0.9" fill="rgba(255,255,255,0.82)" />
      <rect y="11.2" width="18" height="1.8" rx="0.9" fill="rgba(255,255,255,0.82)" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 11L11 2M11 2H5.5M11 2V7.5"
        stroke="rgba(255,255,255,0.70)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
