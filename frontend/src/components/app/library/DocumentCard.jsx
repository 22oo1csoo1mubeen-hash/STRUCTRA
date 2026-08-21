import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Helpers ─────────────────────────────────────── */
export function parseDateString(d) {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d.getTime())) return d;
  if (typeof d !== 'string') return null;
  const str = d.trim();
  if (!str) return null;

  // 1. Match DD/MM/YYYY or DD-MM-YYYY (e.g., "29/07/2026", "29-07-2026", "06/06/2015")
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    let year = parseInt(ddmmyyyy[3], 10);
    if (year < 100) year += 2000;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // 2. Match YYYY/MM/DD or YYYY-MM-DD (e.g., "2026-07-29")
  const yyyymmdd = str.match(/^(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    let year = parseInt(yyyymmdd[1], 10);
    if (year < 100) year += 2000;
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // 3. Fallback to standard Date constructor parsing (e.g. ISO timestamps, "Jun 6, 2015", etc.)
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
        Valid
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

function ConfidenceBadge({ level, isOverride = false }) {
  if (!level) return null;
  const L = String(level).toUpperCase();

  const isHigh = L === 'HIGH';
  const isMed = L === 'MEDIUM';

  const cfg = isHigh
    ? { icon: '✓', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.14)', border: 'rgba(34, 197, 94, 0.32)' }
    : isMed
    ? { icon: '⚠', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.32)' }
    : { icon: '!', color: '#f87171', bg: 'rgba(239, 68, 68, 0.14)',  border: 'rgba(239, 68, 68, 0.32)' };

  return (
    <span
      title={isOverride ? `Confidence manually set to ${L}` : `Confidence: ${L}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 5,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 10.5,
        fontWeight: 700,
        fontFamily: "'Inter', system-ui, sans-serif",
        letterSpacing: '0.04em',
      }}
    >
      <span>{cfg.icon}</span>
      <span>{L}</span>
    </span>
  );
}

/* ─── Realistic Mini Document Paper Thumbnail (Grid View) ─────── */
function DocThumbnail({ filename = '', vendorName = '', docType = 'RECEIPT' }) {
  const isInvoice = docType === 'INVOICE';
  const displayTitle = vendorName || filename.split('.')[0].replace(/_/g, ' ');

  return (
    <div
      style={{
        width: '100%',
        height: 130,
        background: 'radial-gradient(ellipse at center, rgba(38, 22, 12, 0.55) 0%, rgba(12, 6, 2, 0.85) 100%)',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.40)',
      }}
    >
      {/* Paper mock */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 6,
          background: 'linear-gradient(180deg, #faf7f0 0%, #ede8dc 100%)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0,0,0,0.2)',
          padding: '8px 11px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          transform: 'perspective(400px) rotateX(2deg)',
          transformOrigin: 'center bottom',
          border: '1px solid rgba(255, 255, 255, 0.85)',
        }}
      >
        {/* Paper Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 10,
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
              fontSize: 7.5,
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
        <div style={{ width: '100%', height: 1.2, background: '#d5cfb0', opacity: 0.9, margin: '3px 0 2px' }} />

        {/* Line items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5, flex: 1, marginTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '55%', height: 3, borderRadius: 1.5, background: '#9e9686' }} />
            <div style={{ width: '22%', height: 3, borderRadius: 1.5, background: '#80786a' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '42%', height: 3, borderRadius: 1.5, background: '#b0a898' }} />
            <div style={{ width: '18%', height: 3, borderRadius: 1.5, background: '#90887a' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '64%', height: 3, borderRadius: 1.5, background: '#beb6a6' }} />
            <div style={{ width: '24%', height: 3, borderRadius: 1.5, background: '#9a9282' }} />
          </div>
        </div>

        {/* Paper Footer / Barcode */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 1.2, alignItems: 'center', height: 9.5, opacity: 0.75 }}>
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3].map((w, idx) => (
              <div key={idx} style={{ width: w, height: '100%', background: '#25201c' }} />
            ))}
          </div>
          <div style={{ width: '32%', height: 4, borderRadius: 2, background: '#25201c' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Miniature Receipt Graphic Tile (List View) ─────── */
function MiniDocThumbnail({ filename = '', vendorName = '', docType = 'RECEIPT' }) {
  const isInvoice = docType === 'INVOICE';
  return (
    <div
      style={{
        width: 48,
        height: 52,
        borderRadius: 9,
        background: 'radial-gradient(ellipse at center, rgba(38, 22, 12, 0.6) 0%, rgba(12, 6, 2, 0.9) 100%)',
        border: '1px solid rgba(249,115,22,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.30)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 4,
          background: 'linear-gradient(180deg, #faf7f0 0%, #ebe6da 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '4px 4px 3px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        }}
      >
        {/* Top bar with color dot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 14, height: 2.5, borderRadius: 1.5, background: '#25201c' }} />
          <div style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: isInvoice ? '#0284c7' : '#ea580c' }} />
        </div>
        {/* Mini lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ width: '80%', height: 2, borderRadius: 1, background: '#a09888' }} />
          <div style={{ width: '60%', height: 2, borderRadius: 1, background: '#b2aa9a' }} />
        </div>
        {/* Mini barcode */}
        <div style={{ display: 'flex', gap: 1, alignItems: 'center', height: 5, opacity: 0.8 }}>
          {[2, 1, 2, 1, 3, 1, 2].map((w, idx) => (
            <div key={idx} style={{ width: w, height: '100%', background: '#25201c' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Actions: View + More Menu ────────────────────── */
function MoreMenu({ onDelete, onDownload }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);

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
        ref={btnRef}
        type="button"
        aria-label="More options"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.11)',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.65)',
          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
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
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              right: 0,
              minWidth: 144,
              background: 'rgba(12,7,3,0.96)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: 10,
              padding: 4,
              zIndex: 300,
              boxShadow: '0 14px 44px rgba(0,0,0,0.70)',
            }}
          >
            <MenuBtn icon="download" label="Download" onClick={() => { setOpen(false); onDownload?.(); }} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '3px 0' }} />
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
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        borderRadius: 7,
        background: h ? (danger ? 'rgba(220,38,38,0.18)' : 'rgba(255,255,255,0.08)') : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: danger ? (h ? '#f87171' : 'rgba(248,113,113,0.90)') : (h ? 'rgba(255,248,238,0.98)' : 'rgba(255,248,238,0.72)'),
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
function GridCard({ doc, onView, onDelete, onDownload, isExporting = false }) {
  const [hovered, setHovered] = useState(false);
  const docType = inferDocType(doc.filename);
  const date    = fmtDate(doc.document_date, doc.created_at);
  const amount  = fmtAmount(doc.total_amount);

  const effectiveLevel = doc.confidence_level || (doc.needs_review ? 'MEDIUM' : 'HIGH');
  const isNeedsReview = doc.needs_review !== undefined ? doc.needs_review : (effectiveLevel !== 'HIGH');

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -2.5 }}
      transition={{ duration: 0.20, ease: 'easeOut' }}
      onClick={() => onView?.(doc)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        background: hovered
          ? 'linear-gradient(145deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.035) 100%)'
          : 'linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.022) 100%)',
        border: hovered ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.11)',
        backdropFilter: 'blur(28px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.22)'
          : '0 8px 26px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.16)',
        transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
        position: 'relative',
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
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 10px' }}>
        <TypeBadge type={docType} />
        <StatusBadge status={doc.status} needsReview={isNeedsReview} />
      </div>

      {/* Thumbnail */}
      <div style={{ padding: '0 14px' }}>
        <DocThumbnail filename={doc.filename} vendorName={doc.vendor_name} docType={docType} />
      </div>

      {/* Details */}
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Filename */}
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
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
            color: 'rgba(255,255,255,0.52)',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {doc.vendor_name || 'Vendor Unspecified'}
        </p>

        {/* Date + Amount */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          {date ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                color: 'rgba(255,255,255,0.48)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {date}
            </span>
          ) : <div />}
          <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", textShadow: '0 2px 8px rgba(0,0,0,0.30)' }}>
            {amount || '—'}
          </span>
        </div>

        {/* Confidence + Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <ConfidenceBadge level={effectiveLevel} isOverride={Boolean(doc.confidence_override)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Export / Download Button */}
            <button
              type="button"
              aria-label={isExporting ? "Exporting document…" : "Export document"}
              title={isExporting ? "Exporting document…" : "Export / Download document"}
              disabled={isExporting}
              onClick={(e) => {
                e.stopPropagation();
                if (!isExporting) onDownload?.(doc);
              }}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: isExporting ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)',
                border: isExporting ? '1px solid rgba(16,185,129,0.45)' : '1px solid rgba(255,255,255,0.11)',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                color: isExporting ? '#10b981' : 'rgba(255,255,255,0.65)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (isExporting) return;
                e.currentTarget.style.background = 'rgba(16,185,129,0.18)';
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)';
                e.currentTarget.style.color = '#10b981';
              }}
              onMouseLeave={(e) => {
                if (isExporting) return;
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
              }}
            >
              {isExporting ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'lib-spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </button>

            {/* Delete Button */}
            <button
              type="button"
              aria-label="Delete document"
              title="Delete document"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(doc);
              }}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.11)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.65)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.40)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ─── List Card ───────────────────────────────────── */
function ListCard({ doc, onView, onDelete, onDownload, isExporting = false }) {
  const [hovered, setHovered] = useState(false);
  const docType = inferDocType(doc.filename);
  const date    = fmtDate(doc.document_date, doc.created_at);
  const amount  = fmtAmount(doc.total_amount);

  const effectiveLevel = doc.confidence_level || (doc.needs_review ? 'MEDIUM' : 'HIGH');
  const isNeedsReview = doc.needs_review !== undefined ? doc.needs_review : (effectiveLevel !== 'HIGH');

  return (
    <motion.article
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={() => onView?.(doc)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        borderRadius: 14,
        cursor: 'pointer',
        background: hovered
          ? 'linear-gradient(135deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.035) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
        border: hovered ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.11)',
        backdropFilter: 'blur(28px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.20)'
          : '0 6px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14)',
        transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
        position: 'relative',
      }}
    >
      {/* Mini Receipt Graphic Thumbnail */}
      <MiniDocThumbnail filename={doc.filename} vendorName={doc.vendor_name} docType={docType} />

      {/* Badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <TypeBadge type={docType} />
        <StatusBadge status={doc.status} needsReview={isNeedsReview} />
      </div>

      {/* Filename & Vendor */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>
          {doc.filename}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.50)', fontFamily: "'Inter', system-ui, sans-serif" }}>
          {doc.vendor_name || 'Vendor Unspecified'}
        </p>
      </div>

      {/* Date */}
      {date && (
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.48)', fontFamily: "'Inter', system-ui, sans-serif", flexShrink: 0 }}>
          {date}
        </span>
      )}

      {/* Amount */}
      <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", flexShrink: 0, textShadow: '0 2px 6px rgba(0,0,0,0.30)' }}>
        {amount || '—'}
      </span>

      {/* Confidence */}
      <ConfidenceBadge level={effectiveLevel} isOverride={Boolean(doc.confidence_override)} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Export / Download Button */}
        <button
          type="button"
          aria-label={isExporting ? "Exporting document…" : "Export document"}
          title={isExporting ? "Exporting document…" : "Export / Download document"}
          disabled={isExporting}
          onClick={(e) => {
            e.stopPropagation();
            if (!isExporting) onDownload?.(doc);
          }}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            background: isExporting ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)',
            border: isExporting ? '1px solid rgba(16,185,129,0.45)' : '1px solid rgba(255,255,255,0.11)',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            color: isExporting ? '#10b981' : 'rgba(255,255,255,0.65)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (isExporting) return;
            e.currentTarget.style.background = 'rgba(16,185,129,0.18)';
            e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)';
            e.currentTarget.style.color = '#10b981';
          }}
          onMouseLeave={(e) => {
            if (isExporting) return;
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
          }}
        >
          {isExporting ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'lib-spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
        </button>

        {/* Delete Button */}
        <button
          type="button"
          aria-label="Delete document"
          title="Delete document"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(doc);
          }}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.11)',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.65)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.40)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </motion.article>
  );
}

/* ─── Public Export ──────────────────────────────── */
export default function DocumentCard({ doc, viewMode = 'grid', onView, onDelete, onDownload, isExporting = false }) {
  return viewMode === 'list' ? (
    <ListCard doc={doc} onView={onView} onDelete={onDelete} onDownload={onDownload} isExporting={isExporting} />
  ) : (
    <GridCard doc={doc} onView={onView} onDelete={onDelete} onDownload={onDownload} isExporting={isExporting} />
  );
}

