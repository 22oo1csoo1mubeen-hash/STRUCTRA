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
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      iconBg: 'rgba(249,115,22,0.12)',
      iconBorder: 'rgba(249,115,22,0.24)',
    },
    {
      id: 'stat-processed',
      label: 'Processed',
      value: dash ?? processed,
      sub: 'Ready to view',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(34,197,94,0.85)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      iconBg: 'rgba(34,197,94,0.10)',
      iconBorder: 'rgba(34,197,94,0.22)',
    },
    {
      id: 'stat-needs-review',
      label: 'Needs Review',
      value: dash ?? needsReview,
      sub: 'Action required',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      iconBg: 'rgba(251,191,36,0.09)',
      iconBorder: 'rgba(251,191,36,0.22)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        padding: '20px 28px 0',
      }}
    >
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          id={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '18px 22px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          }}
        >
          {/* Icon box */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
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
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.48)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.02em' }}>
              {card.label}
            </span>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.1, letterSpacing: '-0.022em' }}>
              {card.value}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 400, color: 'rgba(255,255,255,0.32)', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {card.sub}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
