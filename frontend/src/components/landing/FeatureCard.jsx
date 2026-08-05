/**
 * FeatureCard
 * A single feature item: icon box + title + description
 */
export default function FeatureCard({ icon, title, description }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        flex: 1,
      }}
    >
      {/* Icon box */}
      <div className="feature-icon-box" style={{ marginTop: 2 }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#ffffff',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: '0.01em',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.2,
          }}
        >
          {description}
        </span>
      </div>
    </div>
  );
}
