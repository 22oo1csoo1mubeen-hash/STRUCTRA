import { motion } from 'framer-motion';
import { Lock, ExternalLink } from 'lucide-react';

export default function SecurityBannerCard({ onLearnMore = () => {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1, ease: 'easeOut' }}
      style={{
        borderRadius: 16,
        background: 'rgba(30, 58, 138, 0.12)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '14px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}
    >
      {/* ── Left Content: Icon + Security Text ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(59, 130, 246, 0.20)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Lock size={18} strokeWidth={2} color="#60a5fa" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.01em',
            }}
          >
            Your data is secure
          </span>
          <span
            style={{
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.60)',
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.45,
            }}
          >
            Your documents and conversations are private, encrypted, and accessible only to you.
          </span>
        </div>
      </div>

      {/* ── Right Button: Learn More ── */}
      <motion.button
        onClick={onLearnMore}
        whileHover={{
          scale: 1.03,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderColor: 'rgba(255,255,255,0.22)',
        }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.90)',
          fontSize: 12.5,
          fontWeight: 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span>Learn More</span>
        <ExternalLink size={13} color="rgba(255,255,255,0.75)" />
      </motion.button>
    </motion.div>
  );
}
