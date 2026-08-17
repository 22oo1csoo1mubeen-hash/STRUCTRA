/**
 * DashboardStatusBar
 * Bottom status strip inside the main glass container.
 * Shows security note (left) and last-updated timestamp (right).
 */
export default function DashboardStatusBar({ refreshing }) {
  const now = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingTop: 14,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: 4,
      }}
    >
      {/* Left: Security note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          All data is secure, private &amp; encrypted. Only you can see this information.
        </span>
      </div>

      {/* Right: Last updated */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: refreshing ? '#f97316' : '#22c55e',
            boxShadow: refreshing ? '0 0 6px #f97316' : '0 0 6px #22c55e',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.40)',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          {refreshing ? 'Updating…' : `Last updated: ${now}`}
        </span>
      </div>
    </div>
  );
}
