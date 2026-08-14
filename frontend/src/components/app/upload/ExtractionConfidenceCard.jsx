import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const SIGNAL_LABELS = {
  TOTAL_MATH_MATCH: "Total calculation matches",
  TOTAL_MATH_MISMATCH: "Total calculation does not match line items",
  SUBTOTAL_MATH_MISMATCH: "Subtotal calculation does not match line items",
  LINE_ITEM_MATH_MATCH: "Line item calculation matches",
  LINE_ITEM_MATH_MISMATCH: "Line item arithmetic mismatch",
  SUSPICIOUS_NUMERIC_VALUE: "Suspicious numeric value detected",
  TOTAL_PRESENT: "Document total present",
  MISSING_TOTAL: "Total amount could not be confidently extracted",
  VENDOR_PRESENT: "Vendor company present",
  MISSING_VENDOR: "Vendor company missing",
  DATE_PRESENT: "Document date present",
  MISSING_DATE: "Document date missing",
  INVOICE_NUMBER_PRESENT: "Invoice number present",
  MISSING_INVOICE_NUMBER: "Invoice number omitted",
  LINE_ITEMS_PRESENT: "Line items present",
  MISSING_LINE_ITEMS: "Line items missing",
  OCR_VENDOR_MATCH: "Vendor information matches OCR evidence",
  OCR_VENDOR_MISMATCH: "Vendor information differs from OCR evidence",
  OCR_INVOICE_NUMBER_MATCH: "Invoice number matches OCR evidence",
  OCR_INVOICE_NUMBER_MISMATCH: "Invoice number differs from OCR evidence",
  OCR_TOTAL_MATCH: "Total amount matches OCR evidence",
  OCR_TOTAL_MISMATCH: "Total amount differs from OCR evidence",
};

export default function ExtractionConfidenceCard({ quality }) {
  const [isHovered, setIsHovered] = useState(false);

  // Backward compatibility fallback
  if (!quality || typeof quality !== 'object') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,240,220,0.5)',
          fontSize: 12,
        }}
      >
        <Info size={14} />
        <span>N/A</span>
      </div>
    );
  }

  const rawScore = typeof quality.overall_confidence === 'number' ? quality.overall_confidence : 0;
  const percentage = Math.round(rawScore * 100);
  
  // Dynamic level computation based on percentage or backend signal
  let level = 'HIGH';
  if (typeof quality.confidence_level === 'string' && quality.confidence_level.trim()) {
    level = quality.confidence_level.trim().toUpperCase();
  } else if (percentage < 60) {
    level = 'LOW';
  } else if (percentage < 85) {
    level = 'MEDIUM';
  } else {
    level = 'HIGH';
  }

  const needsReview = Boolean(quality.needs_review);
  const signals = Array.isArray(quality.signals) ? quality.signals : [];

  // Dynamic Level Color Theme: GREEN for HIGH, AMBER for MEDIUM, RED for LOW
  let theme = {
    color: '#10b981',
    bgBadge: 'rgba(16,185,129,0.12)',
    bgHover: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.45)',
    glowHover: 'rgba(16,185,129,0.35)',
    cardBorder: 'rgba(16,185,129,0.35)',
  };

  if (level === 'MEDIUM') {
    theme = {
      color: '#f59e0b',
      bgBadge: 'rgba(245,158,11,0.12)',
      bgHover: 'rgba(245,158,11,0.18)',
      border: 'rgba(245,158,11,0.45)',
      glowHover: 'rgba(245,158,11,0.35)',
      cardBorder: 'rgba(245,158,11,0.35)',
    };
  } else if (level === 'LOW') {
    theme = {
      color: '#f43f5e',
      bgBadge: 'rgba(244,63,94,0.12)',
      bgHover: 'rgba(244,63,94,0.18)',
      border: 'rgba(244,63,94,0.45)',
      glowHover: 'rgba(244,63,94,0.35)',
      cardBorder: 'rgba(244,63,94,0.35)',
    };
  }

  const reviewReasons = signals.filter(s => s.severity === 'critical' || s.severity === 'warning');
  const strokeDash = 150.8; // circumference for r=24
  const strokeOffset = strokeDash - (strokeDash * (percentage / 100));

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Button matching Review button shape (borderRadius: 8), fill & ring change color dynamically */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '5px 16px 5px 6px',
          borderRadius: 8,
          background: isHovered ? theme.bgHover : 'rgba(255,255,255,0.05)',
          border: isHovered ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: isHovered ? `inset 0 0 30px ${theme.glowHover}, inset 0 0 12px ${theme.glowHover}` : 'none',
          transition: 'all 0.22s ease-out',
        }}
      >
        {/* Spacious 44px Ring Container */}
        <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="44" height="44" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="30"
              cy="30"
              r="24"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="3"
            />
            <motion.circle
              cx="30"
              cy="30"
              r="24"
              fill="none"
              stroke={theme.color}
              strokeWidth="3"
              strokeDasharray={strokeDash}
              initial={{ strokeDashoffset: strokeDash }}
              animate={{ strokeDashoffset: strokeOffset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          <span style={{
            position: 'absolute',
            fontSize: 10.5,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '-0.02em',
          }}>
            {percentage}%
          </span>
        </div>

        {/* Dynamic Text Label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25 }}>
          <span style={{
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.9)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontWeight: 700,
          }}>
            Confidence
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            color: theme.color,
            letterSpacing: '0.02em',
          }}>
            {level}
          </span>
        </div>
      </motion.button>

      {/* Smooth Hover Details Popover with Dynamic Accent Border */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              zIndex: 100,
              width: 300,
              background: '#0d1117',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 16px 40px rgba(0,0,0,0.65)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Popover Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Extraction Confidence</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: theme.color,
                background: theme.bgBadge,
                border: `1px solid ${theme.border}`,
                padding: '2px 8px',
                borderRadius: 6,
              }}>
                {percentage}% • {level}
              </span>
            </div>

            {/* Dynamic Status Indicator */}
            {!needsReview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 12, fontWeight: 500, background: 'rgba(16,185,129,0.08)', padding: '8px 12px', borderRadius: 8 }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>Extraction reliable — No review required</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.color, fontSize: 12, fontWeight: 600, background: theme.bgBadge, padding: '8px 12px', borderRadius: 8 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>Review recommended</span>
              </div>
            )}

            {/* Review Reasons if present */}
            {needsReview && reviewReasons.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: theme.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Review Signals:
                </span>
                {reviewReasons.map((sig, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'rgba(255,240,220,0.85)' }}>
                    <span style={{ color: sig.severity === 'critical' ? '#f43f5e' : '#f59e0b' }}>•</span>
                    <span>{SIGNAL_LABELS[sig.code] || sig.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quality Signals List */}
            {signals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Signals Summary:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                  {signals.slice(0, 5).map((sig, idx) => {
                    const isPos = sig.severity === 'positive';
                    const iconColor = isPos ? '#10b981' : sig.severity === 'critical' ? '#f43f5e' : '#f59e0b';
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'rgba(255,255,255,0.8)' }}>
                        <CheckCircle2 size={12} color={iconColor} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {SIGNAL_LABELS[sig.code] || sig.message}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
