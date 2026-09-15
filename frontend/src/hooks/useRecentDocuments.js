import { useState, useEffect, useCallback } from 'react';
import { getRecentDocuments } from '../api/documents';

/**
 * useRecentDocuments
 *
 * Fetches the authenticated user's most recent processed documents (up to 5)
 * from GET /documents/recent.
 *
 * Returns:
 *   uploads   - array of DocumentListItem objects (real data, never mock)
 *   isLoading - true while the first fetch is in progress
 *   error     - error message string if the request failed, otherwise null
 *   refresh   - call this to re-fetch (e.g. after a successful save)
 */
export function useRecentDocuments() {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track fetch attempt number so rapid refreshes don't trample each other
  const [fetchKey, setFetchKey] = useState(0);

  const refresh = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const handleRecentUpdate = () => {
      refresh();
    };
    window.addEventListener('structra:recent-documents-updated', handleRecentUpdate);
    return () => {
      window.removeEventListener('structra:recent-documents-updated', handleRecentUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Only show loading spinner on the very first load
      if (fetchKey === 0) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const data = await getRecentDocuments();
        if (!cancelled) {
          setUploads(data?.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load recent documents.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  return { uploads, isLoading, error, refresh };
}
