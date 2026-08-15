import { motion } from 'framer-motion';

/**
 * LibrarySummaryCards
 * Three stat cards: Total Documents / Processed / Needs Review.
 * All values are pre-computed and passed in as props.
 *
 * Props:
 *   total       — number   (server total)
 *   processed   — number   (completed & not needs_review)
 *   needsReview — number   (completed & needs_review)
 *   loading     — bool
 */
export default function LibrarySummaryCards({
  total       = 0,
  processed   = 0,
  needsReview = 0,
  loading     = false,
}) {
  const dash = loading ? '–' : undefined;

  const cards = [
    {
      id: 'stat-total',
      label: 'Total Documents',
      value: dash ?? total,
      sub: 'All time',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.92)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      iconBg: 'rgba(249,115,22,0.12)',
      iconBorder: 'rgba(249,115,22,0.25)',
    },
    {
      id: 'stat-processed',
      label: 'Processed',
      value: dash ?? processed,
      sub: 'Ready to view',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(34,197,94,0.92)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      iconBg: 'rgba(34,197,94,0.11)',
      iconBorder: 'rgba(34,197,94,0.24)',
    },
    {
      id: 'stat-needs-review',
      label: 'Needs Review',
      value: dash ?? needsReview,
      sub: 'Action required',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.92)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      iconBg: 'rgba(251,191,36,0.10)',
      iconBorder: 'rgba(251,191,36,0.24)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        padding: '20px 28px 0',
      }}
    >
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          id={card.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{
            y: -2.5,
            borderColor: 'rgba(255,255,255,0.20)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.22)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.035) 100%)',
          }}
          transition={{ duration: 0.20, ease: 'easeOut', delay: i * 0.04 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '18px 22px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
            border: '1px solid rgba(255,255,255,0.11)',
            backdropFilter: 'blur(28px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
            boxShadow: '0 8px 26px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.16)',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top subtle sheen highlight */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '15%',
              width: '70%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
              pointerEvents: 'none',
            }}
          />

          {/* Icon box */}
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 13,
              background: card.iconBg,
              border: `1px solid ${card.iconBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {card.icon}
          </div>

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.02em' }}>
              {card.label}
            </span>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.1, letterSpacing: '-0.025em', textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
              {card.value}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 400, color: 'rgba(255,255,255,0.38)', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {card.sub}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

