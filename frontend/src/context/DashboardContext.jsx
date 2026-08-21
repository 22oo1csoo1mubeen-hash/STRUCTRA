import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getDashboard,
  getSpendingAnalytics,
  getVendorAnalytics,
  getItemAnalytics,
  getPurchaseHighlights,
  getQualitySummary,
  getReviewQueue,
  getRecentDocuments,
} from '../api/dashboard';

const DashboardContext = createContext(null);

// BroadcastChannel name for lightweight cross-tab synchronization
const SYNC_CHANNEL_NAME = 'structra_dashboard_sync_channel';

/**
 * Standalone invalidation dispatcher for cross-tab or global event emission.
 */
export function broadcastDashboardInvalidation(userId = null) {
  try {
    if (typeof window !== 'undefined') {
      const targetUserId = userId || 'all';

      // 1. Dispatch local DOM custom event immediately
      window.dispatchEvent(
        new CustomEvent('structra:dashboard-invalidated', {
          detail: { userId: targetUserId, timestamp: Date.now() },
        })
      );

      // 2. Broadcast to other browser tabs
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
        bc.postMessage({ type: 'DASHBOARD_INVALIDATED', userId: targetUserId, timestamp: Date.now() });
        bc.close();
      } else {
        // Fallback: localStorage ping for older browsers
        localStorage.setItem(
          'structra_dashboard_sync_ping',
          JSON.stringify({ userId: targetUserId, timestamp: Date.now() })
        );
      }
    }
  } catch (err) {
    console.warn('Dashboard broadcast invalidation warning:', err);
  }
}

function getSmartPeriod(docCount) {
  const count = Number(docCount) || 0;
  if (count <= 5) return 'day';
  if (count <= 15) return 'week';
  if (count <= 40) return 'month';
  return 'year';
}

export function DashboardProvider({ children }) {
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  // Active dashboard data states
  const [dashboardData, setDashboardData] = useState(null);
  const [spendingPeriod, setSpendingPeriodState] = useState('day');
  const [spendingData, setSpendingData] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [itemData, setItemData] = useState(null);
  const [highlightsData, setHighlightsData] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [recentData, setRecentData] = useState(null);

  // Status flags
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [spendingLoading, setSpendingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  // Tracking refs to prevent race conditions & memory leaks
  const activeFetchVersionRef = useRef(0);
  const userSessionIdRef = useRef(currentUserId);
  const currentPeriodRef = useRef(spendingPeriod);
  const userManualPeriodRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Keep period ref in sync
  useEffect(() => {
    currentPeriodRef.current = spendingPeriod;
  }, [spendingPeriod]);

  // Handle user switching / logout
  useEffect(() => {
    if (userSessionIdRef.current !== currentUserId) {
      userSessionIdRef.current = currentUserId;
      userManualPeriodRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Reset all user-specific dashboard data immediately to prevent cross-user leakage
      setDashboardData(null);
      setSpendingData(null);
      setVendorData(null);
      setItemData(null);
      setHighlightsData(null);
      setQualityData(null);
      setReviewData(null);
      setRecentData(null);
      setHasLoadedOnce(false);
      setInitialLoading(true);
      setError(null);
      setIsStale(false);
    }
  }, [currentUserId]);

  /**
   * Coordinated fetch for all 8 dashboard endpoints.
   * Protects against race conditions via activeFetchVersionRef.
   * Preserves last known good state if refresh fails.
   */
  const fetchAllDashboardData = useCallback(
    async (isBackground = false, targetPeriod = null) => {
      if (!currentUserId) return;

      const activePeriod = targetPeriod || currentPeriodRef.current || 'day';
      const fetchVersion = ++activeFetchVersionRef.current;

      if (!isBackground && !hasLoadedOnce) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const [
          dashRes,
          spendingRes,
          vendorRes,
          itemRes,
          highlightsRes,
          qualityRes,
          reviewRes,
          recentRes,
        ] = await Promise.allSettled([
          getDashboard(),
          getSpendingAnalytics(activePeriod),
          getVendorAnalytics(10),
          getItemAnalytics(10),
          getPurchaseHighlights(),
          getQualitySummary(),
          getReviewQueue(10),
          getRecentDocuments(10),
        ]);

        // Discard stale response if a newer fetch was initiated or user changed
        if (fetchVersion !== activeFetchVersionRef.current || userSessionIdRef.current !== currentUserId) {
          return;
        }

        if (dashRes.status === 'fulfilled') {
          const dData = dashRes.value;
          setDashboardData(dData);

          // If user hasn't manually selected a period, auto-adjust period to document count
          if (!userManualPeriodRef.current && !targetPeriod) {
            const totalDocs = dData?.summary?.total_documents ?? 0;
            const smartPeriod = getSmartPeriod(totalDocs);
            if (smartPeriod !== activePeriod) {
              setSpendingPeriodState(smartPeriod);
              currentPeriodRef.current = smartPeriod;
              // Background fetch for the adjusted smart period
              getSpendingAnalytics(smartPeriod)
                .then((sp) => {
                  if (fetchVersion === activeFetchVersionRef.current) {
                    setSpendingData(sp);
                  }
                })
                .catch(() => {});
            }
          }
        }
        if (spendingRes.status === 'fulfilled') setSpendingData(spendingRes.value);
        if (vendorRes.status === 'fulfilled') setVendorData(vendorRes.value);
        if (itemRes.status === 'fulfilled') setItemData(itemRes.value);
        if (highlightsRes.status === 'fulfilled') setHighlightsData(highlightsRes.value);
        if (qualityRes.status === 'fulfilled') setQualityData(qualityRes.value);
        if (reviewRes.status === 'fulfilled') setReviewData(reviewRes.value);
        if (recentRes.status === 'fulfilled') setRecentData(recentRes.value);

        if (dashRes.status === 'rejected') {
          console.warn('Dashboard fetch rejected:', dashRes.reason);
          // Only set user-facing error if we don't already have valid cached data
          if (!hasLoadedOnce) {
            setError(dashRes.reason?.message || 'Failed to retrieve dashboard overview.');
          }
        }

        setHasLoadedOnce(true);
        setIsStale(false);
      } catch (err) {
        console.error('Coordinated dashboard fetch error:', err);
        if (!hasLoadedOnce) {
          setError(err.message || 'An unexpected error occurred while loading dashboard analytics.');
        }
      } finally {
        if (fetchVersion === activeFetchVersionRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentUserId, hasLoadedOnce]
  );

  /**
   * Dedicated spending period changer.
   * Only refetches the spending time-series endpoint for maximum efficiency.
   */
  const setSpendingPeriod = useCallback(
    async (newPeriod) => {
      userManualPeriodRef.current = true;
      if (newPeriod === spendingPeriod) return;
      setSpendingPeriodState(newPeriod);
      currentPeriodRef.current = newPeriod;
      setSpendingLoading(true);

      try {
        const sp = await getSpendingAnalytics(newPeriod);
        setSpendingData(sp);
      } catch (err) {
        console.error('Failed to switch spending period:', err);
      } finally {
        setSpendingLoading(false);
      }
    },
    [spendingPeriod]
  );

  /**
   * Schedule a coalesced revalidation (debounced at 40ms to collapse burst mutations).
   */
  const scheduleCoalescedRevalidation = useCallback(() => {
    setIsStale(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (currentUserId) {
        fetchAllDashboardData(true);
      }
    }, 40);
  }, [currentUserId, fetchAllDashboardData]);

  /**
   * Invalidate dashboard:
   * 1. Broadcasts event across tabs and components.
   * 2. Triggers coalesced background revalidation.
   */
  const invalidateDashboard = useCallback(() => {
    broadcastDashboardInvalidation(currentUserId);
  }, [currentUserId]);

  // Listen for internal or cross-tab invalidation events
  useEffect(() => {
    const matchesUser = (eventUserId) => {
      return (
        !eventUserId ||
        eventUserId === 'all' ||
        eventUserId === 'default' ||
        !currentUserId ||
        eventUserId === currentUserId
      );
    };

    const handleInvalidationEvent = (e) => {
      const eventUserId = e?.detail?.userId;
      if (matchesUser(eventUserId)) {
        scheduleCoalescedRevalidation();
      }
    };

    window.addEventListener('structra:dashboard-invalidated', handleInvalidationEvent);

    let bc = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'DASHBOARD_INVALIDATED') {
          if (matchesUser(msg.data.userId)) {
            scheduleCoalescedRevalidation();
          }
        }
      };
    }

    const handleStorage = (e) => {
      if (e.key === 'structra_dashboard_sync_ping' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (matchesUser(parsed.userId)) {
            scheduleCoalescedRevalidation();
          }
        } catch {
          /* silent */
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('structra:dashboard-invalidated', handleInvalidationEvent);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [currentUserId, scheduleCoalescedRevalidation]);

  const value = useMemo(
    () => ({
      dashboardData,
      spendingPeriod,
      setSpendingPeriod,
      spendingData,
      vendorData,
      itemData,
      highlightsData,
      qualityData,
      reviewData,
      recentData,
      hasLoadedOnce,
      initialLoading,
      refreshing,
      spendingLoading,
      error,
      isStale,
      fetchAllDashboardData,
      invalidateDashboard,
    }),
    [
      dashboardData,
      spendingPeriod,
      setSpendingPeriod,
      spendingData,
      vendorData,
      itemData,
      highlightsData,
      qualityData,
      reviewData,
      recentData,
      hasLoadedOnce,
      initialLoading,
      refreshing,
      spendingLoading,
      error,
      isStale,
      fetchAllDashboardData,
      invalidateDashboard,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return ctx;
}
