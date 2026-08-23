import { motion } from 'framer-motion';
import { FileText, ShieldCheck, Clock, HardDrive, Lock, ExternalLink } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Format Last Login timestamp
───────────────────────────────────────────────────────────── */
function formatLastLogin(rawTimestamp) {
  if (!rawTimestamp) {
    return {
      primary: 'Active now',
      secondary: 'Current session',
    };
  }

  try {
    const d = new Date(rawTimestamp);
    if (isNaN(d.getTime())) {
      return { primary: 'Active now', secondary: 'Current session' };
    }

    const isToday = new Date().toDateString() === d.toDateString();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

    return {
      primary: isToday ? `Today, ${timeStr}` : timeStr,
      secondary: dateStr,
    };
  } catch {
    return { primary: 'Active now', secondary: 'Current session' };
  }
}

/* ─────────────────────────────────────────────────────────────
   Format Storage Bytes
───────────────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${val.endsWith('.0') ? val.slice(0, -2) : val} ${units[i]}`;
}

export default function QuickOverviewGrid({
  totalDocuments = 0,
  accountStatus = 'Active',
  lastSignInAt = null,
  storageUsedBytes = 0,
  storageLimitBytes = 1073741824,
  onLearnMore = () => {},
}) {
  const lastLogin = formatLastLogin(lastSignInAt);
  const storageUsed = formatBytes(storageUsedBytes);
  const storageTotal = formatBytes(storageLimitBytes);

  const CARDS = [
    {
      id: 'docs',
      label: 'Documents',
      value: String(totalDocuments),
      subtext: totalDocuments === 1 ? '1 document uploaded' : 'Total uploaded',
      valueColor: '#ffffff',
      Icon: FileText,
      iconColor: '#4ade80',
      iconBg: 'rgba(74,222,128,0.12)',
      iconBorder: 'rgba(74,222,128,0.25)',
    },
    {
      id: 'status',
      label: 'Account Status',
      value: accountStatus,
      subtext: accountStatus === 'Active' ? 'All systems operational' : 'Account restricted',
      valueColor: accountStatus === 'Active' ? '#4ade80' : '#f87171',
      Icon: ShieldCheck,
      iconColor: accountStatus === 'Active' ? '#60a5fa' : '#f87171',
      iconBg: accountStatus === 'Active' ? 'rgba(96,165,250,0.12)' : 'rgba(239,68,68,0.12)',
      iconBorder: accountStatus === 'Active' ? 'rgba(96,165,250,0.25)' : 'rgba(239,68,68,0.25)',
    },
    {
      id: 'login',
      label: 'Last Login',
      value: lastLogin.primary,
      subtext: lastLogin.secondary,
      valueColor: '#ffffff',
      Icon: Clock,
      iconColor: '#c084fc',
      iconBg: 'rgba(168,85,247,0.12)',
      iconBorder: 'rgba(168,85,247,0.25)',
    },
    {
      id: 'storage',
      label: 'Storage Used',
      value: storageUsed,
      subtext: `of ${storageTotal}`,
      valueColor: '#ffffff',
      Icon: HardDrive,
      iconColor: '#f97316',
      iconBg: 'rgba(249,115,22,0.12)',
      iconBorder: 'rgba(249,115,22,0.25)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
      style={{
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* ── Section Header ── */}
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '-0.01em',
          }}
        >
          Quick Overview
        </h3>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'rgba(255,255,255,0.48)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          A quick snapshot of your account
        </p>
      </div>

      {/* ── 4 Metric Cards Grid (Strict Single Row) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {CARDS.map((c) => {
          const { Icon } = c;
          return (
            <motion.div
              key={c.id}
              whileHover={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.12)',
                y: -2,
              }}
              transition={{ duration: 0.15 }}
              style={{
                borderRadius: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '14px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                minWidth: 0,
              }}
            >
              {/* Icon Square */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: c.iconBg,
                  border: `1px solid ${c.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                  flexShrink: 0,
                }}
              >
                <Icon size={16} strokeWidth={1.8} color={c.iconColor} />
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 11.5,
                  color: 'rgba(255,255,255,0.50)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.label}
              </span>

              {/* Value */}
              <span
                style={{
                  fontSize: c.id === 'login' ? 14.5 : 19,
                  fontWeight: 700,
                  color: c.valueColor,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  lineHeight: 1.2,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.value}
              </span>

              {/* Subtext */}
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.38)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.subtext}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* ── Security / Privacy Card (Inside Quick Overview Card as shown in reference) ── */}
      <div
        style={{
          borderRadius: 14,
          background: 'rgba(30, 58, 138, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.20)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Lock size={16} strokeWidth={2} color="#60a5fa" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              Your data is secure
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.60)',
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.4,
              }}
            >
              Your documents and conversations are private, encrypted, and accessible only to you.
            </span>
          </div>
        </div>

        <motion.button
          onClick={onLearnMore}
          whileHover={{
            scale: 1.03,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderColor: 'rgba(255,255,255,0.22)',
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.90)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span>Learn More</span>
          <ExternalLink size={12} color="rgba(255,255,255,0.75)" />
        </motion.button>
      </div>
    </motion.div>
  );
}
