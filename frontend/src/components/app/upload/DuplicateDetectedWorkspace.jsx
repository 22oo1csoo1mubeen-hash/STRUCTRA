import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle, FileText, Calendar, Building, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDocumentDetail } from '../../../api/documents';

/**
 * DuplicateDetectedWorkspace
 * Dedicated glassmorphism workspace state displayed inside UploadCard when a duplicate is uploaded.
 */
export default function DuplicateDetectedWorkspace({
  file,
  uploadedDocument,
  resetUpload,
  onProcessAnyway,
}) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const existingDocId = uploadedDocument?.existing_document_id || uploadedDocument?.document_id;

  useEffect(() => {
    if (!existingDocId) return;

    let isMounted = true;
    setLoadingDetail(true);

    getDocumentDetail(existingDocId)
      .then((res) => {
        if (isMounted && res) {
          setDetail(res);
        }
      })
      .catch(() => {
        /* silent fallback if detail cannot be fetched */
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [existingDocId]);

  const handleViewExisting = () => {
    if (existingDocId) {
      navigate('/app/library', {
        state: { selectedDocId: existingDocId, filename: uploadedDocument?.filename },
      });
    } else {
      navigate('/app/library');
    }
  };

  // Helper formatting values from existing detail or upload response
  const filename = uploadedDocument?.filename || file?.name || 'Uploaded Document';
  const extData = detail?.extraction;
  const qualData = detail?.quality;

  const vendorName = extData?.vendor_company || extData?.vendor_name || '—';
  const docDate = extData?.date || extData?.document_date || '—';
  const totalAmount = extData?.total != null
    ? (typeof extData.total === 'number' ? `₹${extData.total.toLocaleString('en-IN')}` : String(extData.total))
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%',
        maxWidth: 580,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 32px 32px',
        position: 'relative',
      }}
    >
      {/* Header Duplicate Icon with glowing ambient halo */}
      <div
        style={{
          position: 'relative',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.30) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.06) 100%)',
            border: '1.5px solid rgba(249,115,22,0.45)',
            boxShadow: '0 8px 24px rgba(249,115,22,0.20), inset 0 1px 1px rgba(255,255,255,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 8px rgba(249,115,22,0.6))' }}
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2
        style={{
          margin: '0 0 6px',
          fontSize: 20,
          fontWeight: 700,
          color: '#fff',
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '-0.01em',
          textAlign: 'center',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        DUPLICATE DETECTED
      </h2>

      {/* Subtitle */}
      <p
        style={{
          margin: '0 0 24px',
          fontSize: 14,
          color: 'rgba(255,240,220,0.68)',
          fontFamily: "'Inter', system-ui, sans-serif",
          textAlign: 'center',
          maxWidth: 420,
          lineHeight: 1.45,
        }}
      >
        This document already exists in your Document Library.
      </p>

      {/* Glass Metadata Card */}
      <div
        style={{
          width: '100%',
          borderRadius: 14,
          background: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.30)',
          padding: '18px 22px',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <FileText size={18} color="#f97316" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {filename}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.30)', color: '#4ade80', fontSize: 11.5, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            <CheckCircle2 size={13} />
            <span>Saved in Library</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {/* Vendor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Vendor</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.90)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loadingDetail ? '...' : vendorName}
            </span>
          </div>

          {/* Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Date</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.90)', fontWeight: 600 }}>
              {loadingDetail ? '...' : docDate}
            </span>
          </div>

          {/* Total */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>
              {loadingDetail ? '...' : totalAmount}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Action 1: View Existing Document */}
        <motion.button
          id="duplicate-view-existing-btn"
          type="button"
          onClick={handleViewExisting}
          whileHover={{
            scale: 1.02,
            boxShadow: '0 0 30px rgba(249,115,22,0.45), inset 0 0 12px rgba(255,255,255,0.2)',
          }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '14px 24px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #e69e38ff 0%, #f97316 100%)',
            border: 'none',
            color: '#fff',
            fontSize: 14.5,
            fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(249,115,22,0.30)',
            letterSpacing: '0.01em',
          }}
        >
          <span>View Existing Document</span>
          <ArrowRight size={18} strokeWidth={2.2} />
        </motion.button>

        {/* Action 2: Process This Document */}
        <motion.button
          id="duplicate-process-anyway-btn"
          type="button"
          onClick={onProcessAnyway}
          whileHover={{
            scale: 1.02,
            background: 'rgba(255,255,255,0.12)',
            borderColor: 'rgba(249,115,22,0.40)',
          }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '13px 24px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: 'rgba(255,255,255,0.92)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            transition: 'background 0.18s ease, border-color 0.18s ease',
          }}
        >
          <RefreshCw size={16} />
          <span>Process This Document</span>
        </motion.button>
      </div>

      {/* Reset / Return to Upload Link */}
      <button
        id="duplicate-upload-another-btn"
        type="button"
        onClick={resetUpload}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          color: 'rgba(255,240,220,0.50)',
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        Upload a different file
      </button>
    </motion.div>
  );
}
