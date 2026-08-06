import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/structra-logo.png';

/* ─────────────────────────────────────────────────────────
   SVG Icons — hand-crafted to match the reference exactly.
   Lucide icons were rendering too small/different from ref.
───────────────────────────────────────────────────────── */
function UploadIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.65)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DashboardIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.65)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function LibraryIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.65)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function AIAssistantIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.65)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  );
}

function SettingsIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.65)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.65)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ─── Nav item data ──────────────────────────────────── */
const primaryNavItems = [
  { id: 'upload-documents', label: 'Upload Documents', Icon: UploadIcon,   path: '/app/upload' },
  { id: 'dashboard',        label: 'Dashboard',        Icon: DashboardIcon, path: '/app/dashboard' },
  { id: 'document-library', label: 'Document Library', Icon: LibraryIcon,   path: '/app/library' },
  { id: 'ai-assistant',     label: 'AI Assistant',     Icon: AIAssistantIcon, path: '/app/assistant' },
];

const secondaryNavItems = [
  { id: 'settings', label: 'Settings', Icon: SettingsIcon, path: '/app/settings' },
  { id: 'profile',  label: 'Profile',  Icon: ProfileIcon,  path: '/app/profile' },
];

/* ─── Single nav item ────────────────────────────────── */
function NavItem({ item, isActive }) {
  const { Icon } = item;
  return (
    <Link to={item.path} style={{ textDecoration: 'none' }}>
      <motion.div
        whileHover={
          !isActive
            ? { backgroundColor: 'rgba(255,255,255,0.07)', x: 1 }
            : {}
        }
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '9px 12px',
          borderRadius: 10,
          cursor: 'pointer',
          background: isActive
            ? 'rgba(249, 115, 22, 0.20)'
            : 'transparent',
          border: isActive
            ? '1px solid rgba(249, 115, 22, 0.30)'
            : '1px solid transparent',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Active left accent bar */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '18%',
              height: '64%',
              width: 3,
              borderRadius: '0 3px 3px 0',
              background: 'linear-gradient(180deg, #ffb347 0%, #f97316 100%)',
              boxShadow: '0 0 8px rgba(249,115,22,0.60)',
            }}
          />
        )}

        {/* Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 8,
            background: isActive
              ? 'rgba(249, 115, 22, 0.22)'
              : 'rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}
        >
          <Icon active={isActive} />
        </div>

        {/* Label */}
        <span
          style={{
            fontSize: 13.5,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? '#ffffff' : 'rgba(255,255,255,0.62)',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.005em',
            userSelect: 'none',
          }}
        >
          {item.label}
        </span>
      </motion.div>
    </Link>
  );
}

/* ─── Divider ────────────────────────────────────────── */
function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'rgba(255,255,255,0.10)',
        margin: '10px 0',
      }}
    />
  );
}

/* ─── Sidebar ────────────────────────────────────────── */
export default function Sidebar() {
  const location = useLocation();

  return (
    <aside
      style={{
        width: 215,
        minWidth: 215,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        /* Clearer glass background to show main page image */
        background: 'rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(32px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        /* Subtle orange warmth on the right edge matching the bg glow */
        boxShadow: 'inset -1px 0 0 rgba(249,115,22,0.08), 4px 0 24px rgba(0,0,0,0.35)',
        padding: '22px 12px',
        zIndex: 10,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Logo row */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '2px 4px 18px 4px',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <img
          src={logo}
          alt="Structra"
          style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "'Rajdhani', 'Inter', system-ui, sans-serif",
            color: '#ffffff',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          STRUCTRA
        </span>
      </Link>

      <Divider />

      {/* Primary nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 8 }}>
        {primaryNavItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/')
            }
          />
        ))}
      </nav>

      <Divider />

      {/* Secondary nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {secondaryNavItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={location.pathname === item.path}
          />
        ))}
      </nav>

      <div style={{ flex: 1 }} />
    </aside>
  );
}
