import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardModal, { EyeButton } from './DashboardModal';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
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
        fontSize: 9,
        fontWeight: 700,
        background: isHigh ? 'rgba(34,197,94,0.15)' : isMed ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${isHigh ? 'rgba(34,197,94,0.30)' : isMed ? 'rgba(234,179,8,0.30)' : 'rgba(239,68,68,0.30)'}`,
        color: isHigh ? '#4ade80' : isMed ? '#fde047' : '#f87171',
      }}
    >
      {level}
    </span>
  );
}

/**
 * HighestReceiptSection (Row 3, Column 1)
 * Transparent glass styling matching the document library.
 */
export default function HighestReceiptSection({ highlights, loading }) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const receipt = highlights?.most_expensive_receipt;

  const handleOpenDoc = (docId, filename) => {
    if (!docId) return;
    navigate('/app/library', { state: { selectedDocId: docId, filename: filename || 'Document' } });
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
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 8px #f97316',
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
              Highest Receipt
            </h2>
          </div>
          <EyeButton
            id="highest-receipt-eye"
            onClick={() => setModalOpen(true)}
            title="Expand highest receipt"
          />
        </div>

        {/* Content */}
        {receipt ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            {/* Left Icon Square */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>

            {/* Details on right */}
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={receipt.filename}
              >
                {receipt.filename}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {formatCurrency(receipt.total_amount)}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: 'rgba(255, 255, 255, 0.45)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {receipt.vendor || 'Unknown Vendor'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.35)' }}>
                  {receipt.document_date || '–'}
                </span>
                {receipt.confidence_level && (
                  <>
                    <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: 9 }}>•</span>
                    <ConfidenceBadge level={receipt.confidence_level} />
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.40)' }}>
              No receipts recorded yet.
            </span>
          </div>
        )}
      </motion.div>

      {/* Expanded modal */}
      <DashboardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Highest Receipt"
        subtitle="Your single highest-value receipt"
        accentColor="#f97316"
        maxWidth={500}
      >
        {receipt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid rgba(249,115,22,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {receipt.filename}
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {formatCurrency(receipt.total_amount)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Vendor', value: receipt.vendor || '–' },
                { label: 'Date', value: receipt.document_date || '–' },
                { label: 'Confidence', value: <ConfidenceBadge level={receipt.confidence_level} /> },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {receipt.document_id && (
              <motion.button
                type="button"
                whileHover={{
                  scale: 1.02,
                  y: -1,
                  backgroundColor: 'rgba(249,115,22,0.20)',
                  borderColor: 'rgba(249,115,22,0.60)',
                  boxShadow: '0 6px 20px rgba(249,115,22,0.35)',
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  handleOpenDoc(receipt.document_id, receipt.filename);
                  setModalOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 20px',
                  borderRadius: 10,
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid rgba(249,115,22,0.35)',
                  color: '#f97316',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  width: '100%',
                  marginTop: 4,
                  outline: 'none',
                }}
              >
                View Document
                <motion.svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ x: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </motion.svg>
              </motion.button>
            )}
          </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            No receipt data available.
          </p>
        )}
      </DashboardModal>
    </>
  );
}
