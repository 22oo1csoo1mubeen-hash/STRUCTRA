import { motion } from 'framer-motion';

export default function FieldConfidenceIndicator({ fieldDetail }) {
  if (!fieldDetail || typeof fieldDetail.confidence !== 'number') {
    return null;
  }

  const pct = Math.round(fieldDetail.confidence * 100);
  let barColor = '#10b981';
  let bgTrack = 'rgba(16,185,129,0.15)';

  if (pct < 60) {
    barColor = '#f43f5e';
    bgTrack = 'rgba(244,63,94,0.15)';
  } else if (pct < 85) {
    barColor = '#f59e0b';
    bgTrack = 'rgba(245,158,11,0.15)';
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.7)',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '2px 8px',
      }}
      title={`Field Confidence: ${pct}% (${fieldDetail.confidence_level || 'UNKNOWN'})`}
    >
      <div style={{ width: 36, height: 4, borderRadius: 2, background: bgTrack, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: barColor, borderRadius: 2 }}
        />
      </div>
      <span style={{ color: barColor, fontFamily: "'Inter', sans-serif" }}>{pct}%</span>
    </div>
  );
}
