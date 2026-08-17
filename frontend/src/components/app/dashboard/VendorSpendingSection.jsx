import { motion } from 'framer-motion';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * VendorSpendingSection
 * Ranked list of vendors with proportional spending bars.
 */
export default function VendorSpendingSection({ vendorData, loading }) {
  const vendors = vendorData?.vendors || [];
  const hasVendors = vendors.length > 0;
  const maxVendorSpend = hasVendors ? Math.max(...vendors.map((v) => v.total_spent), 1) : 1;

  return (
    <div
      style={{
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.022) 100%)',
        border: '1px solid rgba(255,255,255,0.11)',
        backdropFilter: 'blur(28px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
        padding: '24px 26px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#38bdf8',
              boxShadow: '0 0 10px #38bdf8',
            }}
          />
          <h2
            style={{
              fontSize: 15.5,
              fontWeight: 700,
              color: '#ffffff',
              margin: 0,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.01em',
            }}
          >
            Spending by Vendor
          </h2>
        </div>
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
          Top {vendors.length}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!hasVendors ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '32px 0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              No vendor spending data yet.
            </span>
          </div>
        ) : (
          vendors.map((item, idx) => {
            const pctOfMax = Math.max((item.total_spent / maxVendorSpend) * 100, 4);
            const rankStr = String(idx + 1).padStart(2, '0');

            return (
              <motion.div
                key={item.vendor}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {/* Top details row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: idx === 0 ? '#f97316' : 'rgba(255,255,255,0.40)',
                        fontFamily: "'Inter', monospace, sans-serif",
                      }}
                    >
                      {rankStr}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.vendor}
                    >
                      {item.vendor}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#ffffff',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {formatCurrency(item.total_spent)}
                  </span>
                </div>

                {/* Progress Bar & Subtext */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pctOfMax}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.05 }}
                      style={{
                        height: '100%',
                        borderRadius: 999,
                        background:
                          idx === 0
                            ? 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)'
                            : idx === 1
                            ? 'linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)'
                            : 'linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 100%)',
                      }}
                    />
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.45)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      minWidth: 95,
                      textAlign: 'right',
                    }}
                  >
                    {item.percentage_of_total}% · {item.document_count} doc{item.document_count === 1 ? '' : 's'}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
