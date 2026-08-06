import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * RecentUploads
 * Glassmorphism card with orange top + bottom borders.
 * Empty state shows document illustration with warm text.
 */
export default function RecentUploads({ uploads = [] }) {
  const isEmpty = uploads.length === 0;

  return (
    <div
      style={{ padding: '20px 28px 32px 28px' }}
    >
      <div
        style={{
          borderRadius: 18,
          /* True glass */
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(28px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
          /* Orange top + bottom borders */
          borderTop: '1.5px solid rgba(249,115,22,0.65)',
          borderBottom: '1.5px solid rgba(249,115,22,0.65)',
          borderLeft: '1px solid rgba(255,255,255,0.09)',
          borderRight: '1px solid rgba(255,255,255,0.09)',
          boxShadow:
            '0 4px 50px rgba(0,0,0,0.40), inset 0 0 80px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 30px rgba(249,115,22,0.15)',
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top sheen */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            width: '80%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Clock icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h3
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: 'rgba(255,248,238,0.90)',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
                textShadow: '0 1px 6px rgba(0,0,0,0.25)',
              }}
            >
              Recently Processed
            </h3>
          </div>

          <Link to="/app/library" style={{ textDecoration: 'none' }}>
            <motion.button
              id="view-all-btn"
              aria-label="View all uploads"
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,220,180,0.65)',
                fontFamily: "'Inter', system-ui, sans-serif",
                padding: 0,
              }}
            >
              View All
              <ArrowRight size={14} strokeWidth={1.8} />
            </motion.button>
          </Link>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 0 24px',
            }}
          >
            {/* Subtitle */}
            <p
              style={{
                fontSize: 13,
                color: 'rgba(255,235,210,0.50)',
                fontFamily: "'Inter', system-ui, sans-serif",
                marginBottom: 22,
                textAlign: 'center',
              }}
            >
              Your recently processed documents will appear here.
            </p>

            {/* Document illustration */}
            <div style={{ marginBottom: 16 }}>
              <svg width="76" height="76" viewBox="0 0 76 76" fill="none" aria-hidden="true">
                {/* Sparkle dots */}
                <circle cx="14" cy="13" r="2.5" fill="rgba(249,115,22,0.60)" />
                <circle cx="7"  cy="24" r="1.8" fill="rgba(249,115,22,0.38)" />
                <circle cx="62" cy="13" r="2.5" fill="rgba(249,115,22,0.60)" />
                <circle cx="69" cy="24" r="1.8" fill="rgba(249,115,22,0.38)" />
                <circle cx="38" cy="6"  r="2"   fill="rgba(249,115,22,0.42)" />
                {/* Document */}
                <rect x="14" y="22" width="48" height="40" rx="7" fill="rgba(249,115,22,0.12)" stroke="rgba(249,115,22,0.45)" strokeWidth="1.6" />
                <line x1="22" y1="34" x2="54" y2="34" stroke="rgba(249,115,22,0.42)" strokeWidth="2" strokeLinecap="round" />
                <line x1="22" y1="42" x2="48" y2="42" stroke="rgba(249,115,22,0.30)" strokeWidth="2" strokeLinecap="round" />
                <line x1="22" y1="50" x2="42" y2="50" stroke="rgba(249,115,22,0.22)" strokeWidth="2" strokeLinecap="round" />
                {/* Upload circle */}
                <circle cx="54" cy="56" r="12" fill="#f97316" />
                <path d="M50 57L54 52L58 57M54 52V62" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,248,238,0.80)', fontFamily: "'Inter', system-ui, sans-serif", marginBottom: 5, textShadow: '0 1px 6px rgba(0,0,0,0.30)' }}>
              No recent uploads
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,235,210,0.48)', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Upload your first receipt to begin.
            </p>
          </div>
        )}

        {/* Populated state */}
        {!isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uploads.map((upload) => (
              <motion.div
                key={upload.id}
                whileHover={{ background: 'rgba(255,255,255,0.13)', y: -1 }}
                transition={{ duration: 0.15 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.75)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,248,238,0.88)', fontFamily: "'Inter', sans-serif" }}>{upload.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,220,180,0.55)', fontFamily: "'Inter', sans-serif" }}>{upload.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
