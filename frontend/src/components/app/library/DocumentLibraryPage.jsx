import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { listDocuments, deleteDocument, downloadDocument, getDocumentDetail } from '../../../api/documents';

import LibrarySummaryCards from './LibrarySummaryCards';
import LibraryToolbar      from './LibraryToolbar';
import DocumentCard        from './DocumentCard';
import LibraryPagination   from './LibraryPagination';
import LibraryEmptyState   from './LibraryEmptyState';

/* ─── Loading skeleton card ───────────────────────────────── */
function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        height: 280,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className="lib-shimmer" style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}

/* ─── Delete confirmation modal ───────────────────────────── */
function DeleteModal({ doc, loading, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.68)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          borderRadius: 18,
          background: 'rgba(10,5,1,0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(249,115,22,0.22)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'rgba(220,50,50,0.12)',
            border: '1px solid rgba(248,113,113,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.88)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
            Delete document?
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.52)', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.55 }}>
            <strong style={{ color: 'rgba(255,255,255,0.80)', fontWeight: 600 }}>{doc?.filename}</strong> will be permanently removed from your document library. This action cannot be undone.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            id="delete-modal-cancel-btn"
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 13.5,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            id="delete-modal-confirm-btn"
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: 'rgba(220,50,50,0.28)',
              border: '1px solid rgba(248,113,113,0.32)',
              color: 'rgba(248,113,113,0.95)',
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Document detail side panel ─────────────────────────── */
function DetailPanel({ doc, detail, loading, error, onClose, onDownload }) {
  const ext = detail?.extraction || {};
  const qual = detail?.quality || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: '90vw',
          background: 'rgba(10,5,1,0.97)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderLeft: '1px solid rgba(249,115,22,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#f97316', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Document Detail
            </p>
            <h2 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 295 }} title={doc?.filename}>
              {doc?.filename}
            </h2>
          </div>
          <button
            id="detail-panel-close-btn"
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', color: 'rgba(255,255,255,0.60)', flexShrink: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.18)', borderTopColor: '#f97316', animation: 'lib-spin 0.8s linear infinite' }} />
            </div>
          )}
          {error && <div style={{ padding: 14, borderRadius: 10, background: 'rgba(220,50,50,0.10)', border: '1px solid rgba(248,113,113,0.22)', color: 'rgba(248,113,113,0.88)', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>{error}</div>}
          {!loading && !error && detail && (
            <>
              <DetailSection title="Status">
                <DetailRow label="Status" value={doc?.needs_review ? <span style={{ color: '#fbbf24', fontWeight: 600 }}>⚠ Needs Review</span> : <span style={{ color: '#4ade80', fontWeight: 600 }}>✓ Processed</span>} />
                {qual.confidence_level && <DetailRow label="Confidence" value={<span style={{ fontWeight: 700, color: { HIGH: '#4ade80', MEDIUM: '#fbbf24', LOW: '#f87171' }[String(qual.confidence_level).toUpperCase()] || 'rgba(255,255,255,0.6)' }}>{String(qual.confidence_level).toUpperCase()}</span>} />}
              </DetailSection>
              <DetailSection title="Extracted Data">
                {ext.vendor_company && <DetailRow label="Vendor" value={ext.vendor_company} />}
                {ext.address && <DetailRow label="Address" value={ext.address} />}
                {ext.date && <DetailRow label="Date" value={ext.date} />}
                {ext.invoice_number && <DetailRow label="Invoice #" value={ext.invoice_number} />}
                {ext.subtotal != null && <DetailRow label="Subtotal" value={fmt(ext.subtotal)} />}
                {ext.tax != null && <DetailRow label="Tax" value={fmt(ext.tax)} />}
                {ext.discount != null && <DetailRow label="Discount" value={fmt(ext.discount)} />}
                {ext.total != null && <DetailRow label="Total" value={<strong style={{ color: '#ffffff', fontFamily: "'Inter',system-ui,sans-serif" }}>{fmt(ext.total)}</strong>} />}
                {!ext.vendor_company && !ext.date && ext.total == null && <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', system-ui, sans-serif" }}>No extraction data available.</p>}
              </DetailSection>
              {ext.line_items?.length > 0 && (
                <DetailSection title={`Line Items (${ext.line_items.length})`}>
                  {ext.line_items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'rgba(255,255,255,0.68)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                      {item.line_total != null && <span style={{ flexShrink: 0, marginLeft: 12, fontWeight: 600 }}>{fmt(item.line_total)}</span>}
                    </div>
                  ))}
                </DetailSection>
              )}
              <button
                id="detail-panel-download-btn"
                type="button"
                onClick={onDownload}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, background: 'rgba(249,115,22,0.14)', border: '1px solid rgba(249,115,22,0.32)', color: '#f97316', fontSize: 13.5, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer', marginTop: 4, transition: 'background 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.24)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.14)'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Original
              </button>
            </>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif" }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', fontFamily: "'Inter', system-ui, sans-serif", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}

function fmt(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
}

/* ─── Client-side filtering + sorting ─────────────────────── */
function applyFilters(items, { search, docType, statusFilter, sortBy }) {
  let out = items.filter((d) => d.status === 'completed');

  if (search.trim()) {
    const q = search.toLowerCase();
    out = out.filter(
      (d) =>
        d.filename?.toLowerCase().includes(q) ||
        d.vendor_name?.toLowerCase().includes(q) ||
        d.document_date?.toLowerCase().includes(q)
    );
  }

  if (docType !== 'all') {
    const wantInvoice = docType === 'INVOICE';
    out = out.filter((d) => {
      const name = (d.filename || '').toLowerCase();
      const isInv = name.includes('invoice') || name.includes('inv_');
      return wantInvoice ? isInv : !isInv;
    });
  }

  if (statusFilter === 'processed') {
    out = out.filter((d) => d.needs_review !== true);
  } else if (statusFilter === 'review') {
    out = out.filter((d) => d.needs_review === true);
  }

  switch (sortBy) {
    case 'oldest':
      out.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'amount_desc':
      out.sort((a, b) => (b.total_amount ?? -Infinity) - (a.total_amount ?? -Infinity));
      break;
    case 'amount_asc':
      out.sort((a, b) => (a.total_amount ?? Infinity) - (b.total_amount ?? Infinity));
      break;
    default:
      out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return out;
}

/* ─── Main DocumentLibraryPage Component ─────────────────── */
export default function DocumentLibraryPage() {
  const [allItems, setAllItems]     = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Pagination
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Filters
  const [search, setSearch]             = useState('');
  const [docType, setDocType]           = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy]             = useState('newest');
  const [viewMode, setViewMode]         = useState('grid');

  // Modals & Panels
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [detailDoc, setDetailDoc]         = useState(null);
  const [detailData, setDetailData]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError]     = useState(null);

  // Ensure page is scrolled to top on initial mount
  useEffect(() => {
    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  // State for backend summary stats
  const [stats, setStats] = useState({ total: 0, processed: 0, needs_review: 0 });

  /* ── Fetch backend documents using server-side pagination, filters & search ── */
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await listDocuments(page, pageSize, {
        search,
        docType,
        status: statusFilter,
        sortBy,
      });

      setAllItems(res.items || []);
      setServerTotal(res.total || 0);
      if (res.stats) {
        setStats(res.stats);
      } else {
        const completed = (res.items || []).filter((d) => d.status === 'completed');
        setStats({
          total: res.total || 0,
          processed: completed.filter((d) => d.needs_review !== true).length,
          needs_review: completed.filter((d) => d.needs_review === true).length,
        });
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, docType, statusFilter, sortBy]);

  const location = useLocation();

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Auto-open detail panel if navigated with selectedDocId state or URL query
  useEffect(() => {
    const selectedDocId = location.state?.selectedDocId || new URLSearchParams(location.search).get('document_id');
    if (selectedDocId) {
      handleView({ document_id: selectedDocId, filename: location.state?.filename || 'Document' });
    }
  }, [location]);

  // Reset page to 1 when filters, search or sort change
  useEffect(() => {
    setPage(1);
  }, [search, docType, statusFilter, sortBy]);

  const pageItems = allItems;
  const filteredTotal = serverTotal;
  const hasNext = (page * pageSize) < serverTotal;

  /* ── Handlers ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteDocument(deleteTarget.document_id);
      setDeleteTarget(null);
      await fetchDocs();
    } catch {
      /* silent */
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleView = async (doc) => {
    setDetailDoc(doc);
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await getDocumentDetail(doc.document_id);
      setDetailData(data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load document details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { blob, filename } = await downloadDocument(doc.document_id);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename || doc.filename });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    }
  };

  return (
    <>
      <style>{`
        @keyframes lib-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes lib-spin { to { transform: rotate(360deg); } }
        .lib-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: lib-shimmer 1.6s ease-in-out infinite;
        }
        
        .lib-grid-container {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 1380px) {
          .lib-grid-container {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 1040px) {
          .lib-grid-container {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .lib-grid-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>

        {/* ══════════════════════════════════════════════
            PAGE HEADER — matches DocumentLibrary-reference.png
        ══════════════════════════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px 0' }}>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f97316', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Your Documents
            </p>
            <h1 style={{ margin: '0 0 8px', fontSize: 34, fontWeight: 800, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.01em', lineHeight: 1.12 }}>
              Document Library
            </h1>
            <p style={{ margin: 0, fontSize: 14.5, color: 'rgba(255,255,255,0.50)', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5 }}>
              Your receipts, invoices, and extracted data — organized in one place.
            </p>
          </motion.div>

          {/* Glowing Stacked Document Cards Artwork */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            aria-hidden="true"
            style={{ flexShrink: 0, width: 140, height: 96, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {[2, 1, 0].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 64,
                  height: 80,
                  borderRadius: 9,
                  background: i === 0 ? 'rgba(249,115,22,0.24)' : `rgba(255,255,255,${0.04 + i * 0.02})`,
                  border: i === 0 ? '1.5px solid rgba(249,115,22,0.55)' : '1px solid rgba(255,255,255,0.09)',
                  boxShadow: i === 0 ? '0 8px 32px rgba(249,115,22,0.22)' : '0 4px 12px rgba(0,0,0,0.22)',
                  transform: `rotate(${(i - 1) * 7}deg) translate(${(i - 1) * 15}px, ${(i - 1) * -3}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {i === 0 && (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <div style={{ width: 28, height: 2, borderRadius: 1, background: 'rgba(249,115,22,0.40)' }} />
                    <div style={{ width: 20, height: 2, borderRadius: 1, background: 'rgba(249,115,22,0.25)' }} />
                  </>
                )}
              </div>
            ))}
            {[{ top: 2, right: 14, s: 3.5 }, { top: 16, right: 4, s: 2.5 }, { bottom: 8, left: 6, s: 3 }].map((sp, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', width: sp.s, height: sp.s, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 6px rgba(249,115,22,0.7)', top: sp.top, right: sp.right, bottom: sp.bottom, left: sp.left }}
              />
            ))}
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════
            SUMMARY CARDS
        ══════════════════════════════════════════════ */}
        <LibrarySummaryCards
          total={stats.total}
          processed={stats.processed}
          needsReview={stats.needs_review}
          loading={loading}
        />

        {/* ══════════════════════════════════════════════
            TOOLBAR
        ══════════════════════════════════════════════ */}
        <LibraryToolbar
          search={search}             onSearchChange={setSearch}
          docType={docType}           onDocTypeChange={setDocType}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          sortBy={sortBy}             onSortChange={setSortBy}
          viewMode={viewMode}         onViewModeChange={setViewMode}
        />

        {/* ══════════════════════════════════════════════
            MAIN CONTENT AREA
        ══════════════════════════════════════════════ */}
        <div style={{ padding: '16px 28px 0' }}>

          {/* Fetch error */}
          {fetchError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(220,50,50,0.09)', border: '1px solid rgba(248,113,113,0.22)', color: 'rgba(248,113,113,0.88)', fontSize: 13.5, fontFamily: "'Inter', system-ui, sans-serif", marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {fetchError}
              <button type="button" onClick={fetchDocs} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 7, background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.28)', color: 'rgba(248,113,113,0.88)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Retry
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className={viewMode === 'grid' ? 'lib-grid-container' : undefined} style={{ display: viewMode === 'list' ? 'flex' : undefined, flexDirection: viewMode === 'list' ? 'column' : undefined, gap: 14 }}>
              {Array.from({ length: pageSize }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* True empty library (0 documents overall, no error) */}
          {!loading && !fetchError && stats.total === 0 && (
            <LibraryEmptyState />
          )}

          {/* No results matching current filters/search */}
          {!loading && !fetchError && stats.total > 0 && serverTotal === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 24px', textAlign: 'center' }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.42)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                No documents match your filters
              </p>
              <button type="button" onClick={() => { setSearch(''); setDocType('all'); setStatusFilter('all'); }} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer' }}>
                Clear filters
              </button>
            </motion.div>
          )}

          {/* Document Grid (4-column desktop) / List */}
          {!loading && pageItems.length > 0 && (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${viewMode}-${page}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.20 }}
                className={viewMode === 'grid' ? 'lib-grid-container' : undefined}
                style={{
                  display: viewMode === 'list' ? 'flex' : undefined,
                  flexDirection: viewMode === 'list' ? 'column' : undefined,
                  gap: 14,
                }}
              >
                {pageItems.map((doc) => (
                  <DocumentCard
                    key={doc.document_id}
                    doc={doc}
                    viewMode={viewMode}
                    onView={handleView}
                    onDelete={(d) => setDeleteTarget(d)}
                    onDownload={handleDownload}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            PAGINATION
        ══════════════════════════════════════════════ */}
        {!loading && !fetchError && filteredTotal > 0 && (
          <LibraryPagination
            page={page}
            pageSize={pageSize}
            total={filteredTotal}
            hasNext={hasNext}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            doc={deleteTarget}
            loading={deleteLoading}
            onConfirm={handleDeleteConfirm}
            onCancel={() => { if (!deleteLoading) setDeleteTarget(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailDoc && (
          <DetailPanel
            doc={detailDoc}
            detail={detailData}
            loading={detailLoading}
            error={detailError}
            onClose={() => { setDetailDoc(null); setDetailData(null); }}
            onDownload={() => handleDownload(detailDoc)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
