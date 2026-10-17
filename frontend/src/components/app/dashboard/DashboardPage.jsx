import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useDashboard } from '../../../context/DashboardContext';

import DashboardHeader from './DashboardHeader';
import KpiOverview from './KpiOverview';
import SpendingChartSection from './SpendingChartSection';
import MostPurchasedItemsSection from './MostPurchasedItemsSection';
import HighestReceiptSection from './PurchaseInsightsSection';
import DocumentQualitySection from './DocumentQualitySection';
import ReviewQueueSection from './ReviewQueueSection';
import RecentDocumentsSection from './RecentDocumentsSection';
import DashboardEmptyState from './DashboardEmptyState';
import DashboardStatusBar from './DashboardStatusBar';
import DashboardModal from './DashboardModal';
import {
  KpiSkeleton,
  SpendingChartSkeleton,
  ItemsListSkeleton,
  HighestReceiptSkeleton,
  ConfidenceSkeleton,
  QueueSkeleton,
  RecentDocsSkeleton,
  StatusBarSkeleton,
} from './DashboardSkeletons';

const RESPONSIVE_CSS = `
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-row-1 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
body.dashboard-modal-open .dashboard-console .dashboard-kpi-card > div:first-child,
body.dashboard-modal-open .dashboard-console .dashboard-chart-card > div:first-child,
body.dashboard-modal-open .dashboard-console .dashboard-items-card > div:first-child,
body.dashboard-modal-open .dashboard-console .dashboard-summary-card > div:first-child {
  opacity: 0 !important;
}
body.dashboard-modal-open .dashboard-console .dashboard-kpi-card,
body.dashboard-modal-open .dashboard-console .dashboard-chart-card,
body.dashboard-modal-open .dashboard-console .dashboard-items-card,
body.dashboard-modal-open .dashboard-console .dashboard-summary-card {
  transform: none !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%) !important;
  border-color: rgba(255, 255, 255, 0.11) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28) !important;
  filter: none !important;
}
@media (max-width: 1460px) {
  .dashboard-row-1 {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 900px) {
  .dashboard-row-1 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .dashboard-row-1 {
    grid-template-columns: 1fr;
  }
}

.dashboard-row-2 {
  display: grid;
  grid-template-columns: 2.1fr 1fr;
  gap: 12px;
  align-items: stretch;
}
@media (max-width: 1080px) {
  .dashboard-row-2 {
    grid-template-columns: 1fr;
  }
}

.dashboard-row-3 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  align-items: stretch;
}
@media (max-width: 1380px) {
  .dashboard-row-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .dashboard-row-3 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .structra-dashboard-page { padding: 0 12px 88px !important; }
  .dashboard-header { padding: 14px 2px 12px !important; gap: 12px !important; }
  .dashboard-header-copy { width: 100%; }
  .dashboard-header-title-row { flex-wrap: wrap; gap: 8px !important; }
  .dashboard-header-title-row h1 { font-size: 27px !important; }
  .dashboard-header-description { max-width: 42rem; font-size: 12.5px !important; line-height: 1.45; }
  .dashboard-header-actions { width: 100%; gap: 8px !important; }
  .dashboard-date-chip { flex: 1; min-height: 38px; padding: 7px 10px !important; }
  #dashboard-refresh-btn { min-height: 38px; justify-content: center; padding: 7px 12px !important; }
  .dashboard-row-1 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px; }
  .dashboard-row-1 > .dashboard-kpi-card:first-child { grid-column: 1 / -1; }
  .dashboard-row-2, .dashboard-row-3 { gap: 10px; }
  .dashboard-console { padding: 12px !important; gap: 10px !important; border-radius: 16px !important; }
  .dashboard-console, .dashboard-console * { min-width: 0; }
  .dashboard-row-1 > div { min-height: 76px !important; padding: 9px !important; gap: 7px !important; }
  .dashboard-row-1 > div > div:nth-child(2) { width: 30px !important; height: 30px !important; }
  .dashboard-row-1 > div > div:nth-child(2) svg { width: 16px; height: 16px; }
  .dashboard-row-1 > div > div:nth-child(3) > span:nth-child(2) { font-size: 15px !important; }
  .dashboard-chart-card > div:nth-child(2) { flex-wrap: wrap; align-items: center !important; gap: 8px !important; }
  .dashboard-chart-card > div:nth-child(2) > div:first-child { min-width: 0; }
  .dashboard-chart-card > div:nth-child(2) > div:last-child { margin-left: auto; }
  .dashboard-chart-card { min-height: 250px !important; height: auto !important; padding: 13px 12px 10px !important; }
  .dashboard-chart-card .spending-axis-label { font-size: 12px !important; font-weight: 600; fill: rgba(255,255,255,0.62) !important; }
  .dashboard-items-card { min-height: 210px !important; height: auto !important; padding: 13px 12px 10px !important; }
  .dashboard-summary-card { min-height: 148px !important; height: auto !important; padding: 12px !important; }
  .dashboard-status-bar { padding-top: 10px !important; gap: 8px !important; }
  .dashboard-status-bar > div { align-items: flex-start !important; }
  .dashboard-modal-header { padding: 16px !important; }
  .dashboard-modal-body { padding: 14px !important; }
}
@media (max-width: 399px) {
  .dashboard-row-1 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .dashboard-row-1 > div > div:nth-child(2) { width: 26px !important; height: 26px !important; }
  .dashboard-row-1 > div > div:nth-child(3) > span:nth-child(2) { font-size: 13px !important; }
  .dashboard-console { padding: 10px !important; }
  .dashboard-chart-card { min-height: 235px !important; }
  .dashboard-chart-card .spending-axis-label { font-size: 11px !important; }
}
`;

/**
 * Master DashboardPage — Single large transparent glass intelligence console.
 *
 * Layout:
 *   Row 1: 5 KPI Mini-Cards (Total Docs, Total Spend, Top Vendor, Highest Spend Vendor, Expensive Purchase)
 *   Row 2: 2 Columns (Spending Overview [wide] | Most Purchased Items)
 *   Row 3: 4 Columns (Highest Receipt | Confidence Overview | Review Queue | Recent Documents)
 *   Row 4: Dashboard Status Bar
 */
export default function DashboardPage() {
  const {
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
  } = useDashboard();

  const [spendingModalOpen, setSpendingModalOpen] = useState(false);

  useEffect(() => {
    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedOnce || isStale) {
      fetchAllDashboardData(hasLoadedOnce);
    }
  }, [hasLoadedOnce, isStale, fetchAllDashboardData]);

  const totalDocs = dashboardData?.summary?.total_documents ?? 0;
  const isCompletelyEmpty =
    hasLoadedOnce && totalDocs === 0 && (!recentData || recentData.total === 0);

  const highlights = {
    ...(dashboardData?.highlights || {}),
    ...(highlightsData || {}),
  };
  const quality = qualityData || dashboardData?.confidence;

  return (
    <div
      className="structra-dashboard-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '0 clamp(16px, 2vw, 24px) 28px',
      }}
    >
      <style>{RESPONSIVE_CSS}</style>

      {/* Header */}
      <DashboardHeader
        onRefresh={() => fetchAllDashboardData(true)}
        refreshing={refreshing}
      />

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              marginBottom: 16,
              padding: '10px 16px',
              borderRadius: 10,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.28)',
              color: '#fca5a5',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchAllDashboardData(true)}
              style={{
                background: 'rgba(239,68,68,0.20)',
                border: '1px solid rgba(239,68,68,0.40)',
                color: '#ffffff',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {initialLoading && !hasLoadedOnce ? (
        <DashboardSkeleton />
      ) : isCompletelyEmpty ? (
        <DashboardEmptyState />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* ══════════════════════════════════════════════════
              ONE LARGE TRANSPARENT GLASS CONTAINER
          ══════════════════════════════════════════════════ */}
          <div
            className="dashboard-console"
            style={{
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              backdropFilter: 'blur(32px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
              boxShadow:
                '0 0 50px rgba(249, 115, 22, 0.08), ' +
                '0 20px 50px rgba(0, 0, 0, 0.50), ' +
                'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              padding: '18px 20px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top orange glow sheen */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '8%',
                width: '84%',
                height: 1,
                background:
                  'linear-gradient(90deg, transparent, rgba(249,115,22,0.40), rgba(255,255,255,0.25), rgba(249,115,22,0.40), transparent)',
                pointerEvents: 'none',
              }}
            />

            {/* ── ROW 1: 5 KPI Mini-Cards ── */}
            <KpiOverview
              summary={dashboardData?.summary}
              highlights={highlights}
              loading={refreshing}
              vendorData={vendorData}
            />

            {/* ── ROW 2: 2 Columns (Spending Overview [wide] | Most Purchased Items) ── */}
            <div className="dashboard-row-2">
              <SpendingChartSection
                period={spendingPeriod}
                onPeriodChange={setSpendingPeriod}
                spendingData={spendingData}
                loading={spendingLoading}
                onExpand={() => setSpendingModalOpen(true)}
              />

              <MostPurchasedItemsSection
                itemData={itemData}
                loading={refreshing}
              />
            </div>

            {/* ── ROW 3: 4 Columns (Highest Receipt | Confidence Overview | Review Queue | Recent Documents) ── */}
            <div className="dashboard-row-3">
              <HighestReceiptSection
                highlights={highlights}
                loading={refreshing}
              />

              <DocumentQualitySection
                qualityData={quality}
                loading={refreshing}
              />

              <ReviewQueueSection
                reviewData={reviewData}
                loading={refreshing}
              />

              <RecentDocumentsSection
                recentData={recentData}
                loading={refreshing}
              />
            </div>

            {/* ── ROW 4: Status Bar ── */}
            <DashboardStatusBar refreshing={refreshing} />
          </div>
        </motion.div>
      )}

      {/* Spending Overview Modal */}
      <DashboardModal
        isOpen={spendingModalOpen}
        onClose={() => setSpendingModalOpen(false)}
        title="Spending Overview"
        subtitle={`${spendingPeriod.toUpperCase()} period — full chart view`}
        accentColor="#f97316"
        maxWidth={760}
      >
        <SpendingChartSection
          period={spendingPeriod}
          onPeriodChange={setSpendingPeriod}
          spendingData={spendingData}
          loading={spendingLoading}
        />
      </DashboardModal>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="dashboard-console dashboard-skeleton-console"
      style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
        border: '1px solid rgba(249, 115, 22, 0.25)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        boxShadow:
          '0 0 50px rgba(249, 115, 22, 0.08), ' +
          '0 20px 50px rgba(0, 0, 0, 0.50), ' +
          'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        padding: '18px 20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <KpiSkeleton />
      <div className="dashboard-row-2">
        <SpendingChartSkeleton />
        <ItemsListSkeleton />
      </div>
      <div className="dashboard-row-3">
        <HighestReceiptSkeleton />
        <ConfidenceSkeleton />
        <QueueSkeleton />
        <RecentDocsSkeleton />
      </div>
      <StatusBarSkeleton />
    </div>
  );
}
