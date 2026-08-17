/**
 * Reusable skeleton blocks with shimmer effect matching the STRUCTRA glass design.
 * Exactly mirrors the 4-row layout of the loaded Dashboard.
 */

export function Shimmer({ style = {} }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 30%, rgba(249, 115, 22, 0.09) 50%, rgba(255, 255, 255, 0.05) 70%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s ease-in-out infinite',
        pointerEvents: 'none',
        borderRadius: 'inherit',
        zIndex: 2,
        ...style,
      }}
    />
  );
}

/**
 * Row 1: 5 mini KPI cards
 */
export function KpiSkeleton() {
  return (
    <div className="dashboard-row-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            minHeight: 82,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.11)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
            position: 'relative',
            overflow: 'hidden',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <Shimmer />
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ width: '48%', height: 9, borderRadius: 3, background: 'rgba(255, 255, 255, 0.12)' }} />
            <div style={{ width: '72%', height: 16, borderRadius: 4, background: 'rgba(255, 255, 255, 0.18)' }} />
            <div style={{ width: '38%', height: 8, borderRadius: 3, background: 'rgba(255, 255, 255, 0.07)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Row 2 (Left): Spending Overview with smooth line chart skeleton
 */
export function SpendingChartSkeleton() {
  return (
    <div
      style={{
        minHeight: 220,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.11)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Shimmer />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />
            <div style={{ width: 130, height: 11, borderRadius: 3, background: 'rgba(255, 255, 255, 0.16)' }} />
          </div>
          <div style={{ width: 170, height: 9, borderRadius: 3, background: 'rgba(255, 255, 255, 0.08)', marginLeft: 12 }} />
        </div>
        {/* Period pills skeleton */}
        <div
          style={{
            width: 175,
            height: 28,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        />
      </div>

      {/* Smooth line wave curve */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
        <svg width="100%" height="100%" viewBox="0 0 600 120" preserveAspectRatio="none" style={{ overflow: 'visible', opacity: 0.35 }}>
          <defs>
            <linearGradient id="skel-wave-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 0,85 Q 120,20 240,65 T 450,25 T 600,75 L 600,120 L 0,120 Z" fill="url(#skel-wave-grad)" />
          <path d="M 0,85 Q 120,20 240,65 T 450,25 T 600,75" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Row 2 (Right): Most Purchased Items skeleton
 */
export function ItemsListSkeleton() {
  return (
    <div
      style={{
        minHeight: 220,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.11)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <Shimmer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06b6d4' }} />
          <div style={{ width: 140, height: 11, borderRadius: 3, background: 'rgba(255, 255, 255, 0.16)' }} />
        </div>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255, 255, 255, 0.06)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            style={{
              height: 42,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.035)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              gap: 10,
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(255, 255, 255, 0.08)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ width: '60%', height: 10, borderRadius: 3, background: 'rgba(255, 255, 255, 0.14)' }} />
              <div style={{ width: '35%', height: 7, borderRadius: 2, background: 'rgba(255, 255, 255, 0.06)' }} />
            </div>
            <div style={{ width: 50, height: 12, borderRadius: 3, background: 'rgba(255, 255, 255, 0.12)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Row 3 (Col 1): Most Expensive Purchase skeleton
 */
export function HighestReceiptSkeleton() {
  return (
    <div
      style={{
        minHeight: 180,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.11)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Shimmer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899' }} />
          <div style={{ width: 130, height: 11, borderRadius: 3, background: 'rgba(255, 255, 255, 0.16)' }} />
        </div>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255, 255, 255, 0.06)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ width: '50%', height: 9, borderRadius: 3, background: 'rgba(255, 255, 255, 0.10)' }} />
          <div style={{ width: '80%', height: 18, borderRadius: 4, background: 'rgba(255, 255, 255, 0.18)' }} />
        </div>
      </div>

      <div style={{ width: '60%', height: 9, borderRadius: 3, background: 'rgba(255, 255, 255, 0.08)' }} />
    </div>
  );
}

/**
 * Row 3 (Col 2): Confidence Donut skeleton
 */
export function ConfidenceSkeleton() {
  return (
    <div
      style={{
        minHeight: 180,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.11)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Shimmer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <div style={{ width: 85, height: 11, borderRadius: 3, background: 'rgba(255, 255, 255, 0.16)' }} />
        </div>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255, 255, 255, 0.06)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '6px 0' }}>
        {/* Donut ring placeholder */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '8px solid rgba(255, 255, 255, 0.09)',
            borderTopColor: 'rgba(16, 185, 129, 0.45)',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        />

        {/* Legend bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.15)' }} />
                <div style={{ width: 38, height: 8, borderRadius: 2, background: 'rgba(255, 255, 255, 0.10)' }} />
              </div>
              <div style={{ width: 22, height: 8, borderRadius: 2, background: 'rgba(255, 255, 255, 0.14)' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '45%', height: 8, borderRadius: 3, background: 'rgba(255, 255, 255, 0.07)' }} />
    </div>
  );
}

/**
 * Row 3 (Col 3): Review Queue skeleton
 */
export function QueueSkeleton() {
  return (
    <div
      style={{
        minHeight: 180,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.11)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <Shimmer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#eab308' }} />
          <div style={{ width: 95, height: 11, borderRadius: 3, background: 'rgba(255, 255, 255, 0.16)' }} />
        </div>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255, 255, 255, 0.06)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            style={{
              height: 32,
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.035)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              gap: 8,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)' }} />
            <div style={{ flex: 1, height: 9, borderRadius: 3, background: 'rgba(255, 255, 255, 0.12)' }} />
            <div style={{ width: 36, height: 8, borderRadius: 2, background: 'rgba(255, 255, 255, 0.09)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Row 3 (Col 4): Recent Documents skeleton
 */
export function RecentDocsSkeleton() {
  return (
    <div
      style={{
        minHeight: 180,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.11)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <Shimmer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6' }} />
          <div style={{ width: 125, height: 11, borderRadius: 3, background: 'rgba(255, 255, 255, 0.16)' }} />
        </div>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255, 255, 255, 0.06)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            style={{
              height: 32,
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.035)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              gap: 8,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)' }} />
            <div style={{ flex: 1, height: 9, borderRadius: 3, background: 'rgba(255, 255, 255, 0.12)' }} />
            <div style={{ width: 36, height: 8, borderRadius: 2, background: 'rgba(255, 255, 255, 0.09)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Row 4: Status bar skeleton
 */
export function StatusBarSkeleton() {
  return (
    <div
      style={{
        height: 38,
        borderRadius: 10,
        background: 'rgba(255, 255, 255, 0.035)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Shimmer />
      <div style={{ width: 160, height: 10, borderRadius: 3, background: 'rgba(255, 255, 255, 0.10)' }} />
      <div style={{ width: 90, height: 10, borderRadius: 3, background: 'rgba(255, 255, 255, 0.10)' }} />
    </div>
  );
}
