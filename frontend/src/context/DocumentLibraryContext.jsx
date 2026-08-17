import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { listDocuments } from '../api/documents';
import { broadcastDashboardInvalidation } from './DashboardContext';

const DocumentLibraryContext = createContext(null);

export function DocumentLibraryProvider({ children }) {
  // Cached list of documents
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, processed: 0, needs_review: 0 });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState(null);

  // Persistent User Preferences (Page Size, Sort, Status Filter, View Mode)
  const [pageSize, setPageSizeState] = useState(() => {
    try {
      const saved = localStorage.getItem('structra_library_pageSize');
      return saved ? Number(saved) : 6;
    } catch {
      return 6;
    }
  });

  const setPageSize = useCallback((size) => {
    const validSize = Number(size) || 6;
    setPageSizeState(validSize);
    try {
      localStorage.setItem('structra_library_pageSize', String(validSize));
    } catch {
      /* silent */
    }
  }, []);

  const [page, setPage] = useState(1);

  const [sortBy, setSortByState] = useState(() => {
    try {
      return localStorage.getItem('structra_library_sortBy') || 'newest';
    } catch {
      return 'newest';
    }
  });

  const setSortBy = useCallback((sort) => {
    setSortByState(sort);
    try {
      localStorage.setItem('structra_library_sortBy', sort);
    } catch {
      /* silent */
    }
  }, []);

  const [statusFilter, setStatusFilter] = useState('all');

  const [viewMode, setViewModeState] = useState(() => {
    try {
      return localStorage.getItem('structra_library_viewMode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const setViewMode = useCallback((mode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('structra_library_viewMode', mode);
    } catch {
      /* silent */
    }
  }, []);

  /**
   * Transforms a DocumentDetailResponse (returned by saveDocument / updateDocument)
   * into a standardized DocumentListItem suitable for the Library grid/list cards.
   */
  const convertDetailToListItem = (detail) => {
    if (!detail) return null;
    const doc = detail.document || detail;
    const ext = detail.extraction || {};
    const qual = detail.quality || {};

    const overrideLevel = qual.confidence_override;
    const systemLevel = qual.system_confidence_level;
    const effectiveConfLevel = overrideLevel || systemLevel || qual.confidence_level || 'HIGH';
    const effectiveNeedsReview = effectiveConfLevel !== 'HIGH';

    return {
      document_id: doc.id || doc.document_id,
      id: doc.id || doc.document_id,
      filename: doc.filename,
      storage_path: doc.storage_path,
      content_type: doc.content_type,
      size: doc.size || doc.file_size || 1024,
      status: doc.status || 'completed',
      created_at: doc.created_at || new Date().toISOString(),
      processed_at: doc.processed_at || new Date().toISOString(),
      content_hash: doc.content_hash,
      has_extraction: true,
      vendor_name: ext.vendor_company || doc.vendor_name || null,
      total_amount: ext.total !== undefined ? ext.total : (doc.total_amount !== undefined ? doc.total_amount : null),
      document_date: ext.date || doc.document_date || null,
      confidence_level: effectiveConfLevel,
      confidence_score: qual.overall_confidence || qual.system_confidence || 0.85,
      system_confidence_level: systemLevel || qual.confidence_level || 'HIGH',
      confidence_override: overrideLevel || null,
      needs_review: effectiveNeedsReview,
    };
  };

  /**
   * Immediately synchronizes a saved document into the Library state/cache and triggers live dashboard invalidation.
   * Idempotent: Updates in place if exists, prepends if new.
   */
  const updateDocumentLibrary = useCallback((savedDetailOrItem) => {
    if (!savedDetailOrItem) return;
    const item = (savedDetailOrItem.document_id && !savedDetailOrItem.document)
      ? savedDetailOrItem
      : convertDetailToListItem(savedDetailOrItem);

    if (!item || !item.document_id) return;

    setItems((prevItems) => {
      const targetId = item.document_id || item.id;
      const idx = prevItems.findIndex(
        (d) => (d.document_id || d.id) === targetId
      );

      if (idx >= 0) {
        // Replace existing item in-place
        const updated = [...prevItems];
        updated[idx] = { ...updated[idx], ...item };
        return updated;
      }

      // Prepend newly saved document to the beginning of the list
      return [item, ...prevItems];
    });

    setTotal((prevTotal) => prevTotal + 1);

    setStats((prevStats) => {
      const isReview = item.needs_review === true;
      return {
        total: prevStats.total + 1,
        processed: prevStats.processed + (isReview ? 0 : 1),
        needs_review: prevStats.needs_review + (isReview ? 1 : 0),
      };
    });

    setHasLoadedOnce(true);

    // Live Dashboard Invalidation
    broadcastDashboardInvalidation();
  }, []);

  /**
   * Revalidates / fetches documents from server.
   * If isBackground=true, revalidates silently without clearing existing cards.
   */
  const fetchLibraryDocuments = useCallback(async (p = 1, pSize = 6, filters = {}, isBackground = false) => {
    if (!isBackground) {
      setIsRevalidating(true);
    }
    setError(null);

    try {
      const res = await listDocuments(p, pSize, filters);
      setItems(res.items || []);
      setTotal(res.total || 0);
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
      setHasLoadedOnce(true);
      return res;
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
      throw err;
    } finally {
      setIsRevalidating(false);
    }
  }, []);

  /**
   * Removes a document from local cache immediately upon deletion and invalidates dashboard.
   */
  const removeDocumentFromLibrary = useCallback((docId) => {
    setItems((prev) => prev.filter((d) => (d.document_id || d.id) !== docId));
    setTotal((prev) => Math.max(0, prev - 1));
    broadcastDashboardInvalidation();
  }, []);

  /**
   * Clears all documents from local cache and invalidates dashboard.
   */
  const clearLibrary = useCallback(() => {
    setItems([]);
    setTotal(0);
    setStats({ total: 0, processed: 0, needs_review: 0 });
    broadcastDashboardInvalidation();
  }, []);

  return (
    <DocumentLibraryContext.Provider
      value={{
        items,
        total,
        stats,
        hasLoadedOnce,
        isRevalidating,
        error,
        pageSize,
        setPageSize,
        page,
        setPage,
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
        setItems,
        setStats,
      }}
    >
      {children}
    </DocumentLibraryContext.Provider>
  );
}

export function useDocumentLibrary() {
  const ctx = useContext(DocumentLibraryContext);
  if (!ctx) {
    throw new Error('useDocumentLibrary must be used within DocumentLibraryProvider');
  }
  return ctx;
}
