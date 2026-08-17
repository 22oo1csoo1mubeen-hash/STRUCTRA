import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardModal, { EyeButton } from './DashboardModal';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * KpiMiniCard
 * Compact transparent glass mini-card with blur, top sheen, and expand modal.
 */
function KpiMiniCard({ kpi, index }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <motion.div
        id={kpi.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: index * 0.03 }}
        whileHover={{
          y: -2,
          borderColor: 'rgba(255, 255, 255, 0.20)',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.085) 0%, rgba(255, 255, 255, 0.035) 100%)',
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 82,
        }}
      >
        {/* Top sheen highlight */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '12%',
            width: '76%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Icon Box */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: kpi.iconBg,
            border: `1px solid ${kpi.iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {kpi.icon}
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.48)',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {kpi.label}
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={typeof kpi.value === 'string' ? kpi.value : undefined}
          >
            {kpi.value}
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.40)',
              fontFamily: "'Inter', system-ui, sans-serif",
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {kpi.subtext}
          </span>
        </div>

        {/* Eye button */}
        <div style={{ flexShrink: 0, alignSelf: 'flex-start', marginTop: -2, marginRight: -2 }}>
          <EyeButton
            id={`${kpi.id}-eye`}
            onClick={() => setModalOpen(true)}
            title={`Expand ${kpi.label}`}
          />
        </div>
      </motion.div>

      {/* Expand modal */}
      <DashboardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={kpi.label}
        subtitle={kpi.modalSubtitle}
        accentColor={kpi.accentColor}
        maxWidth={520}
      >
        {kpi.modalContent}
      </DashboardModal>
    </>
  );
}

/**
 * KpiOverview (Row 1 — 5 Cards)
 * Accommodates Most Expensive Purchase in the first row as requested.
 */
export default function KpiOverview({ summary, highlights, loading, vendorData }) {
  const navigate = useNavigate();
  const dash = loading ? '–' : undefined;

  const totalDocs = summary?.total_documents ?? 0;
  const totalSpent = summary?.total_amount_spent ?? 0;
  const processedDocs = summary?.processed_documents ?? 0;
  const needsReviewDocs = summary?.needs_review_documents ?? 0;

  const expItem = highlights?.most_expensive_item;
  const vendors = vendorData?.vendors || [];

  const vendorsByReceiptCount = [...vendors].sort((a, b) => {
    const countDiff = (b.document_count || 0) - (a.document_count || 0);
    if (countDiff !== 0) return countDiff;
    return (b.total_spent || 0) - (a.total_spent || 0);
  });

  const vendorsBySpend = [...vendors].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));

  const topVendor =
    highlights?.top_vendor ||
    (vendorsByReceiptCount[0]
      ? { name: vendorsByReceiptCount[0].vendor, document_count: vendorsByReceiptCount[0].document_count }
      : null);

  const highestSpendVendor =
    highlights?.highest_spend_vendor ||
    (vendorsBySpend[0]
      ? { name: vendorsBySpend[0].vendor, total_spent: vendorsBySpend[0].total_spent }
      : null);

  const handleOpenDoc = (docId, filename) => {
    if (!docId) return;
    navigate('/app/library', { state: { selectedDocId: docId, filename: filename || 'Document' } });
  };

  const kpis = [
    {
      id: 'kpi-total-docs',
      label: 'TOTAL DOCUMENTS',
      value: dash ?? totalDocs,
      subtext: `${processedDocs} processed • ${needsReviewDocs} review`,
      accentColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconBorder: 'rgba(59, 130, 246, 0.25)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
      modalSubtitle: 'Document processing status breakdown',
      modalContent: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.20)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Processed</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>{processedDocs}</div>
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.40)', marginTop: 2 }}>Ready for insights</div>
          </div>
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              background: 'rgba(249, 115, 22, 0.08)',
              border: '1px solid rgba(249, 115, 22, 0.20)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Needs Review</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>{needsReviewDocs}</div>
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.40)', marginTop: 2 }}>Pending attention</div>
          </div>
        </div>
      ),
    },
    {
      id: 'kpi-total-spent',
      label: 'TOTAL AMOUNT SPENT',
      value: dash ?? formatCurrency(totalSpent),
      subtext: `Across ${totalDocs} receipts`,
      accentColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconBorder: 'rgba(16, 185, 129, 0.25)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
      modalSubtitle: 'Lifetime expenditure overview',
      modalContent: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              padding: '20px',
              borderRadius: 14,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.20)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Total Verified Spend
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>{formatCurrency(totalSpent)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', marginTop: 4 }}>Calculated across all saved receipts</div>
          </div>
        </div>
      ),
    },
    {
      id: 'kpi-top-vendor',
      label: 'TOP VENDOR',
      value: dash ?? (topVendor?.name || 'None yet'),
      subtext: topVendor ? `${topVendor.document_count} receipts` : 'Most frequent vendor',
      accentColor: '#c084fc',
      iconBg: 'rgba(168, 85, 247, 0.12)',
      iconBorder: 'rgba(168, 85, 247, 0.25)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      modalSubtitle: 'Ranked by total receipt count',
      modalContent: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topVendor && (
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 12,
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#c084fc',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  #1 Top Frequent Vendor
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{topVendor.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff' }}>
                  {topVendor.document_count} receipt{topVendor.document_count === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {vendorsByReceiptCount.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255, 255, 255, 0.40)' }}>
                No vendor records found.
              </div>
            ) : (
              vendorsByReceiptCount.map((v, idx) => (
                <div
                  key={v.vendor}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#c084fc' }}>{String(idx + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>{v.vendor}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#c084fc',
                        background: 'rgba(192, 132, 252, 0.12)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        border: '1px solid rgba(192, 132, 252, 0.25)',
                      }}
                    >
                      {v.document_count} receipt{v.document_count === 1 ? '' : 's'}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.50)', fontWeight: 500 }}>
                      {formatCurrency(v.total_spent)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'kpi-highest-spend',
      label: 'HIGHEST SPEND VENDOR',
      value: dash ?? (highestSpendVendor?.name || 'None yet'),
      subtext: highestSpendVendor ? `${formatCurrency(highestSpendVendor.total_spent)} spent` : 'Highest cumulative spend',
      accentColor: '#38bdf8',
      iconBg: 'rgba(56, 189, 248, 0.12)',
      iconBorder: 'rgba(56, 189, 248, 0.25)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      modalSubtitle: 'Ranked by total monetary spend',
      modalContent: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {highestSpendVendor && (
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 12,
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
                  #1 Top Spender
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{highestSpendVendor.name}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff' }}>{formatCurrency(highestSpendVendor.total_spent)}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {vendorsBySpend.map((v, idx) => (
              <div
                key={v.vendor}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>{String(idx + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>{v.vendor}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {v.percentage_of_total !== undefined && (
                    <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.40)' }}>
                      {v.percentage_of_total}%
                    </span>
                  )}
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>{formatCurrency(v.total_spent)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'kpi-most-expensive-item',
      label: 'EXPENSIVE PURCHASE',
      value: dash ?? (expItem ? formatCurrency(expItem.amount) : 'None'),
      subtext: expItem ? `${expItem.name}` : 'No items recorded',
      accentColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconBorder: 'rgba(245, 158, 11, 0.25)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      modalSubtitle: 'Most expensive line-item purchase',
      modalContent: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {expItem ? (
            <div
              style={{
                padding: '20px',
                borderRadius: 14,
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.20)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Most Expensive Purchase
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>{expItem.name}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#ffffff', marginBottom: 12 }}>{formatCurrency(expItem.amount)}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                <span>{expItem.vendor || 'Unknown vendor'} • {expItem.quantity ? `${expItem.quantity} qty` : '1 qty'}</span>
                {expItem.document_id && (
                  <button
                    type="button"
                    onClick={() => handleOpenDoc(expItem.document_id, expItem.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f97316',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    View Document →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No purchase data recorded.</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div
      className="dashboard-row-1"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
      }}
    >
      {kpis.map((kpi, i) => (
        <KpiMiniCard key={kpi.id} kpi={kpi} index={i} />
      ))}
    </div>
  );
}
