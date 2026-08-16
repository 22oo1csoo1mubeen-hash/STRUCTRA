import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, Pencil, X, RotateCcw } from 'lucide-react';

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

export default function ExtractionConfidenceCard({ quality, onConfidenceChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const containerRef = useRef(null);

  // Click outside and escape key listener to close edit dropdown
  useEffect(() => {
    if (!isEditOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsEditOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsEditOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditOpen]);

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

  const rawScore = typeof quality.overall_confidence === 'number' ? quality.overall_confidence : 0.85;
  const isOverride = Boolean(quality.confidence_override);
  const systemLevel = (quality.system_confidence_level || (rawScore >= 0.80 ? 'HIGH' : rawScore >= 0.55 ? 'MEDIUM' : 'LOW')).toUpperCase();
  
  let level = 'HIGH';
  if (isOverride && typeof quality.confidence_override === 'string') {
    level = quality.confidence_override.trim().toUpperCase();
  } else if (typeof quality.confidence_level === 'string' && quality.confidence_level.trim()) {
    level = quality.confidence_level.trim().toUpperCase();
  } else {
    level = systemLevel;
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
    icon: CheckCircle2,
  };

  if (level === 'MEDIUM') {
    theme = {
      color: '#f59e0b',
      bgBadge: 'rgba(245,158,11,0.12)',
      bgHover: 'rgba(245,158,11,0.18)',
      border: 'rgba(245,158,11,0.45)',
      glowHover: 'rgba(245,158,11,0.35)',
      cardBorder: 'rgba(245,158,11,0.35)',
      icon: AlertTriangle,
    };
  } else if (level === 'LOW') {
    theme = {
      color: '#f43f5e',
      bgBadge: 'rgba(244,63,94,0.12)',
      bgHover: 'rgba(244,63,94,0.18)',
      border: 'rgba(244,63,94,0.45)',
      glowHover: 'rgba(244,63,94,0.35)',
      cardBorder: 'rgba(244,63,94,0.35)',
      icon: AlertTriangle,
    };
  }

  const LevelIcon = theme.icon;
  const reviewReasons = signals.filter(s => s.severity === 'critical' || s.severity === 'warning');

  const handleSelectLevel = (newLvl) => {
    if (onConfidenceChange) {
      if (newLvl === systemLevel) {
        onConfidenceChange(null);
      } else {
        onConfidenceChange(newLvl);
      }
    }
  };

  const handleResetSystem = () => {
    if (onConfidenceChange) {
      onConfidenceChange(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Confidence Button with Dynamic Theme & Embedded Pencil Icon */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (onConfidenceChange) {
            setIsEditOpen(prev => !prev);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 10px 6px 10px',
          borderRadius: 8,
          background: isHovered || isEditOpen ? theme.bgHover : 'rgba(255,255,255,0.05)',
          border: isHovered || isEditOpen ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          cursor: onConfidenceChange ? 'pointer' : 'default',
          boxShadow: isHovered || isEditOpen ? `inset 0 0 24px ${theme.glowHover}, 0 4px 14px rgba(0,0,0,0.2)` : 'none',
          transition: 'all 0.22s ease-out',
        }}
      >
        {/* Dynamic Semantic Icon Badge */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 6,
          background: theme.bgBadge,
          border: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.color,
          flexShrink: 0,
        }}>
          <LevelIcon size={16} />
        </div>

        {/* Dynamic Text Label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontSize: 10,
              color: 'rgba(255, 255, 255, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700,
            }}>
              Confidence
            </span>
            {isOverride && (
              <span style={{
                fontSize: 8.5,
                fontWeight: 700,
                color: '#f97316',
                background: 'rgba(249, 115, 22, 0.18)',
                border: '1px solid rgba(249, 115, 22, 0.35)',
                padding: '1px 4px',
                borderRadius: 4,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}>
                Manual
              </span>
            )}
          </div>
          <span style={{
            fontSize: 12.5,
            fontWeight: 800,
            color: theme.color,
            letterSpacing: '0.04em',
          }}>
            {level}
          </span>
        </div>

        {/* Pencil Edit Icon in the button */}
        {onConfidenceChange && (
          <div
            role="button"
            tabIndex={0}
            title="Edit confidence level"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditOpen(prev => !prev);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 6,
              background: isEditOpen ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
              border: isEditOpen ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
              color: isEditOpen ? '#fff' : 'rgba(255,255,255,0.75)',
              marginLeft: 4,
              cursor: 'pointer',
              transition: 'all 0.18s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isEditOpen ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = isEditOpen ? '#fff' : 'rgba(255,255,255,0.75)';
            }}
          >
            <Pencil size={12.5} />
          </div>
        )}
      </motion.div>

      {/* Popover: Interactive Edit Dropdown or Hover Details */}
      <AnimatePresence>
        {(isEditOpen || (isHovered && !isEditOpen)) && (
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
              width: 320,
              background: '#0d1117',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${isEditOpen ? 'rgba(249, 115, 22, 0.45)' : theme.cardBorder}`,
              borderRadius: 12,
              padding: 16,
              boxShadow: isEditOpen
                ? '0 18px 45px rgba(0,0,0,0.8), 0 0 20px rgba(249,115,22,0.15)'
                : '0 16px 40px rgba(0,0,0,0.65)',
              pointerEvents: isEditOpen ? 'auto' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Popover Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
                  {isEditOpen ? 'Set Confidence Level' : 'Extraction Confidence'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                  System assessment: <span style={{ fontWeight: 600, color: systemLevel === 'HIGH' ? '#4ade80' : systemLevel === 'MEDIUM' ? '#fbbf24' : '#f87171' }}>{systemLevel}</span>
                </span>
              </div>
              
              {isEditOpen ? (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isOverride && (
                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: '#f97316',
                      background: 'rgba(249, 115, 22, 0.18)',
                      border: '1px solid rgba(249, 115, 22, 0.35)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                    }}>
                      Manual
                    </span>
                  )}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.color,
                    background: theme.bgBadge,
                    border: `1px solid ${theme.border}`,
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}>
                    {level}
                  </span>
                </div>
              )}
            </div>

            {/* Interactive 3-Pill Confidence Selector (When edit mode is open) */}
            {isEditOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['HIGH', 'MEDIUM', 'LOW'].map((lvl) => {
                    const isSelected = level === lvl;
                    const isSys = systemLevel === lvl;
                    const isOver = isOverride && level === lvl;

                    const pillTheme = lvl === 'HIGH'
                      ? { color: '#4ade80', bgSelected: 'rgba(34, 197, 94, 0.2)', borderSelected: '#4ade80', glow: 'rgba(34, 197, 94, 0.35)', icon: '✓' }
                      : lvl === 'MEDIUM'
                      ? { color: '#fbbf24', bgSelected: 'rgba(245, 158, 11, 0.2)', borderSelected: '#fbbf24', glow: 'rgba(245, 158, 11, 0.35)', icon: '⚠' }
                      : { color: '#f87171', bgSelected: 'rgba(239, 68, 68, 0.2)', borderSelected: '#f87171', glow: 'rgba(239, 68, 68, 0.35)', icon: '!' };

                    return (
                      <motion.button
                        key={lvl}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelectLevel(lvl)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                          padding: '8px 4px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          background: isSelected ? pillTheme.bgSelected : 'rgba(255,255,255,0.04)',
                          border: isSelected ? `1.5px solid ${pillTheme.borderSelected}` : '1px solid rgba(255,255,255,0.09)',
                          color: isSelected ? pillTheme.color : 'rgba(255,255,255,0.65)',
                          boxShadow: isSelected ? `0 0 16px ${pillTheme.glow}, inset 0 0 10px ${pillTheme.bgSelected}` : 'none',
                          transition: 'all 0.18s ease-out',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: isSelected ? 800 : 600 }}>
                          <span>{pillTheme.icon}</span>
                          <span>{lvl}</span>
                        </div>
                        {isSys && (
                          <span style={{ fontSize: 8.5, opacity: 0.7, textTransform: 'uppercase', fontWeight: 600 }}>System</span>
                        )}
                        {isOver && (
                          <span style={{ fontSize: 8.5, color: '#f97316', fontWeight: 700, textTransform: 'uppercase' }}>Manual</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Reset to system link */}
                {isOverride && (
                  <button
                    type="button"
                    onClick={handleResetSystem}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 11,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      textDecoration: 'underline',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  >
                    <RotateCcw size={12} />
                    <span>Reset to System Evaluation ({systemLevel})</span>
                  </button>
                )}
              </div>
            )}

            {/* Manual adjustment notice if present (when in hover mode) */}
            {!isEditOpen && isOverride && (
              <div style={{ fontSize: 11.5, color: 'rgba(249, 115, 22, 0.9)', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '6px 10px', borderRadius: 6 }}>
                Manually adjusted by user (System: {systemLevel})
              </div>
            )}

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

            {/* Subtle edit hint when hovering and not in edit mode */}
            {!isEditOpen && onConfidenceChange && (
              <div style={{
                fontSize: 10.5,
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 8,
              }}>
                Click pencil icon to manually adjust confidence
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
