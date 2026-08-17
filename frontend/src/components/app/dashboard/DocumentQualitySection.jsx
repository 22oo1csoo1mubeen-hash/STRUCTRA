import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardModal, { EyeButton } from './DashboardModal';

/**
 * Donut chart for confidence breakdown.
 * Supports small (card) and large (expanded modal) sizes.
 */
function DonutChart({ high = 0, medium = 0, low = 0, total = 0, size = 'small' }) {
  const isLarge = size === 'large';
  const radius = isLarge ? 70 : 38;
  const stroke = isLarge ? 16 : 9.5;
  const cx = isLarge ? 90 : 48;
  const cy = isLarge ? 90 : 48;
  const svgSize = isLarge ? 180 : 96;
  const circumference = 2 * Math.PI * radius;

  const safeTotal = total > 0 ? total : 1;
  const highPct = high / safeTotal;
  const medPct = medium / safeTotal;
  const lowPct = low / safeTotal;

  const gap = isLarge ? 5 : 3;
  const gapAngle = (gap / circumference) * 360;

  const highLen = circumference * highPct - gap;
  const medLen = circumference * medPct - gap;
  const lowLen = circumference * lowPct - gap;

  const highStart = -90;
  const medStart = highStart + highPct * 360 + gapAngle;
  const lowStart = medStart + medPct * 360 + gapAngle;

  const toRot = (deg) => `rotate(${deg}, ${cx}, ${cy})`;

  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ overflow: 'visible' }}>
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.06)"
        strokeWidth={stroke}
      />

      {/* HIGH segment (green) */}
      {high > 0 && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(highLen, 0)} ${circumference}`}
          transform={toRot(highStart)}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${Math.max(highLen, 0)} ${circumference}` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ filter: isLarge ? 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.6))' : 'drop-shadow(0 0 7px rgba(34, 197, 94, 0.55))' }}
        />
      )}

      {/* MEDIUM segment (yellow) */}
      {medium > 0 && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#eab308"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(medLen, 0)} ${circumference}`}
          transform={toRot(medStart)}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${Math.max(medLen, 0)} ${circumference}` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          style={{ filter: isLarge ? 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.5))' : 'drop-shadow(0 0 7px rgba(234, 179, 8, 0.45))' }}
        />
      )}

      {/* LOW segment (red) */}
      {low > 0 && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#ef4444"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(lowLen, 0)} ${circumference}`}
          transform={toRot(lowStart)}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${Math.max(lowLen, 0)} ${circumference}` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          style={{ filter: isLarge ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' : 'drop-shadow(0 0 7px rgba(239, 68, 68, 0.45))' }}
        />
      )}

      {/* Center text */}
      <text
        x={cx}
        y={isLarge ? cy - 2 : cy - 2}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={isLarge ? '36' : '18'}
        fontWeight="800"
        fontFamily="'Inter', system-ui, sans-serif"
      >
        {total}
      </text>
      <text
        x={cx}
        y={isLarge ? cy + 22 : cy + 13}
        textAnchor="middle"
        fill="rgba(255, 255, 255, 0.45)"
        fontSize={isLarge ? '13' : '9'}
        fontWeight="600"
        fontFamily="'Inter', system-ui, sans-serif"
        letterSpacing="0.04em"
      >
        Total Docs
      </text>
    </svg>
  );
}

/**
 * DocumentQualitySection (Row 3, Column 2)
 * Transparent glass styling with hover animation and enlarged modal ring.
 */
export default function DocumentQualitySection({ qualityData, loading }) {
  const [modalOpen, setModalOpen] = useState(false);

  const dist = qualityData?.distribution || { high: 0, medium: 0, low: 0 };
  const total = (dist.high || 0) + (dist.medium || 0) + (dist.low || 0);
  const reviewCount = qualityData?.review_count ?? 0;

  const highPct = total > 0 ? (((dist.high || 0) / total) * 100).toFixed(1) : '0.0';
  const medPct = total > 0 ? (((dist.medium || 0) / total) * 100).toFixed(1) : '0.0';
  const lowPct = total > 0 ? (((dist.low || 0) / total) * 100).toFixed(1) : '0.0';

  const legendItems = [
    { label: 'HIGH', count: dist.high ?? 0, pct: highPct, color: '#22c55e', textColor: '#4ade80' },
    { label: 'MEDIUM', count: dist.medium ?? 0, pct: medPct, color: '#eab308', textColor: '#fde047' },
    { label: 'LOW', count: dist.low ?? 0, pct: lowPct, color: '#ef4444', textColor: '#f87171' },
  ];

  return (
    <>
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
          padding: '14px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          minHeight: 180,
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

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
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
                fontSize: 12,
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Confidence
            </h2>
          </div>
          <EyeButton
            id="confidence-eye"
            onClick={() => setModalOpen(true)}
            title="Expand confidence"
          />
        </div>

        {/* Center: Donut + Legend pushed right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', flex: 1 }}>
          <div style={{ flexShrink: 0 }}>
            <DonutChart high={dist.high || 0} medium={dist.medium || 0} low={dist.low || 0} total={total} size="small" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 4 }}>
            {legendItems.map((item) => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: item.textColor, letterSpacing: '0.03em' }}>
                    {item.label}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.70)', paddingLeft: 10, fontWeight: 500 }}>
                  {item.count} ({item.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom text */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 6, marginTop: 2 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: reviewCount > 0 ? '#f97316' : '#4ade80',
            }}
          >
            {reviewCount > 0
              ? `${reviewCount} document${reviewCount === 1 ? '' : 's'} need${reviewCount === 1 ? 's' : ''} review`
              : 'All documents verified'}
          </span>
        </div>
      </motion.div>

      {/* Modal with Large Impressive Ring */}
      <DashboardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confidence"
        subtitle={`${total} documents evaluated across library`}
        accentColor="#f97316"
        maxWidth={540}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Large Ring Visualization */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 0 16px',
            }}
          >
            <DonutChart high={dist.high || 0} medium={dist.medium || 0} low={dist.low || 0} total={total} size="large" />
          </div>

          {/* Detailed 3-column Breakdown cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {legendItems.map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '14px 12px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: item.textColor, letterSpacing: '0.04em' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginTop: 2 }}>{item.count}</span>
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>{item.pct}% of total</span>
              </div>
            ))}
          </div>

          {/* Context footer note */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: reviewCount > 0 ? 'rgba(249, 115, 22, 0.08)' : 'rgba(34, 197, 94, 0.08)',
              border: reviewCount > 0 ? '1px solid rgba(249, 115, 22, 0.22)' : '1px solid rgba(34, 197, 94, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.70)' }}>
              {reviewCount > 0 ? `${reviewCount} document(s) flagged for manual verification` : 'All documents meet high confidence threshold'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: reviewCount > 0 ? '#f97316' : '#4ade80' }}>
              {reviewCount > 0 ? 'Action Required' : 'Optimal'}
            </span>
          </div>
        </div>
      </DashboardModal>
    </>
  );
}
