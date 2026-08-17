import { motion } from 'framer-motion';

/**
 * DashboardHeader
 * Top greeting and context row with live refresh indicator.
 */
export default function DashboardHeader({ onRefresh, refreshing, lastUpdated }) {
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        padding: '24px 32px 16px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.03em',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Dashboard
          </h1>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2.5px 8px',
              borderRadius: 20,
              background: 'rgba(249,115,22,0.12)',
              border: '1px solid rgba(249,115,22,0.25)',
              color: '#f97316',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 6px #f97316',
              }}
            />
            Live Intelligence
          </span>
        </div>
        <p
          style={{
            fontSize: 13.5,
            color: 'rgba(255,255,255,0.52)',
            fontFamily: "'Inter', system-ui, sans-serif",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Your real-time document intelligence, purchase analytics, and spending overview.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.60)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{currentDateFormatted}</span>
        </div>

        <motion.button
          id="dashboard-refresh-btn"
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.09)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'border-color 0.2s',
          }}
        >
          <motion.svg
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </motion.svg>
          <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
        </motion.button>
      </div>
    </div>
  );
}
