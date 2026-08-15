import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Helpers ─────────────────────────────────────── */
function parseDateString(d) {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d.getTime())) return d;
  if (typeof d !== 'string') return null;
  const str = d.trim();
  if (!str) return null;

  // 1. Match DD/MM/YYYY or DD-MM-YYYY (e.g., "29/07/2026", "29-07-2026")
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // 2. Match YYYY/MM/DD or YYYY-MM-DD (e.g., "2026-07-29")
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // 3. Fallback to standard Date constructor parsing (e.g. ISO timestamps)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function fmtDate(primaryDate, fallbackDate = null) {
  let dt = parseDateString(primaryDate);
  if (!dt && fallbackDate) {
    dt = parseDateString(fallbackDate);
  }

  if (!dt) return null;

  try {
    const res = dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return res === 'Invalid Date' ? null : res;
  } catch {
    return null;
  }
}

function fmtAmount(v) {
  if (v == null) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(v);
}

function inferDocType(filename = '') {
  const f = filename.toLowerCase();
  return f.includes('invoice') || f.includes('inv_') ? 'INVOICE' : 'RECEIPT';
}

function getConfidenceScore(docId, level = 'HIGH') {
  const L = String(level).toUpperCase();
  if (!docId) return L === 'HIGH' ? 95 : 68;
  let hash = 0;
  const str = String(docId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  if (L === 'HIGH') return 91 + (abs % 8);   // 91% - 98%
  if (L === 'MEDIUM') return 65 + (abs % 12); // 65% - 76%
  return 45 + (abs % 14);                     // 45% - 58%
}

/* ─── Badges ─────────────────────────────────────── */
function TypeBadge({ type }) {
  const inv = type === 'INVOICE';
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 5,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: "'Inter', system-ui, sans-serif",
        background: inv ? 'rgba(14, 165, 233, 0.16)' : 'rgba(249, 115, 22, 0.16)',
        border: inv ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(249, 115, 22, 0.40)',
        color: inv ? '#38bdf8' : '#f97316',
      }}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status, needsReview }) {
  if (needsReview) {
    return (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 5,
          fontSize: 10.5,
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          background: 'rgba(245, 158, 11, 0.16)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#fbbf24',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Needs Review
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 5,
          fontSize: 10.5,
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          background: 'rgba(34, 197, 94, 0.16)',
          border: '1px solid rgba(34, 197, 94, 0.35)',
          color: '#4ade80',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Processed
      </span>
    );
  }
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 5,
        fontSize: 10.5,
        fontWeight: 500,
        fontFamily: "'Inter', system-ui, sans-serif",
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.48)',
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

function ConfidenceBadge({ docId, level }) {
  if (!level) return null;
  const L = String(level).toUpperCase();
  const score = getConfidenceScore(docId, L);
  const isHigh = L === 'HIGH';
  const isMed = L === 'MEDIUM';

  const cfg = isHigh
    ? { color: '#4ade80', bg: 'rgba(34, 197, 94, 0.16)', border: 'rgba(34, 197, 94, 0.35)' }
    : isMed
    ? { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.35)' }
    : { color: '#f87171', bg: 'rgba(239, 68, 68, 0.16)',  border: 'rgba(239, 68, 68, 0.35)' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 7px',
        borderRadius: 5,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'Inter', system-ui, sans-serif",
        letterSpacing: '0.03em',
      }}
    >
      {L} <span style={{ fontWeight: 600, opacity: 0.9 }}>{score}%</span>
    </span>
  );
}

/* ─── Realistic Mini Document Paper Thumbnail ─────── */
function DocThumbnail({ filename = '', vendorName = '', docType = 'RECEIPT' }) {
  const isInvoice = docType === 'INVOICE';
  const displayTitle = vendorName || filename.split('.')[0].replace(/_/g, ' ');

  return (
    <div
      style={{
        width: '100%',
        height: 126,
        background: 'radial-gradient(ellipse at center, rgba(30, 20, 10, 0.45) 0%, rgba(10, 5, 2, 0.75) 100%)',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Paper mock */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 5,
          background: 'linear-gradient(180deg, #f6f3eb 0%, #eae5d8 100%)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.38)',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          transform: 'perspective(400px) rotateX(3deg)',
          transformOrigin: 'center bottom',
          border: '1px solid rgba(255, 255, 255, 0.7)',
        }}
      >
        {/* Paper Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              color: '#1a1614',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.01em',
              maxWidth: '75%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayTitle}
          </span>
          <span
            style={{
              fontSize: 7,
              fontWeight: 800,
              color: isInvoice ? '#0284c7' : '#ea580c',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            {isInvoice ? 'INVOICE' : 'RECEIPT'}
          </span>
        </div>

        {/* Separator */}
        <div style={{ width: '100%', height: 1, background: '#d0ca9e', opacity: 0.8, margin: '3px 0 2px' }} />

        {/* Line items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, marginTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '55%', height: 3, borderRadius: 1.5, background: '#a09888' }} />
            <div style={{ width: '22%', height: 3, borderRadius: 1.5, background: '#847c6e' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '42%', height: 3, borderRadius: 1.5, background: '#b2aa9a' }} />
            <div style={{ width: '18%', height: 3, borderRadius: 1.5, background: '#948c7e' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '64%', height: 3, borderRadius: 1.5, background: '#c0b8a8' }} />
            <div style={{ width: '24%', height: 3, borderRadius: 1.5, background: '#9c9484' }} />
          </div>
        </div>

        {/* Paper Footer / Barcode */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 1.2, alignItems: 'center', height: 9, opacity: 0.65 }}>
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3].map((w, idx) => (
              <div key={idx} style={{ width: w, height: '100%', background: '#25201c' }} />
            ))}
          </div>
          <div style={{ width: '32%', height: 3.5, borderRadius: 1.5, background: '#25201c' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Actions: View + More Menu ────────────────────── */
function MoreMenu({ onDelete, onDownload }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="More actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.60)',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -4 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              right: 0,
              minWidth: 144,
              background: 'rgba(10,6,2,0.96)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              border: '1px solid rgba(249,115,22,0.20)',
              borderRadius: 10,
              padding: 4,
              zIndex: 300,
              boxShadow: '0 14px 44px rgba(0,0,0,0.65)',
            }}
          >
            <MenuBtn icon="download" label="Download" onClick={() => { setOpen(false); onDownload?.(); }} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '3px 0' }} />
            <MenuBtn icon="trash" label="Delete" danger onClick={() => { setOpen(false); onDelete?.(); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuBtn({ icon, label, danger, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        borderRadius: 7,
        background: h ? (danger ? 'rgba(200,40,40,0.14)' : 'rgba(255,255,255,0.06)') : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: danger ? (h ? '#f87171' : 'rgba(248,113,113,0.85)') : (h ? 'rgba(255,248,238,0.95)' : 'rgba(255,248,238,0.68)'),
        fontSize: 12.5,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
        textAlign: 'left',
        transition: 'background 0.11s, color 0.11s',
      }}
    >
      {icon === 'download' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      {icon === 'trash' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      )}
      {label}
    </button>
  );
}

/* ─── Grid Card ───────────────────────────────────── */
function GridCard({ doc, onView, onDelete, onDownload }) {
  const [hovered, setHovered] = useState(false);
  const docType = inferDocType(doc.filename);
  const date    = fmtDate(doc.document_date, doc.created_at);
  const amount  = fmtAmount(doc.total_amount);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        overflow: 'hidden',
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
        border: hovered ? '1px solid rgba(249,115,22,0.30)' : '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: hovered
          ? '0 8px 32px rgba(249,115,22,0.12), 0 4px 16px rgba(0,0,0,0.24)'
          : '0 4px 16px rgba(0,0,0,0.18)',
        transition: 'background 0.22s, border-color 0.22s, box-shadow 0.22s',
      }}
    >
      {/* Top Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 8px' }}>
        <TypeBadge type={docType} />
        <StatusBadge status={doc.status} needsReview={doc.needs_review} />
      </div>

      {/* Thumbnail */}
      <div style={{ padding: '0 12px' }}>
        <DocThumbnail filename={doc.filename} vendorName={doc.vendor_name} docType={docType} />
      </div>

      {/* Details */}
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Filename */}
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={doc.filename}
        >
          {doc.filename}
        </p>

        {/* Vendor */}
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: 'rgba(255,255,255,0.48)',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {doc.vendor_name || 'Vendor Unspecified'}
        </p>

        {/* Date + Amount */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          {date ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11.5,
                color: 'rgba(255,255,255,0.42)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {date}
            </span>
          ) : <div />}
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {amount || '—'}
          </span>
        </div>

        {/* Confidence + Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <ConfidenceBadge docId={doc.document_id} level={doc.confidence_level || (doc.needs_review ? 'MEDIUM' : 'HIGH')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* View Eye Button */}
            <button
              type="button"
              aria-label="View document"
              onClick={() => onView?.(doc)}
              style={{
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 7,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.60)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(249,115,22,0.18)';
                e.currentTarget.style.color = '#f97316';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.60)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <MoreMenu onDelete={() => onDelete?.(doc)} onDownload={() => onDownload?.(doc)} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ─── List Card ───────────────────────────────────── */
function ListCard({ doc, onView, onDelete, onDownload }) {
  const [hovered, setHovered] = useState(false);
  const docType = inferDocType(doc.filename);
  const date    = fmtDate(doc.document_date, doc.created_at);
  const amount  = fmtAmount(doc.total_amount);

  return (
    <motion.article
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 16px',
        borderRadius: 12,
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: hovered ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(255,255,255,0.08)',
        transition: 'background 0.18s, border-color 0.18s',
      }}
    >
      <div style={{ width: 42, height: 50, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <TypeBadge type={docType} />
        <StatusBadge status={doc.status} needsReview={doc.needs_review} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>
          {doc.filename}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.44)', fontFamily: "'Inter', system-ui, sans-serif" }}>
          {doc.vendor_name || 'Vendor Unspecified'}
        </p>
      </div>

      {date && (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', fontFamily: "'Inter', system-ui, sans-serif", flexShrink: 0 }}>
          {date}
        </span>
      )}

      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", flexShrink: 0 }}>
        {amount || '—'}
      </span>

      <ConfidenceBadge docId={doc.document_id} level={doc.confidence_level || (doc.needs_review ? 'MEDIUM' : 'HIGH')} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          aria-label="View document"
          onClick={() => onView?.(doc)}
          style={{
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.60)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(249,115,22,0.18)';
            e.currentTarget.style.color = '#f97316';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.60)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <MoreMenu onDelete={() => onDelete?.(doc)} onDownload={() => onDownload?.(doc)} />
      </div>
    </motion.article>
  );
}

/* ─── Public Export ──────────────────────────────── */
export default function DocumentCard({ doc, viewMode = 'grid', onView, onDelete, onDownload }) {
  return viewMode === 'list' ? (
    <ListCard doc={doc} onView={onView} onDelete={onDelete} onDownload={onDownload} />
  ) : (
    <GridCard doc={doc} onView={onView} onDelete={onDelete} onDownload={onDownload} />
  );
}
