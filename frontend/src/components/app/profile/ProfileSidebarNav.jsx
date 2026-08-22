import { motion } from 'framer-motion';
import { User, FileText, Shield, Trash2 } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Profile Navigation Tabs Configuration
───────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Your profile overview',
    Icon: User,
    color: '#f97316',
    active: true,
  },
  {
    id: 'personal-info',
    title: 'Personal Information',
    subtitle: 'Manage your details',
    Icon: FileText,
    color: 'rgba(255,255,255,0.65)',
    active: false,
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    subtitle: 'Security and login',
    Icon: Shield,
    color: 'rgba(255,255,255,0.65)',
    active: false,
  },
  {
    id: 'danger-zone',
    title: 'Danger Zone',
    subtitle: 'Delete your account',
    Icon: Trash2,
    color: '#ef4444',
    active: false,
  },
];

export default function ProfileSidebarNav({ activeTab = 'profile', onSelectTab = () => {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        width: 290,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: 14,
        boxSizing: 'border-box',
        height: '100%',
        minHeight: '100%',
      }}
    >
      <style>{`
        .profile-nav-tab {
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .profile-nav-tab:hover:not(.active) {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .profile-nav-tab.danger:hover:not(.active) {
          background-color: rgba(239, 68, 68, 0.08) !important;
        }
      `}</style>

      {NAV_ITEMS.map((item) => {
        const isSelected = item.id === activeTab;
        const { Icon } = item;
        const isDanger = item.id === 'danger-zone';

        return (
          <div
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`profile-nav-tab ${isSelected ? 'active' : ''} ${isDanger ? 'danger' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '12px 14px',
              borderRadius: 14,
              cursor: isSelected ? 'default' : 'pointer',
              background: isSelected
                ? isDanger
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(249, 115, 22, 0.12)'
                : 'transparent',
              border: isSelected
                ? isDanger
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid rgba(249, 115, 22, 0.35)'
                : '1px solid transparent',
              position: 'relative',
              overflow: 'hidden',
              userSelect: 'none',
              boxShadow: isSelected
                ? isDanger
                  ? '0 0 20px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 0 20px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.08)'
                : 'none',
            }}
          >
            {/* Active Left Indicator Bar */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '18%',
                  height: '64%',
                  width: 3.5,
                  borderRadius: '0 3px 3px 0',
                  background: isDanger
                    ? 'linear-gradient(180deg, #f87171 0%, #ef4444 100%)'
                    : 'linear-gradient(180deg, #ffb347 0%, #f97316 100%)',
                  boxShadow: isDanger
                    ? '0 0 10px rgba(239,68,68,0.70)'
                    : '0 0 10px rgba(249,115,22,0.70)',
                }}
              />
            )}

            {/* Icon Box */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: isSelected
                  ? isDanger
                    ? 'rgba(239, 68, 68, 0.22)'
                    : 'rgba(249, 115, 22, 0.22)'
                  : isDanger
                  ? 'rgba(239, 68, 68, 0.10)'
                  : 'rgba(255,255,255,0.06)',
                border: isSelected
                  ? isDanger
                    ? '1px solid rgba(239,68,68,0.30)'
                    : '1px solid rgba(249,115,22,0.30)'
                  : isDanger
                  ? '1px solid rgba(239,68,68,0.20)'
                  : '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon
                size={18}
                strokeWidth={1.75}
                color={
                  isDanger
                    ? '#ef4444'
                    : isSelected
                    ? '#f97316'
                    : 'rgba(255,255,255,0.70)'
                }
              />
            </div>

            {/* Text Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected
                    ? '#ffffff'
                    : isDanger
                    ? '#fca5a5'
                    : 'rgba(255,255,255,0.85)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.title}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: isSelected
                    ? 'rgba(255,255,255,0.55)'
                    : 'rgba(255,255,255,0.40)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.subtitle}
              </span>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
