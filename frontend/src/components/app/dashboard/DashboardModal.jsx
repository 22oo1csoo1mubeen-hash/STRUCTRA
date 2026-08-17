import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DashboardModal
 * Shared glass expansion panel for the eye-button system.
 *
 * When open:
 *  - Dark translucent overlay covers everything
 *  - Centered glass panel with orange glow appears
 *  - Dashboard content behind is blurred via CSS (controlled by parent)
 *
 * Props:
 *  isOpen       — boolean
 *  onClose      — () => void
 *  title        — string
 *  subtitle     — string (optional)
 *  accentColor  — string (optional, defaults to orange)
 *  maxWidth     — number (optional, default 640)
 *  children     — React nodes
 */
export default function DashboardModal({
  isOpen,
  onClose,
  title,
  subtitle,
  accentColor = '#f97316',
  maxWidth = 640,
  children,
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Dark overlay ── */}
          <motion.div
            key="dashboard-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
            }}
          >
            {/* ── Glass panel ── */}
            <motion.div
              key="dashboard-modal-panel"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(22,18,12,0.96) 0%, rgba(14,10,6,0.98) 100%)',
                border: `1px solid ${accentColor}44`,
                boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 40px ${accentColor}28, 0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.10)`,
                overflow: 'hidden',
                position: 'relative',
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
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)',
                  pointerEvents: 'none',
                }}
              />

              {/* ── Modal header ── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '20px 24px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: accentColor,
                        boxShadow: `0 0 8px ${accentColor}`,
                        flexShrink: 0,
                      }}
                    />
                    <h2
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: 0,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {title}
                    </h2>
                  </div>
                  {subtitle && (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.45)',
                        margin: '0 0 0 15px',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close expanded view"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.70)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.70)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* ── Modal body (scrollable) ── */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 24px 24px',
                  // Custom scrollbar
                  scrollbarWidth: 'thin',
                  scrollbarColor: `${accentColor}55 transparent`,
                }}
              >
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * EyeButton
 * Small circular eye icon button for card headers.
 * Exported for use in all dashboard card components.
 */
export function EyeButton({ onClick, id, title = 'Expand details' }) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.50)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.15s ease',
        padding: 0,
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(249,115,22,0.12)';
        e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)';
        e.currentTarget.style.color = '#f97316';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.50)';
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}
