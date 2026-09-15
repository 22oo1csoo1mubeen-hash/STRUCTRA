import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * RecentUploads
 * Glassmorphism card with orange top + bottom borders.
 *
 * Props:
 *   uploads   - array of DocumentListItem objects from the backend
 *   isLoading - boolean, true while data is being fetched
 *   error     - error message string or null
 *
 * States:
 *   Loading  — skeleton rows
 *   Empty    — illustration with message
 *   Error    — error notice
 *   Filled   — real document rows
 */

/* ─── Helpers ──────────────────────────────────────────────── */

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr  / 24);

    if (diffSec < 60)  return 'Just now';
    if (diffMin < 60)  return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHr  < 24)  return `${diffHr} hour${diffHr  !== 1 ? 's' : ''} ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7)   return `${diffDay} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatAmount(amount) {
  if (amount == null || amount === '') return null;
  const num = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return null;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ needsReview, confidenceLevel }) {
  const isValid = !needsReview && (confidenceLevel === 'HIGH' || !confidenceLevel);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        padding: '2px 8px',
        borderRadius: 20,
        background: isValid
          ? 'rgba(74,222,128,0.14)'
          : 'rgba(251,191,36,0.14)',
        color: isValid
          ? 'rgba(74,222,128,0.9)'
          : 'rgba(251,191,36,0.9)',
        border: isValid
          ? '1px solid rgba(74,222,128,0.30)'
          : '1px solid rgba(251,191,36,0.30)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {isValid ? '✓ Valid' : 'Review'}
    </span>
  );
}

/* ─── Skeleton row ─────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '55%', height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
        <div style={{ width: '35%', height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div style={{ width: 60, height: 20, borderRadius: 10, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────── */
export default function RecentUploads({ uploads = [], isLoading = false, error = null }) {
  const navigate = useNavigate();
  const isEmpty = !isLoading && !error && uploads.length === 0;

  const handleDocumentClick = (doc) => {
    const docId = doc.document_id || doc.id;
    if (!docId) return;
    navigate('/app/library', {
      state: {
        selectedDocId: docId,
        filename: doc.filename,
      },
    });
  };

  return (
    <div style={{ padding: '20px 28px 32px 28px' }}>
      <div
        style={{
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
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
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)',
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

        {/* Loading state — skeleton rows */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 0 20px',
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: 'rgba(255,120,120,0.75)',
                fontFamily: "'Inter', system-ui, sans-serif",
                textAlign: 'center',
              }}
            >
              Could not load recent documents.
            </p>
          </div>
        )}

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

        {/* Populated state — real document rows */}
        {!isLoading && !error && uploads.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uploads.map((doc) => {
              const ts = doc.processed_at || doc.created_at;
              const amountStr = formatAmount(doc.total_amount);
              const relTime = formatRelativeTime(ts);

              return (
                <motion.div
                  key={doc.document_id || doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDocumentClick(doc);
                    }
                  }}
                  whileHover={{ background: 'rgba(255, 255, 255, 0.06)', y: -1, borderColor: 'rgba(255, 255, 255, 0.14)' }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                  }}
                >
                  {/* File icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.75)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>

                  {/* Text info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Filename */}
                    <p
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: 'rgba(255,248,238,0.88)',
                        fontFamily: "'Inter', sans-serif",
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.filename}
                    </p>

                    {/* Vendor + time */}
                    <p style={{ fontSize: 12, color: 'rgba(255,220,180,0.55)', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                      {doc.vendor_name ? `${doc.vendor_name} · ` : ''}{relTime}
                    </p>
                  </div>

                  {/* Amount */}
                  {amountStr && (
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'rgba(255,235,200,0.80)',
                        fontFamily: "'Inter', sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      {amountStr}
                    </span>
                  )}

                  {/* Status badge */}
                  <StatusBadge needsReview={doc.needs_review} confidenceLevel={doc.confidence_level} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
