import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * LibraryEmptyState
 * Shown when the user has no saved documents in their library.
 */
export default function LibraryEmptyState() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '80px 24px',
        textAlign: 'center',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: 'rgba(249,115,22,0.10)',
          border: '1px solid rgba(249,115,22,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(249,115,22,0.12)',
        }}
      >
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.80)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: "'Inter', system-ui, sans-serif",
            margin: 0,
          }}
        >
          No documents yet
        </h2>
        <p
          style={{
            fontSize: 14.5,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.50)',
            fontFamily: "'Inter', system-ui, sans-serif",
            margin: 0,
            maxWidth: 340,
            lineHeight: 1.6,
          }}
        >
          Upload your first receipt or invoice to start building your document library.
        </p>
      </div>

      {/* CTA button */}
      <button
        id="empty-state-upload-btn"
        type="button"
        className="structra-empty-upload-btn"
        onClick={() => navigate('/app/upload')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Upload Document</span>
      </button>
    </motion.div>
  );
}
