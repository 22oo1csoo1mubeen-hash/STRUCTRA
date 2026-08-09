import React from 'react';
import { motion } from 'framer-motion';

/* ─── Step definitions ───────────────────────────────── */
const steps = [
  {
    id: 1,
    number: '1',
    title: 'Upload',
    description: 'Upload receipts, invoices or any documents.',
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </svg>
    ),
  },
  {
    id: 2,
    number: '2',
    title: 'AI Processes',
    description: 'Our AI extracts and organizes the information.',
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
      </svg>
    ),
  },
  {
    id: 3,
    number: '3',
    title: 'Review & Save',
    description: 'Review the extracted data and save to your library.',
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
];

/* ─── Animated arrow connector ───────────────────────── */
function FlowArrow() {
  return (
    <div
      style={{
        flexShrink: 0,
        width: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Horizontal line */}
      <div
        style={{
          position: 'absolute',
          left: 4,
          right: 4,
          height: 1.5,
          background: 'linear-gradient(90deg, rgba(249,115,22,0.20) 0%, rgba(249,115,22,0.80) 50%, rgba(249,115,22,0.20) 100%)',
          borderRadius: 9999,
        }}
      />

      {/* Animated glowing pulse dot that travels along the line */}
      <motion.div
        animate={{ x: ['-18px', '18px'] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#f97316',
          boxShadow: '0 0 8px rgba(249,115,22,0.90), 0 0 16px rgba(249,115,22,0.55)',
          position: 'relative',
          zIndex: 2,
        }}
      />

      {/* Arrowhead — sits at the right end */}
      <svg
        width="10"
        height="14"
        viewBox="0 0 10 14"
        fill="none"
        style={{
          position: 'absolute',
          right: 2,
          zIndex: 3,
          filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.80))',
        }}
      >
        <path
          d="M1 1L9 7L1 13"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ─── Step card ──────────────────────────────────────── */
function StepCard({ step, style }) {
  return (
    <motion.div
      whileHover={{
        y: -3,
        background: 'rgba(255,255,255,0.14)',
        boxShadow:
          '0 8px 28px rgba(0,0,0,0.28), inset 0 0 30px rgba(249,115,22,0.08)',
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '16px 14px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.09)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow:
          '0 2px 16px rgba(0,0,0,0.22), inset 0 0 40px rgba(249,115,22,0.06)',
        minHeight: 88,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Inner top-left glow accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 60,
          height: 60,
          background:
            'radial-gradient(circle at top left, rgba(249,115,22,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Number badge */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffb347 0%, #f97316 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          color: '#fff',
          fontFamily: "'Inter', system-ui, sans-serif",
          flexShrink: 0,
          marginTop: 2,
          boxShadow: '0 0 12px rgba(249,115,22,0.50)',
        }}
      >
        {step.number}
      </div>

      {/* Icon box */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: 'rgba(249,115,22,0.12)',
          border: '1px solid rgba(249,115,22,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 14px rgba(249,115,22,0.15) inset',
        }}
      >
        {step.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(255,248,238,0.94)',
            fontFamily: "'Inter', system-ui, sans-serif",
            marginBottom: 5,
            letterSpacing: '-0.01em',
            textShadow: '0 1px 6px rgba(0,0,0,0.30)',
          }}
        >
          {step.title}
        </p>
        <p
          style={{
            fontSize: 12.5,
            color: 'rgba(255,235,210,0.58)',
            fontFamily: "'Inter', system-ui, sans-serif",
            lineHeight: 1.45,
          }}
        >
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * HowItWorks
 * Three step cards connected by animated glowing flow arrows.
 * Glassmorphism outer container with orange top + bottom borders + inset glow.
 */
export default function HowItWorks() {
  return (
    <div
      style={{ padding: '20px 28px 0 28px' }}
    >
      <div
        style={{
          borderRadius: 18,
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(28px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
          borderTop: '1.5px solid rgba(249,115,22,0.65)',
          borderBottom: '1.5px solid rgba(249,115,22,0.65)',
          borderLeft: '1px solid rgba(255,255,255,0.09)',
          borderRight: '1px solid rgba(255,255,255,0.09)',
          boxShadow:
            '0 4px 50px rgba(0,0,0,0.40), inset 0 0 80px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 30px rgba(249,115,22,0.15)',
          padding: '18px 18px 20px',
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
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
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
            How it works
          </h3>
        </div>

        {/* Step row — cards separated by animated flow arrows */}
        <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              {/* Card Container */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <StepCard step={step} style={{ flex: 1, height: '100%' }} />
              </div>
              
              {/* Flow Arrow (not in the last item) */}
              {idx < steps.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <FlowArrow />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
