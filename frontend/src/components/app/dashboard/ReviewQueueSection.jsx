import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardModal, { EyeButton } from './DashboardModal';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '–';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function ConfidenceBadge({ level }) {
  if (!level) return null;
  const isHigh = level === 'HIGH';
  const isMed = level === 'MEDIUM';
  return (
    <span
      style={{
        padding: '1px 5px',
        borderRadius: 4,
        fontSize: 8.5,
        fontWeight: 700,
        background: isHigh ? 'rgba(34,197,94,0.14)' : isMed ? 'rgba(234,179,8,0.14)' : 'rgba(239,68,68,0.14)',
        border: `1px solid ${isHigh ? 'rgba(34,197,94,0.28)' : isMed ? 'rgba(234,179,8,0.28)' : 'rgba(239,68,68,0.28)'}`,
        color: isHigh ? '#4ade80' : isMed ? '#fde047' : '#f87171',
        flexShrink: 0,
      }}
    >
      {level}
    </span>
  );
}

/**
 * ReviewQueueSection (Row 3, Column 3)
 * Transparent glass styling matching the document library.
 */
export default function ReviewQueueSection({ reviewData, loading }) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const items = reviewData?.items || [];
  const totalCount = reviewData?.total_review_needed ?? items.length;
  const hasItems = items.length > 0;
  const previewItems = items.slice(0, 3);
  const remainingCount = Math.max(0, totalCount - 3);

  const handleReviewClick = (doc) => {
    const docId = doc.document_id || doc.id;
    navigate('/app/library', { state: { selectedDocId: docId, filename: doc.filename } });
  };

  return (
    <>
      <motion.div
        whileHover={{
          y: -2.5,
          borderColor: 'rgba(255, 255, 255, 0.20)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.085) 0%, rgba(255, 255, 255, 0.035) 100%)',
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
          padding: '14px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          minHeight: 180,
          cursor: 'default',
        }}
      >
        {/* Top sheen highlight */}
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

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: hasItems ? '#ef4444' : '#22c55e',
                boxShadow: hasItems ? '0 0 8px #ef4444' : '0 0 8px #22c55e',
              }}
            />
            <h2
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Review Queue
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasItems && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'rgba(239,68,68,0.14)',
                  border: '1px solid rgba(239,68,68,0.28)',
                  color: '#f87171',
                  fontSize: 9,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {totalCount} Need Review
              </span>
            )}
            <EyeButton
              id="review-queue-eye"
              onClick={() => setModalOpen(true)}
              title="View full review queue"
            />
          </div>
        </div>

        {/* List items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, justifyContent: 'center' }}>
          {!hasItems ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <span style={{ fontSize: 11.5, color: '#4ade80', fontWeight: 600 }}>All documents verified</span>
            </div>
          ) : (
            previewItems.map((doc, idx) => (
              <motion.div
                key={doc.document_id || idx}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.03 }}
                onClick={() => handleReviewClick(doc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 7px',
                  borderRadius: 7,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
              >
                {/* Doc icon */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: 'rgba(249, 115, 22, 0.10)',
                    border: '1px solid rgba(249, 115, 22, 0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>

                {/* Details */}
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={doc.filename}
                    >
                      {doc.filename}
                    </span>
                    <ConfidenceBadge level={doc.confidence_level} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'rgba(255, 255, 255, 0.40)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {doc.vendor || 'Unknown'} • {doc.document_date || 'No Date'} • {formatCurrency(doc.total_amount)}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Bottom row: +N more documents ... View All */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: 6,
            marginTop: 2,
          }}
        >
          <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.35)' }}>
            {remainingCount > 0 ? `+${remainingCount} more` : `${items.length} in queue`}
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#f97316',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            View All
          </button>
        </div>
      </motion.div>

      {/* Modal */}
      <DashboardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Review Queue"
        subtitle={`${totalCount} document${totalCount === 1 ? '' : 's'} need attention`}
        accentColor="#ef4444"
        maxWidth={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((doc, idx) => (
            <div
              key={doc.document_id || idx}
              onClick={() => {
                setModalOpen(false);
                handleReviewClick(doc);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'rgba(249, 115, 22, 0.12)',
                    border: '1px solid rgba(249, 115, 22, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.filename}
                    </span>
                    <ConfidenceBadge level={doc.confidence_level} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' }}>
                    {doc.vendor || 'Unknown'} • {doc.document_date || 'No Date'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                {formatCurrency(doc.total_amount)}
              </span>
            </div>
          ))}
        </div>
      </DashboardModal>
    </>
  );
}
