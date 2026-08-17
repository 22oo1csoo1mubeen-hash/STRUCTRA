import { useState, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeButton } from './DashboardModal';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactCurrency(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${Math.round(val)}`;
}

/**
 * SpendingChartSection
 * Transparent glass styling matching the document library.
 * Points are always chronologically sorted by start_date.
 */
export default function SpendingChartSection({
  period,
  onPeriodChange,
  spendingData,
  loading,
  onExpand,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const gradientId = useId();

  const periods = [
    { id: 'day', label: 'DAY' },
    { id: 'week', label: 'WEEK' },
    { id: 'month', label: 'MONTH' },
    { id: 'year', label: 'YEAR' },
  ];

  const rawPoints = spendingData?.data || [];
  const points = useMemo(() => {
    return [...rawPoints].sort((a, b) => {
      const timeA = a?.start_date ? new Date(a.start_date).getTime() : 0;
      const timeB = b?.start_date ? new Date(b.start_date).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return String(a?.start_date || '').localeCompare(String(b?.start_date || ''));
    });
  }, [rawPoints]);

  const totalSpent = spendingData?.total_spent ?? 0;
  const hasData = points.length > 0;
  const totalReceiptCount = points.reduce((acc, pt) => acc + (pt.document_count || 0), 0);

  // Chart dimensions
  const width = 640;
  const height = 150;
  const padding = { top: 15, right: 20, bottom: 22, left: 42 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxAmount = hasData ? Math.max(...points.map((p) => p.amount || 0), 10) : 100;
  const yMax = maxAmount <= 100 ? 100 : Math.ceil(maxAmount * 1.2 / 100) * 100;

  const getX = (idx) => {
    if (points.length <= 1) return padding.left + chartW / 2;
    return padding.left + (idx / (points.length - 1)) * chartW;
  };

  const getY = (amount) => {
    const clamped = Math.max(0, amount);
    return padding.top + chartH - (clamped / yMax) * chartH;
  };

  // Build SVG path strings
  let pathD = '';
  let areaD = '';

  if (hasData) {
    if (points.length === 1) {
      const cx = getX(0);
      const cy = getY(points[0].amount);
      pathD = `M ${padding.left} ${cy} L ${padding.left + chartW} ${cy}`;
      areaD = `M ${padding.left} ${padding.top + chartH} L ${padding.left} ${cy} L ${padding.left + chartW} ${cy} L ${padding.left + chartW} ${padding.top + chartH} Z`;
    } else {
      pathD = points.reduce((acc, pt, i) => {
        const x = getX(i);
        const y = getY(pt.amount);
        if (i === 0) return `M ${x} ${y}`;
        const prevX = getX(i - 1);
        const prevY = getY(points[i - 1].amount);
        const cp1x = prevX + (x - prevX) / 2;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) / 2;
        const cp2y = y;
        return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
      }, '');

      const firstX = getX(0);
      const lastX = getX(points.length - 1);
      const bottomY = padding.top + chartH;
      areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }
  }

  const yTicks = [yMax, yMax * 0.66, yMax * 0.33, 0];

  return (
    <motion.div
      whileHover={{
        y: -2.5,
        borderColor: 'rgba(255, 255, 255, 0.20)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.085) 0%, rgba(255, 255, 255, 0.035) 100%)',
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.11)',
        backdropFilter: 'blur(28px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
        padding: '16px 20px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        minHeight: 220,
        cursor: 'default',
      }}
    >
      {/* Top sheen highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          width: '80%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 8px #f97316',
              }}
            />
            <h2
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Spending Overview
            </h2>
          </div>
          <p
            style={{
              fontSize: 11.5,
              color: 'rgba(255, 255, 255, 0.45)',
              margin: '2px 0 0 14px',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Total for selected period:{' '}
            <strong style={{ color: '#ffffff', fontWeight: 700 }}>
              {loading ? '–' : formatCurrency(totalSpent)}
            </strong>
            {!loading && totalReceiptCount > 0 && (
              <span style={{ color: 'rgba(255, 255, 255, 0.40)' }}>
                {' '}• {totalReceiptCount} receipt{totalReceiptCount === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '2px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {periods.map((p) => {
              const isSelected = period === p.id;
              return (
                <button
                  key={p.id}
                  id={`period-btn-${p.id}`}
                  type="button"
                  onClick={() => onPeriodChange(p.id)}
                  disabled={loading && isSelected}
                  style={{
                    position: 'relative',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.32) 0%, rgba(234, 88, 12, 0.42) 100%)'
                      : 'transparent',
                    color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                    fontSize: 10.5,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.04em',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    boxShadow: isSelected ? '0 0 10px rgba(249, 115, 22, 0.30), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {onExpand && (
            <EyeButton id="spending-eye-btn" onClick={onExpand} title="Expand Spending Overview" />
          )}
        </div>
      </div>

      {/* Chart SVG */}
      <div
        style={{
          width: '100%',
          flex: 1,
          minHeight: 140,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '2px solid rgba(249,115,22,0.25)',
                borderTopColor: '#f97316',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>Loading analytics…</span>
          </div>
        ) : !hasData ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>No spending data for this period</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.30" />
                <stop offset="65%" stopColor="#f97316" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines */}
            {yTicks.map((val, idx) => {
              const yPos = getY(val);
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={padding.left + chartW}
                    y2={yPos}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray={val === 0 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 6}
                    y={yPos + 3.5}
                    textAnchor="end"
                    fill="rgba(255, 255, 255, 0.32)"
                    fontSize="9"
                    fontFamily="'Inter', system-ui, sans-serif"
                    fontWeight="500"
                  >
                    {formatCompactCurrency(val)}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <motion.path
              d={areaD}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />

            {/* Line Stroke */}
            <motion.path
              d={pathD}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ filter: 'drop-shadow(0 2px 6px rgba(249, 115, 22, 0.45))' }}
            />

            {/* X Axis Labels */}
            {points.map((pt, i) => {
              const showLabel =
                points.length <= 8 ||
                i === 0 ||
                i === points.length - 1 ||
                i % Math.ceil(points.length / 5) === 0;
              if (!showLabel) return null;
              const x = getX(i);
              return (
                <text
                  key={i}
                  x={x}
                  y={padding.top + chartH + 14}
                  textAnchor="middle"
                  fill="rgba(255, 255, 255, 0.40)"
                  fontSize="9"
                  fontFamily="'Inter', system-ui, sans-serif"
                >
                  {pt.label}
                </text>
              );
            })}

            {/* Interactive Hover overlay */}
            {points.map((pt, i) => {
              const x = getX(i);
              const y = getY(pt.amount);
              const isHovered = hoveredIndex === i;

              return (
                <g key={i}>
                  <rect
                    x={x - (chartW / points.length) / 2}
                    y={padding.top}
                    width={chartW / points.length}
                    height={chartH}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5 : 3}
                    fill={isHovered ? '#ffffff' : '#f97316'}
                    stroke="#f97316"
                    strokeWidth={isHovered ? 2 : 1}
                    style={{ transition: 'all 0.15s ease' }}
                    pointerEvents="none"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Floating Tooltip */}
        <AnimatePresence>
          {hoveredIndex !== null && points[hoveredIndex] && (
            <motion.div
              initial={{ opacity: 0, y: 3, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'absolute',
                top: Math.max(8, getY(points[hoveredIndex].amount) - 45),
                left: Math.min(Math.max(getX(hoveredIndex) - 50, 8), width - 115),
                pointerEvents: 'none',
                zIndex: 10,
                padding: '5px 8px',
                borderRadius: 7,
                background: 'rgba(15, 12, 10, 0.94)',
                border: '1px solid rgba(249, 115, 22, 0.45)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6), 0 0 10px rgba(249, 115, 22, 0.20)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                minWidth: 90,
              }}
            >
              <span style={{ fontSize: 9.5, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
                {points[hoveredIndex].label}
              </span>
              <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 800 }}>
                {formatCurrency(points[hoveredIndex].amount)}
              </span>
              {points[hoveredIndex].document_count !== undefined && (
                <span style={{ fontSize: 9.5, color: '#f97316', fontWeight: 600 }}>
                  {points[hoveredIndex].document_count} receipt{points[hoveredIndex].document_count === 1 ? '' : 's'}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
