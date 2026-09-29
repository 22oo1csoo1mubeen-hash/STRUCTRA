import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { listDocuments, deleteDocument, exportDocument } from '../../../api/documents';
import { useDocumentLibrary } from '../../../context/DocumentLibraryContext';
import DocumentCard, { parseDateString } from '../library/DocumentCard';

/* ─── Pre-defined Standard Categories ────────────────────── */
const PRESET_CATEGORIES = [
  {
    id: 'all',
    label: 'All Categories',
    aliases: ['all'],
    color: '#f97316',
    iconBg: 'rgba(249, 115, 22, 0.14)',
    iconBorder: 'rgba(249, 115, 22, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'retail',
    label: 'Retail & Groceries',
    aliases: ['retail & groceries', 'retail & shopping', 'retail', 'groceries', 'supermarket', 'shopping'],
    color: '#ec4899',
    iconBg: 'rgba(236, 72, 153, 0.14)',
    iconBorder: 'rgba(236, 72, 153, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    id: 'dining',
    label: 'Food & Dining',
    aliases: ['meals & dining', 'food & beverage', 'food', 'dining', 'restaurant', 'cafe'],
    color: '#f97316',
    iconBg: 'rgba(249, 115, 22, 0.14)',
    iconBorder: 'rgba(249, 115, 22, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    id: 'travel',
    label: 'Travel & Transport',
    aliases: ['travel & logistics', 'travel & transport', 'travel', 'transport', 'logistics', 'airline', 'fuel'],
    color: '#818cf8',
    iconBg: 'rgba(129, 140, 248, 0.14)',
    iconBorder: 'rgba(129, 140, 248, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
  },
  {
    id: 'tech',
    label: 'Technology & Cloud',
    aliases: ['technology & cloud services', 'technology & cloud', 'software', 'cloud', 'hosting'],
    color: '#22d3ee',
    iconBg: 'rgba(34, 211, 238, 0.14)',
    iconBorder: 'rgba(34, 211, 238, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Medical',
    aliases: ['healthcare & medical', 'healthcare & wellness', 'medical', 'healthcare', 'hospital', 'pharmacy'],
    color: '#f87171',
    iconBg: 'rgba(248, 113, 113, 0.14)',
    iconBorder: 'rgba(248, 113, 113, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: 'office',
    label: 'Office & Supplies',
    aliases: ['office supplies & hardware', 'office & supplies', 'office supplies', 'office'],
    color: '#fbbf24',
    iconBg: 'rgba(251, 191, 36, 0.14)',
    iconBorder: 'rgba(251, 191, 36, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: 'utilities',
    label: 'Utilities & Bills',
    aliases: ['utilities & telecom', 'utilities & communication', 'utilities', 'telecom', 'bills', 'electricity'],
    color: '#4ade80',
    iconBg: 'rgba(74, 222, 128, 0.14)',
    iconBorder: 'rgba(74, 222, 128, 0.32)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
];

/* ─── Match Helper ───────────────────────────────────────── */
function matchesCategory(doc, categoryConfig) {
  if (!categoryConfig || categoryConfig.id === 'all') return true;
  const cat = doc.ml_classification?.category || '';
  if (!cat) return false;
  const lowerCat = cat.toLowerCase().trim();
  return categoryConfig.aliases.some((alias) => lowerCat.includes(alias) || alias.includes(lowerCat));
}

/* ─── Loading Skeleton Card ──────────────────────────────── */
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
        }}
      >
        <div className="lib-shimmer" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ width: 48, height: 50, borderRadius: 9, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ width: '40%', height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.10)' }} />
          <div style={{ width: '22%', height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
        </div>
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
      }}
    >
      <div className="lib-shimmer" style={{ position: 'absolute', inset: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px 10px' }}>
        <div style={{ width: 56, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ width: 72, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div style={{ margin: '0 14px', height: 110, borderRadius: 10, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
        <div style={{ width: '65%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.09)' }} />
        <div style={{ width: '40%', height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}

/* ─── Delete Modal ───────────────────────────────────────── */
function DeleteModal({ doc, loading, onConfirm, onCancel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
        }}
      >
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
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Delete Document?
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 13.5, color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ color: '#ffffff' }}>"{doc?.filename || 'this document'}"</strong>? This will permanently remove the document and its categorized data.
        </p>
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
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
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
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 18px rgba(239,68,68,0.35)',
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ─── Export Modal ───────────────────────────────────────── */
function ExportModal({ doc, loading, onConfirm, onCancel }) {
  if (!doc) return null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
        }}
      >
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
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Export Document?
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 13.5, color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5 }}>
          Generate and download a STRUCTRA Excel report (<span style={{ color: '#f97316', fontWeight: 600 }}>.xlsx</span>) for{' '}
          <strong style={{ color: '#ffffff' }}>"{doc?.filename || 'this document'}"</strong>?
        </p>
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
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
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
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 18px rgba(249,115,22,0.35)',
            }}
          >
            {loading ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ─── Main CategoriesPage Component ──────────────────────── */
export default function CategoriesPage() {
  const navigate = useNavigate();
  const { items: ctxItems, hasLoadedOnce, removeDocumentFromLibrary } = useDocumentLibrary();

  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Modals
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportTarget, setExportTarget] = useState(null);
  const [exportingDocId, setExportingDocId] = useState(null);

  // Search input focus state
  const [searchFocused, setSearchFocused] = useState(false);

  /* Fetch all documents on mount */
  useEffect(() => {
    let isMounted = true;
    async function loadDocs() {
      setLoading(true);
      try {
        const res = await listDocuments(1, 100, {});
        if (isMounted) {
          setAllDocs(res.items || []);
        }
      } catch (err) {
        console.warn('Failed to load documents via API, using context:', err);
        if (isMounted) {
          setAllDocs(ctxItems || []);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDocs();
    return () => { isMounted = false; };
  }, []);

  /* Synchronize with DocumentLibraryContext if new docs added */
  useEffect(() => {
    if (!hasLoadedOnce || ctxItems.length === 0) return;
    setAllDocs((prev) => {
      const merged = [...prev];
      for (const ctxDoc of ctxItems) {
        const id = ctxDoc.document_id || ctxDoc.id;
        const idx = merged.findIndex((d) => (d.document_id || d.id) === id);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...ctxDoc };
        } else {
          merged.unshift(ctxDoc);
        }
      }
      return merged;
    });
  }, [ctxItems, hasLoadedOnce]);

  /* Build full list of category boxes including counts */
  const categoryBoxes = useMemo(() => {
    return PRESET_CATEGORIES.map((catConfig) => {
      const count = allDocs.filter((doc) => matchesCategory(doc, catConfig)).length;
      return {
        ...catConfig,
        count,
      };
    });
  }, [allDocs]);

  /* Currently selected category config */
  const currentCategory = useMemo(() => {
    return categoryBoxes.find((c) => c.id === selectedCatId) || categoryBoxes[0];
  }, [categoryBoxes, selectedCatId]);

  /* Filter and sort documents for display */
  const displayedDocs = useMemo(() => {
    // 1. Filter by category
    let list = allDocs.filter((doc) => matchesCategory(doc, currentCategory));

    // 2. Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((doc) => {
        const fn = (doc.filename || '').toLowerCase();
        const vn = (doc.vendor_name || '').toLowerCase();
        const cat = (doc.ml_classification?.category || '').toLowerCase();
        return fn.includes(q) || vn.includes(q) || cat.includes(q);
      });
    }

    // 3. Sort
    const copy = [...list];
    if (sortBy === 'newest') {
      copy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'oldest') {
      copy.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortBy === 'date_desc') {
      copy.sort((a, b) => {
        const da = parseDateString(a.document_date) || new Date(a.created_at || 0);
        const db = parseDateString(b.document_date) || new Date(b.created_at || 0);
        return db.getTime() - da.getTime();
      });
    } else if (sortBy === 'date_asc') {
      copy.sort((a, b) => {
        const da = parseDateString(a.document_date) || new Date(a.created_at || 0);
        const db = parseDateString(b.document_date) || new Date(b.created_at || 0);
        return da.getTime() - db.getTime();
      });
    } else if (sortBy === 'amount_desc') {
      copy.sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0));
    } else if (sortBy === 'amount_asc') {
      copy.sort((a, b) => (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0));
    }

    return copy;
  }, [allDocs, currentCategory, search, sortBy]);

  /* Handlers */
  const handleView = (doc) => {
    const docId = doc.document_id || doc.id;
    if (!docId) return;
    navigate('/app/library', { state: { selectedDocId: docId } });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const docId = deleteTarget.document_id || deleteTarget.id;
    try {
      removeDocumentFromLibrary(docId);
      setAllDocs((prev) => prev.filter((d) => (d.document_id || d.id) !== docId));
      setDeleteTarget(null);
      await deleteDocument(docId);
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportConfirm = async () => {
    if (!exportTarget) return;
    const docId = exportTarget.document_id || exportTarget.id;
    if (!docId) {
      setExportTarget(null);
      return;
    }
    setExportingDocId(docId);
    try {
      const { blob, filename } = await exportDocument(docId);
      const url = URL.createObjectURL(blob);
      const rawDocName = exportTarget.filename || 'document';
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
        @keyframes cat-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .lib-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: cat-shimmer 1.6s ease-in-out infinite;
        }
        
        .cat-subcards-row-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
        }

        .cat-subcards-row-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
        }

        .lib-grid-container {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 1280px) {
          .lib-grid-container {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 860px) {
          .cat-subcards-row-4,
          .cat-subcards-row-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .lib-grid-container {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 560px) {
          .cat-subcards-row-4,
          .cat-subcards-row-3 {
            grid-template-columns: 1fr;
          }
          .lib-grid-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 40, width: '100%' }}>

        {/* ════════════════════════════════════════════════════════════════
            PAGE HEADER (MATCHING DOCUMENT LIBRARY HEADER)
        ════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px 0' }}>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <p style={{
              margin: '0 0 6px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#f97316',
              fontFamily: "'Inter', system-ui, sans-serif"
            }}>
              Categories
            </p>
            <h1 style={{
              margin: '0 0 8px',
              fontSize: 34,
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.01em',
              lineHeight: 1.12
            }}>
              Document Categories
            </h1>
            <p style={{
              margin: 0,
              fontSize: 14.5,
              color: 'rgba(255,255,255,0.50)',
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.5
            }}>
              Your receipts, invoices, and expenses automatically organized by category.
            </p>
          </motion.div>

          {/* Glowing Stacked Folder Artwork */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: 140,
              height: 96,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {[2, 1, 0].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 64,
                  height: 78,
                  borderRadius: 10,
                  background: i === 0 ? 'rgba(249,115,22,0.22)' : `rgba(255,255,255,${0.04 + i * 0.02})`,
                  border: i === 0 ? '1.5px solid rgba(249,115,22,0.55)' : '1px solid rgba(255,255,255,0.09)',
                  boxShadow: i === 0 ? '0 8px 32px rgba(249,115,22,0.22)' : '0 4px 12px rgba(0,0,0,0.22)',
                  transform: `rotate(${(i - 1) * 8}deg) translate(${(i - 1) * 14}px, ${(i - 1) * -3}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {i === 0 && (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.92)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    <div style={{ width: 28, height: 2, borderRadius: 1, background: 'rgba(249,115,22,0.40)' }} />
                  </>
                )}
              </div>
            ))}
            {[{ top: 4, right: 14, s: 3.5 }, { top: 20, right: 4, s: 2.5 }, { bottom: 10, left: 8, s: 3 }].map((sp, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  width: sp.s,
                  height: sp.s,
                  borderRadius: '50%',
                  background: '#f97316',
                  boxShadow: '0 0 6px rgba(249,115,22,0.7)',
                  top: sp.top,
                  right: sp.right,
                  bottom: sp.bottom,
                  left: sp.left,
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            CATEGORY BOXES (ALL CATEGORIES OCCUPIES FULL LINE + COMPACT SUB-CARDS)
        ════════════════════════════════════════════════════════════════ */}
        <div style={{ padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ALL CATEGORIES - OCCUPIES THE WHOLE ROW / LINE */}
          {(() => {
            const allCat = categoryBoxes.find((c) => c.id === 'all') || categoryBoxes[0];
            const isAllActive = selectedCatId === 'all';
            return (
              <motion.div
                key="all-categories-hero"
                id="category-box-all"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{
                  y: -2,
                  borderColor: isAllActive ? 'rgba(249,115,22,0.65)' : 'rgba(255,255,255,0.22)',
                  boxShadow: isAllActive
                    ? '0 12px 32px rgba(249,115,22,0.28), inset 0 1px 0 rgba(249,115,22,0.30)'
                    : '0 12px 32px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.22)',
                }}
                whileTap={{ scale: 0.995 }}
                onClick={() => setSelectedCatId('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: 16,
                  background: isAllActive
                    ? 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.06) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
                  border: isAllActive
                    ? '1.5px solid rgba(249,115,22,0.55)'
                    : '1px solid rgba(255,255,255,0.11)',
                  backdropFilter: 'blur(28px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
                  boxShadow: isAllActive
                    ? '0 10px 28px rgba(249,115,22,0.22), inset 0 1px 0 rgba(249,115,22,0.35)'
                    : '0 8px 26px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.16)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
                }}
              >
                {/* Top subtle sheen */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '10%',
                    width: '80%',
                    height: 1,
                    background: isAllActive
                      ? 'linear-gradient(90deg, transparent, rgba(249,115,22,0.55), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Left: Icon + Text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 13,
                      background: allCat.iconBg,
                      border: `1px solid ${allCat.iconBorder}`,
                      color: allCat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isAllActive ? `0 0 14px ${allCat.color}40` : 'none',
                    }}
                  >
                    {allCat.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#ffffff',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {allCat.label}
                      </span>
                      {isAllActive && (
                        <span
                          style={{
                            padding: '2px 9px',
                            borderRadius: 6,
                            background: 'rgba(249,115,22,0.20)',
                            border: '1px solid rgba(249,115,22,0.45)',
                            color: '#f97316',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 12.5,
                        color: 'rgba(255,255,255,0.50)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      Complete repository of all classified receipts, invoices, and documents
                    </span>
                  </div>
                </div>

                {/* Right: Big Count & Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: '#ffffff',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                        textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                        display: 'block',
                      }}
                    >
                      {loading ? '–' : allCat.count}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isAllActive ? '#f97316' : 'rgba(255,255,255,0.40)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Total Documents
                    </span>
                  </div>
                  {isAllActive && (
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: '#f97316',
                        boxShadow: '0 0 10px #f97316',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })()}

          {/* SUB-CATEGORY CARDS (ROW 1: 3 CATEGORIES, ROW 2: 4 CATEGORIES - BOTH SPANNING 100% WIDTH) */}
          {(() => {
            const subCategories = categoryBoxes.filter((c) => c.id !== 'all');
            const row1Cats = subCategories.slice(0, 3);
            const row2Cats = subCategories.slice(3);

            const renderCard = (cat, i) => {
              const isActive = selectedCatId === cat.id;
              return (
                <motion.div
                  key={cat.id}
                  id={`category-box-${cat.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{
                    y: -2,
                    borderColor: isActive ? 'rgba(249,115,22,0.65)' : 'rgba(255,255,255,0.22)',
                    boxShadow: isActive
                      ? '0 10px 26px rgba(249,115,22,0.25), inset 0 1px 0 rgba(249,115,22,0.25)'
                      : '0 8px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedCatId(cat.id)}
                  transition={{ duration: 0.16, ease: 'easeOut', delay: Math.min(i * 0.025, 0.15) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 14,
                    minHeight: 66,
                    boxSizing: 'border-box',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.06) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: isActive
                      ? '1.5px solid rgba(249,115,22,0.55)'
                      : '1px solid rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(28px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
                    boxShadow: isActive
                      ? '0 8px 22px rgba(249,115,22,0.20), inset 0 1px 0 rgba(249,115,22,0.30)'
                      : '0 6px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
                  }}
                >
                  {/* Top sheen */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '15%',
                      width: '70%',
                      height: 1,
                      background: isActive
                        ? 'linear-gradient(90deg, transparent, rgba(249,115,22,0.45), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Icon Box */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: cat.iconBg,
                      border: `1px solid ${cat.iconBorder}`,
                      color: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isActive ? `0 0 10px ${cat.color}30` : 'none',
                    }}
                  >
                    <span style={{ display: 'flex', transform: 'scale(0.88)' }}>
                      {cat.icon}
                    </span>
                  </div>

                  {/* Text Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.60)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        letterSpacing: '0.005em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={cat.label}
                    >
                      {cat.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: '#ffffff',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          lineHeight: 1.1,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {loading ? '–' : cat.count}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 400,
                          color: isActive ? 'rgba(249,115,22,0.85)' : 'rgba(255,255,255,0.36)',
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        {cat.count === 1 ? 'doc' : 'docs'}
                      </span>
                    </div>
                  </div>

                  {/* Active selection dot */}
                  {isActive && (
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#f97316',
                        boxShadow: '0 0 7px #f97316',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </motion.div>
              );
            };

            return (
              <>
                {/* Row 1: 3 categories filling the entire row */}
                <div className="cat-subcards-row-3">
                  {row1Cats.map((cat, i) => renderCard(cat, i))}
                </div>

                {/* Row 2: 4 categories filling the entire row */}
                {row2Cats.length > 0 && (
                  <div className="cat-subcards-row-4">
                    {row2Cats.map((cat, i) => renderCard(cat, i + 3))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TOOLBAR (SEARCH, SORT, VIEW MODE TOGGLE)
        ════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            rowGap: 12,
            flexWrap: 'wrap',
            padding: '18px clamp(16px, 2vw, 28px) 0',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '3 1 240px', minWidth: 200 }}>
            <input
              id="category-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={`Search in ${currentCategory.label}...`}
              aria-label="Search documents in category"
              style={{
                width: '100%',
                height: 52,
                padding: '0 48px 0 16px',
                borderRadius: 12,
                background: searchFocused
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.035) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
                border: searchFocused ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.11)',
                backdropFilter: 'blur(28px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
                boxShadow: searchFocused
                  ? '0 6px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20)'
                  : '0 4px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.12)',
                color: 'rgba(255,248,238,0.95)',
                fontSize: 13.5,
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
                caretColor: '#f97316',
                transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
                boxSizing: 'border-box',
              }}
            />
            {/* Search Icon */}
            <div
              style={{
                position: 'absolute',
                right: 15,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: searchFocused ? '#f97316' : 'rgba(255,255,255,0.48)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.18s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* Active Category Indicator / Filter Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              height: 52,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
              border: '1px solid rgba(255,255,255,0.11)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: currentCategory.color,
                boxShadow: `0 0 6px ${currentCategory.color}`,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {currentCategory.label}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {displayedDocs.length}
            </span>

            {selectedCatId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCatId('all')}
                title="Reset to All Categories"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.40)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                  marginLeft: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div style={{ position: 'relative', flex: '1 1 150px', minWidth: 140 }}>
            <select
              id="category-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                height: 52,
                padding: '0 36px 0 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
                border: '1px solid rgba(255,255,255,0.11)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                color: 'rgba(255,248,238,0.95)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="newest" style={{ background: '#120a04' }}>Newest First</option>
              <option value="oldest" style={{ background: '#120a04' }}>Oldest First</option>
              <option value="date_desc" style={{ background: '#120a04' }}>Date: Newest First</option>
              <option value="date_asc" style={{ background: '#120a04' }}>Date: Oldest First</option>
              <option value="amount_desc" style={{ background: '#120a04' }}>Amount High to Low</option>
              <option value="amount_asc" style={{ background: '#120a04' }}>Amount Low to High</option>
            </select>
            {/* Custom chevron */}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* View Mode Toggle — Grid / List */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
            <motion.button
              id="category-grid-view-btn"
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode('grid')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: viewMode === 'grid'
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
                border: viewMode === 'grid' ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.11)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                cursor: 'pointer',
                boxShadow: viewMode === 'grid'
                  ? '0 4px 16px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
                  : '0 4px 14px rgba(0,0,0,0.20)',
                transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'grid' ? '#fff' : 'rgba(255,255,255,0.55)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </motion.button>

            <motion.button
              id="category-list-view-btn"
              type="button"
              aria-label="List view"
              onClick={() => setViewMode('list')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: viewMode === 'list'
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
                border: viewMode === 'list' ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.11)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                cursor: 'pointer',
                boxShadow: viewMode === 'list'
                  ? '0 4px 16px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
                  : '0 4px 14px rgba(0,0,0,0.20)',
                transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'list' ? '#fff' : 'rgba(255,255,255,0.55)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            DOCUMENT GRID / LIST (MATCHING LIBRARY CARDS)
        ════════════════════════════════════════════════════════════════ */}
        <div style={{ padding: '18px 28px 0' }}>
          {/* Loading Skeletons */}
          {loading && (
            <div className={viewMode === 'grid' ? 'lib-grid-container' : undefined} style={{ display: viewMode === 'list' ? 'flex' : undefined, flexDirection: viewMode === 'list' ? 'column' : undefined, gap: 14 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} viewMode={viewMode} />
              ))}
            </div>
          )}

          {/* Empty Category State */}
          {!loading && displayedDocs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 24px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                backdropFilter: 'blur(20px)',
                marginTop: 8,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  background: currentCategory.iconBg,
                  border: `1px solid ${currentCategory.iconBorder}`,
                  color: currentCategory.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {currentCategory.icon}
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {search ? 'No matching documents found' : `No documents in ${currentCategory.label}`}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'rgba(255,255,255,0.50)', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 420, lineHeight: 1.5 }}>
                {search
                  ? `No documents matching "${search}" in this category. Try clearing your search.`
                  : `Upload a receipt or invoice belonging to ${currentCategory.label} to see it organized here.`}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear Search
                  </button>
                )}
                {selectedCatId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCatId('all')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      border: '1px solid rgba(249,115,22,0.45)',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(249,115,22,0.28)',
                    }}
                  >
                    View All Categories
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/app/upload')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Upload Document
                </button>
              </div>
            </motion.div>
          )}

          {/* Document Cards Grid / List */}
          {!loading && displayedDocs.length > 0 && (
            <div
              key={`${viewMode}-${selectedCatId}`}
              className={viewMode === 'grid' ? 'lib-grid-container' : undefined}
              style={{
                display: viewMode === 'list' ? 'flex' : undefined,
                flexDirection: viewMode === 'list' ? 'column' : undefined,
                gap: 14,
              }}
            >
              {displayedDocs.map((doc) => (
                <DocumentCard
                  key={doc.document_id || doc.id}
                  doc={doc}
                  viewMode={viewMode}
                  onView={handleView}
                  onDelete={(d) => setDeleteTarget(d)}
                  onDownload={(d) => setExportTarget(d)}
                  isExporting={exportingDocId === (doc.document_id || doc.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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

      {/* Export Confirmation Modal */}
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
