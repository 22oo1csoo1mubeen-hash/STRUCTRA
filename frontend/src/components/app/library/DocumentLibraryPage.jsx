import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { listDocuments, deleteDocument, downloadDocument, exportDocument, getDocumentDetail, saveDocument } from '../../../api/documents';
import { useDocumentLibrary } from '../../../context/DocumentLibraryContext';

import LibrarySummaryCards from './LibrarySummaryCards';
import LibraryToolbar      from './LibraryToolbar';
import DocumentCard, { parseDateString } from './DocumentCard';
import LibraryPagination   from './LibraryPagination';
import LibraryEmptyState   from './LibraryEmptyState';
import ExtractionResultWorkspace from '../upload/ExtractionResultWorkspace';

/* ─── Loading skeleton card ───────────────────────────────── */
function SkeletonCard({ viewMode = 'grid' }) {
  if (viewMode === 'list') {
    return (
      <div
        style={{
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          height: 72,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
      >
        <div className="lib-shimmer" style={{ position: 'absolute', inset: 0 }} />
        {/* Placeholder thumbnail */}
        <div style={{ width: 48, height: 50, borderRadius: 9, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        {/* Placeholder badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <div style={{ width: 52, height: 16, borderRadius: 5, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ width: 68, height: 16, borderRadius: 5, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        {/* Placeholder text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ width: '40%', height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.10)' }} />
          <div style={{ width: '22%', height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        {/* Placeholder amount */}
        <div style={{ width: 75, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.09)', flexShrink: 0 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 16,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.022) 100%)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        height: 290,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
      }}
    >
      <div className="lib-shimmer" style={{ position: 'absolute', inset: 0 }} />
      {/* Badges row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px 10px' }}>
        <div style={{ width: 56, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ width: 72, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      {/* Thumbnail placeholder */}
      <div style={{ margin: '0 14px', height: 110, borderRadius: 10, background: 'rgba(255,255,255,0.06)' }} />
      {/* Details placeholder */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
        <div style={{ width: '65%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.09)' }} />
        <div style={{ width: '40%', height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ width: '30%', height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ width: '25%', height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.10)' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Delete confirmation modal (Single or All) ──────────────────── */
function DeleteModal({ doc, count = 0, loading, onConfirm, onCancel }) {
  const isAll = doc === 'ALL' || count > 0;
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
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 8 }}
        transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(18,10,4,0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(239,68,68,0.28)',
          borderRadius: 18,
          padding: '28px 28px 24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 32px rgba(239,68,68,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 0,
        }}
      >
        {/* Trash Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.14)',
            border: '1px solid rgba(239,68,68,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            marginBottom: 16,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 18,
            fontWeight: 800,
            color: '#ffffff',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '-0.01em',
          }}
        >
          {isAll ? 'Delete All Documents?' : 'Delete Document?'}
        </h3>

        {/* Description */}
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 13.5,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: "'Inter', system-ui, sans-serif",
            lineHeight: 1.5,
          }}
        >
          {isAll ? (
            <>
              Are you sure you want to permanently delete all <strong style={{ color: '#ffffff' }}>{count} documents</strong>? This action will wipe all extractions and cannot be undone.
            </>
          ) : (
            <>
              Are you sure you want to delete <strong style={{ color: '#ffffff' }}>"{doc?.filename || 'this document'}"</strong>? This will permanently remove the document and its extracted data.
            </>
          )}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: '1px solid rgba(239,68,68,0.50)',
              color: '#ffffff',
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 18px rgba(239,68,68,0.35)',
              transition: 'opacity 0.15s, transform 0.12s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? (isAll ? 'Deleting All…' : 'Deleting…') : (isAll ? 'Delete All' : 'Delete')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Export confirmation modal ────────────────────────────────────── */
function ExportModal({ doc, loading, onConfirm, onCancel }) {
  if (!doc) return null;
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
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 8 }}
        transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(18,10,4,0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(249,115,22,0.30)',
          borderRadius: 18,
          padding: '28px 28px 24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 32px rgba(249,115,22,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 0,
        }}
      >
        {/* Export / Excel Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(249,115,22,0.14)',
            border: '1px solid rgba(249,115,22,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f97316',
            marginBottom: 16,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 18,
            fontWeight: 800,
            color: '#ffffff',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '-0.01em',
          }}
        >
          Export Document?
        </h3>

        {/* Description */}
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 13.5,
            color: 'rgba(255,255,255,0.65)',
            fontFamily: "'Inter', system-ui, sans-serif",
            lineHeight: 1.5,
          }}
        >
          Generate and download a STRUCTRA Excel report (<span style={{ color: '#f97316', fontWeight: 600 }}>.xlsx</span>) for{' '}
          <strong style={{ color: '#ffffff' }}>"{doc?.filename || 'this document'}"</strong>?
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            Cancel
          </button>
          <button
            id="confirm-export-btn"
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: '1px solid rgba(249,115,22,0.50)',
              color: '#ffffff',
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 18px rgba(249,115,22,0.35)',
              transition: 'opacity 0.15s, transform 0.12s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main DocumentLibraryPage Component ─────────────────── */
export default function DocumentLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    items: cachedItems,
    total: cachedTotal,
    stats,
    hasLoadedOnce,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    updateDocumentLibrary,
    fetchLibraryDocuments,
    removeDocumentFromLibrary,
    clearLibrary,
  } = useDocumentLibrary();

  const [loading, setLoading]       = useState(!hasLoadedOnce);
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Search filter (local to session search)
  const [search, setSearch] = useState('');

  // Modals & Panels
  const [deleteTarget, setDeleteTarget]             = useState(null);
  const [deleteLoading, setDeleteLoading]           = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading]     = useState(false);
  const [exportAllLoading, setExportAllLoading]     = useState(false);
  const [exportTarget, setExportTarget]             = useState(null);

  // Detail View State (Full In-Place Result View)
  const [detailDoc, setDetailDoc]         = useState(null);
  const [detailData, setDetailData]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError]     = useState(null);
  const [exportingDocId, setExportingDocId] = useState(null);

  // Filter change handlers that immediately reset pagination to page 1
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };
  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };
  const handleSortChange = (val) => {
    setSortBy(val);
    setPage(1);
  };
  const handlePageChange = (newPage) => {
    setPage(newPage);
    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Ensure page is scrolled to top on initial mount
  useEffect(() => {
    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  /* ── Fetch backend documents using server-side pagination, filters & search ── */
  const fetchDocs = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setPageTransitioning(true);
    }
    setFetchError(null);
    try {
      await fetchLibraryDocuments(page, pageSize, {
        search,
        status: statusFilter,
        sortBy,
      }, isBackground);
    } catch (err) {
      setFetchError(err.message || 'Failed to load documents.');
    } finally {
      setPageTransitioning(false);
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, sortBy, fetchLibraryDocuments]);

  useEffect(() => {
    fetchDocs(false);
  }, [page, pageSize, search, statusFilter, sortBy]);

  // Delete all documents confirmation
  const handleDeleteAllConfirm = async () => {
    setDeleteAllLoading(true);
    try {
      let allDocs = [];
      let currentPage = 1;
      let hasMore = true;
      while (hasMore && currentPage <= 20) {
        const res = await listDocuments(currentPage, 100, { search: '', status: 'all', sortBy: 'newest' });
        const docs = res.items || [];
        allDocs = [...allDocs, ...docs];
        if (docs.length < 100 || allDocs.length >= (res.total || 0)) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      clearLibrary();
      setShowDeleteAllModal(false);

      if (allDocs.length > 0) {
        await Promise.all(
          allDocs.map((d) => deleteDocument(d.document_id || d.id).catch((err) => console.error('Delete doc error:', err)))
        );
      }

      setPage(1);
      await fetchDocs(false);
    } catch (err) {
      console.error('Failed to delete all documents:', err);
    } finally {
      setDeleteAllLoading(false);
      setShowDeleteAllModal(false);
    }
  };

  // Export all documents to JSON
  const handleExportAll = async () => {
    setExportAllLoading(true);
    try {
      const res = await listDocuments(1, 1000, { search: '', status: 'all', sortBy: 'newest' });
      const docsToExport = res.items || [];
      if (docsToExport.length === 0) return;

      const exportPayload = {
        exported_at: new Date().toISOString(),
        total_documents: docsToExport.length,
        documents: docsToExport.map((d) => ({
          document_id: d.document_id || d.id,
          filename: d.filename,
          vendor: d.vendor_name || '',
          date: d.document_date || '',
          total_amount: d.total_amount !== undefined ? d.total_amount : null,
          confidence_level: d.confidence_level || 'HIGH',
          status: d.needs_review ? 'Needs Review' : 'Valid',
          created_at: d.created_at,
          processed_at: d.processed_at,
        })),
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `structra_library_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export all documents:', err);
    } finally {
      setExportAllLoading(false);
    }
  };

  // Auto-open result view if navigated with selectedDocId state or URL query
  useEffect(() => {
    const selectedDocId = location.state?.selectedDocId || new URLSearchParams(location.search).get('document_id');
    if (selectedDocId) {
      const docObj = {
        document_id: selectedDocId,
        id: selectedDocId,
        filename: location.state?.filename || 'Document',
      };
      const initialDetail = location.state?.documentDetail || null;
      handleView(docObj, initialDetail);
    }
  }, [location.state?.selectedDocId, location.search]);

  const pageItems = useMemo(() => {
    if (!cachedItems || cachedItems.length === 0) return [];
    const copy = [...cachedItems];
    if (sortBy === 'date_asc' || sortBy === 'doc_date_asc') {
      copy.sort((a, b) => {
        const da = parseDateString(a.document_date) || parseDateString(a.created_at) || new Date(0);
        const db = parseDateString(b.document_date) || parseDateString(b.created_at) || new Date(0);
        const diff = da.getTime() - db.getTime();
        if (diff !== 0) return diff;
        const ca = new Date(a.created_at || 0).getTime();
        const cb = new Date(b.created_at || 0).getTime();
        return ca - cb;
      });
    } else if (sortBy === 'date_desc' || sortBy === 'doc_date_desc') {
      copy.sort((a, b) => {
        const da = parseDateString(a.document_date) || parseDateString(a.created_at) || new Date(0);
        const db = parseDateString(b.document_date) || parseDateString(b.created_at) || new Date(0);
        const diff = db.getTime() - da.getTime();
        if (diff !== 0) return diff;
        const ca = new Date(a.created_at || 0).getTime();
        const cb = new Date(b.created_at || 0).getTime();
        return cb - ca;
      });
    } else if (sortBy === 'amount_desc') {
      copy.sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0));
    } else if (sortBy === 'amount_asc') {
      copy.sort((a, b) => (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0));
    }
    return copy;
  }, [cachedItems, sortBy]);

  const filteredTotal = cachedTotal;
  const hasNext = (page * pageSize) < cachedTotal;

  /* ── Handlers ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const docIdToDelete = deleteTarget.document_id || deleteTarget.id;
      removeDocumentFromLibrary(docIdToDelete);
      setDeleteTarget(null);
      await deleteDocument(docIdToDelete);
      if (detailDoc && (detailDoc.document_id === docIdToDelete || detailDoc.id === docIdToDelete)) {
        handleBackToLibrary();
      }
      await fetchDocs(true);
    } catch {
      /* silent */
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleView = async (doc, initialData = null) => {
    const docId = doc?.document_id || doc?.id;
    if (!docId) return;

    setDetailDoc(doc);
    if (initialData) {
      setDetailData(initialData);
      setDetailLoading(false);
      setDetailError(null);
    } else {
      setDetailData(null);
      setDetailError(null);
      setDetailLoading(true);
    }

    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    try {
      const data = await getDocumentDetail(docId);
      if (data) {
        setDetailData(data);
        setDetailError(null);
      }
    } catch (err) {
      console.warn('Failed to fetch latest document detail from API:', err);
      if (!initialData) {
        const foundInCache = cachedItems.find((it) => (it.document_id || it.id) === docId);
        if (foundInCache) {
          setDetailData({
            document: {
              id: foundInCache.document_id || foundInCache.id,
              document_id: foundInCache.document_id || foundInCache.id,
              filename: foundInCache.filename,
              storage_path: foundInCache.storage_path,
              content_type: foundInCache.content_type,
              size: foundInCache.size,
              status: foundInCache.status,
              created_at: foundInCache.created_at,
              processed_at: foundInCache.processed_at,
            },
            extraction: {
              vendor_company: foundInCache.vendor_name,
              date: foundInCache.document_date,
              total: foundInCache.total_amount,
              line_items: [],
            },
            quality: {
              confidence_level: foundInCache.confidence_level,
              confidence_override: foundInCache.confidence_override,
              overall_confidence: foundInCache.confidence_score,
            },
            original: {
              download_url: `/documents/storage/${docId}`,
              content_type: foundInCache.content_type || 'image/png',
              filename: foundInCache.filename || 'Document',
            }
          });
          setDetailError(null);
        } else {
          setDetailError(err.message || 'Failed to load document details.');
        }
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToLibrary = () => {
    setDetailDoc(null);
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(false);
    if (location.state?.selectedDocId || location.search) {
      navigate('/app/library', { replace: true, state: {} });
    }
    fetchDocs(true);
  };

  const handleSaveLibraryDocument = async (updatedDisplayData) => {
    const targetDocId = detailDoc?.document_id || detailDoc?.id || detailData?.document?.document_id;

    const parseNum = (str) => {
      if (typeof str === 'number') return str;
      if (!str) return 0;
      const cleaned = String(str).replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const confidenceOverride = updatedDisplayData?.confidenceOverride !== undefined
      ? updatedDisplayData.confidenceOverride
      : (detailData?.quality?.confidence_override ?? null);

    let extractionPayload = null;
    let total = undefined;
    if (updatedDisplayData) {
      const lineItems = (updatedDisplayData.lineItems || []).map((item) => ({
        description: item.item || item.description || '',
        quantity: typeof item.qty === 'number' ? item.qty : (parseInt(String(item.qty).replace(/[^0-9]/g, '')) || 1),
        unit_price: parseNum(item.rate || item.unit_price),
        line_total: parseNum(item.amount || item.line_total),
      }));
      total = parseNum(updatedDisplayData.totalAmount);

      extractionPayload = {
        vendor_company: updatedDisplayData.vendor ?? detailData?.extraction?.vendor_company ?? '',
        date: updatedDisplayData.date ?? detailData?.extraction?.date ?? '',
        address: updatedDisplayData.address ?? detailData?.extraction?.address ?? '',
        invoice_number: updatedDisplayData.invoiceNumber ?? detailData?.extraction?.invoice_number ?? '',
        total: total,
        subtotal: detailData?.extraction?.subtotal ?? total,
        tax: detailData?.extraction?.tax ?? 0,
        discount: detailData?.extraction?.discount ?? 0,
        line_items: lineItems,
      };
    }

    // Immediately return back to document library with 0 delay
    setDetailDoc(null);
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(false);
    if (location.state?.selectedDocId || location.search) {
      navigate('/app/library', { replace: true, state: {} });
    }

    // Persist changes and synchronize with backend source of truth
    if (targetDocId) {
      try {
        const savedDetail = await saveDocument(targetDocId, false, extractionPayload, confidenceOverride);
        if (savedDetail) {
          updateDocumentLibrary(savedDetail);
        }
      } catch (err) {
        console.error('Failed to save document:', err);
      } finally {
        fetchDocs();
      }
    }
  };

  const handleExportConfirm = async () => {
    if (!exportTarget) return;
    const docToExport = exportTarget;
    const docId = docToExport.document_id || docToExport.id;
    if (!docId) {
      setExportTarget(null);
      return;
    }
    setExportingDocId(docId);
    try {
      const { blob, filename } = await exportDocument(docId);
      const url = URL.createObjectURL(blob);
      const rawDocName = docToExport.filename || 'document';
      const cleanStem = rawDocName.replace(/\.[^/.]+$/, '').replace(/[\s\t\r\n]+/g, '_');
      const finalDownloadName = filename && filename !== 'STRUCTRA_EXPORT_document.xlsx'
        ? filename
        : `STRUCTRA_EXPORT_${cleanStem}.xlsx`;
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: finalDownloadName,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportTarget(null);
    } catch (err) {
      console.error('Failed to export document:', err);
    } finally {
      setExportingDocId(null);
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

      {/* ════════════════════════════════════════════════════════════════
          DOCUMENT DETAIL / RESULT VIEW (WHEN A CARD IS OPENED)
      ════════════════════════════════════════════════════════════════ */}
      {detailDoc ? (
        <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '24px 28px 48px' }}>
          {detailLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Back Button Skeleton */}
              <button
                type="button"
                onClick={handleBackToLibrary}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 16px', color: 'rgba(255,255,255,0.85)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', width: 'fit-content',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Document Library
              </button>

              {/* Skeleton Result Workspace */}
              <div style={{ display: 'flex', gap: 24, width: '100%', height: 740 }}>
                {/* Left Preview Skeleton */}
                <div style={{
                  flex: '0 0 42%',
                  background: 'rgba(14, 11, 8, 0.75)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 16,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.3)',
                }}>
                  <div className="lib-shimmer" style={{ width: '100%', height: '100%' }} />
                </div>
                {/* Right Details Skeleton */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    height: 48,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.055)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    overflow: 'hidden'
                  }}>
                    <div className="lib-shimmer" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        height: 80,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.055)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        overflow: 'hidden'
                      }}>
                        <div className="lib-shimmer" style={{ width: '100%', height: '100%' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{
                    flex: 1,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.045)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    overflow: 'hidden'
                  }}>
                    <div className="lib-shimmer" style={{ width: '100%', height: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : detailError ? (
            <div style={{ 
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', 
              borderRadius: 16, padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 
            }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Unable to Load Document</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 460, margin: 0 }}>{detailError}</p>
              <button
                type="button"
                onClick={handleBackToLibrary}
                style={{
                  marginTop: 12, padding: '10px 24px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Back to Document Library
              </button>
            </div>
          ) : detailData ? (
            <ExtractionResultWorkspace
              isLibraryMode={true}
              uploadedDocument={detailData.document}
              extractionResult={detailData}
              validationResult={detailData.validation}
              onBack={handleBackToLibrary}
              onSaveToLibrary={handleSaveLibraryDocument}
              onDelete={() => setDeleteTarget(detailData.document || detailDoc)}
              onExport={() => setExportTarget(detailData.document || detailDoc)}
            />
          ) : null}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════
            NORMAL DOCUMENT LIBRARY GRID & LIST VIEW
        ════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>

          {/* PAGE HEADER */}
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

          {/* SUMMARY CARDS */}
          <LibrarySummaryCards
            total={stats.total}
            processed={stats.processed}
            needsReview={stats.needs_review}
            loading={loading}
          />

          {/* TOOLBAR */}
          <LibraryToolbar
            search={search}             onSearchChange={handleSearchChange}
            statusFilter={statusFilter} onStatusChange={handleStatusChange}
            sortBy={sortBy}             onSortChange={handleSortChange}
            viewMode={viewMode}         onViewModeChange={setViewMode}
            onExportAll={handleExportAll}
            onDeleteAll={() => setShowDeleteAllModal(true)}
            exportAllLoading={exportAllLoading}
            deleteAllLoading={deleteAllLoading}
            totalDocs={stats.total}
          />

          {/* MAIN CONTENT AREA */}
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
            {(loading || pageTransitioning) && (
              <div className={viewMode === 'grid' ? 'lib-grid-container' : undefined} style={{ display: viewMode === 'list' ? 'flex' : undefined, flexDirection: viewMode === 'list' ? 'column' : undefined, gap: 14 }}>
                {Array.from({ length: pageSize }).map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}
              </div>
            )}

            {/* True empty library (0 documents overall, no error) */}
            {!loading && !pageTransitioning && !fetchError && stats.total === 0 && (
              <LibraryEmptyState />
            )}

            {/* No results matching current filters/search */}
            {!loading && !pageTransitioning && !fetchError && stats.total > 0 && filteredTotal === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 24px', textAlign: 'center' }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.42)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  No documents match your filters
                </p>
                <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer' }}>
                  Clear filters
                </button>
              </motion.div>
            )}

            {/* Document Grid (4-column desktop) / List */}
            {!loading && !pageTransitioning && pageItems.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-page-${page}-size-${pageSize}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className={viewMode === 'grid' ? 'lib-grid-container' : undefined}
                  style={{
                    display: viewMode === 'list' ? 'flex' : undefined,
                    flexDirection: viewMode === 'list' ? 'column' : undefined,
                    gap: 14,
                  }}
                >
                  {pageItems.map((doc, idx) => (
                    <motion.div
                      key={doc.document_id || doc.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.22,
                        delay: Math.min(idx * 0.035, 0.25),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <DocumentCard
                        doc={doc}
                        viewMode={viewMode}
                        onView={handleView}
                        onDelete={(d) => setDeleteTarget(d)}
                        onDownload={(d) => setExportTarget(d)}
                        isExporting={exportingDocId === (doc.document_id || doc.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* PAGINATION */}
          {!loading && !pageTransitioning && !fetchError && filteredTotal > 0 && (
            <LibraryPagination
              page={page}
              pageSize={pageSize}
              total={filteredTotal}
              hasNext={hasNext}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      )}

      {/* SINGLE DELETE MODAL */}
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

      {/* DELETE ALL MODAL */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <DeleteModal
            doc="ALL"
            count={stats.total}
            loading={deleteAllLoading}
            onConfirm={handleDeleteAllConfirm}
            onCancel={() => { if (!deleteAllLoading) setShowDeleteAllModal(false); }}
          />
        )}
      </AnimatePresence>

      {/* EXPORT CONFIRMATION MODAL */}
      <AnimatePresence>
        {exportTarget && (
          <ExportModal
            doc={exportTarget}
            loading={exportingDocId === (exportTarget?.document_id || exportTarget?.id)}
            onConfirm={handleExportConfirm}
            onCancel={() => { if (!exportingDocId) setExportTarget(null); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
