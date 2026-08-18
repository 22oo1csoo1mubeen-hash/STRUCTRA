import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * DashboardEmptyState
 * Shown when the user has 0 saved documents in their Document Library.
 */
export default function DashboardEmptyState() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Spending Over Time',
      desc: 'Visualize daily, weekly, monthly, and yearly expense trajectories.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      title: 'Vendor Analytics',
      desc: 'Rank suppliers and view proportional budget allocations automatically.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      title: 'Quality & Review Queue',
      desc: 'Instant verification alerts and automated confidence scoring for zero errors.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 24px 70px',
        maxWidth: 940,
        width: '100%',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <style>{`
        .dashboard-empty-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
          text-align: left;
        }
        @media (max-width: 680px) {
          .dashboard-empty-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Central Glowing Icon */}
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          background: 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.04) 100%)',
          border: '1px solid rgba(249,115,22,0.35)',
          boxShadow: '0 0 35px rgba(249,115,22,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>

      <h2
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#ffffff',
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '-0.02em',
          margin: '0 0 10px',
        }}
      >
        Your dashboard is waiting for its first document.
      </h2>

      <p
        style={{
          fontSize: 14.5,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5,
          maxWidth: 520,
          margin: '0 0 28px',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        Upload a receipt or invoice to start seeing real-time spending insights, purchase trends, vendor analytics, and document quality intelligence.
      </p>

      <button
        id="empty-dashboard-upload-btn"
        type="button"
        className="structra-empty-upload-btn"
        onClick={() => navigate('/app/upload')}
        style={{ marginBottom: 44 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Upload Document</span>
      </button>

      {/* Feature Preview Grid */}
      <div className="dashboard-empty-cards-grid">
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              padding: '20px 22px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.20)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {f.icon}
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
              {f.title}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
              {f.desc}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
