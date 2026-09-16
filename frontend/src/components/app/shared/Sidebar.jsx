import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../../assets/structra-logo.png';
import { useAuth } from '../../../hooks/useAuth';

/* ─────────────────────────────────────────────────────────
   SVG Icons — hand-crafted to match the reference exactly.
───────────────────────────────────────────────────────── */
function UploadIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.70)';
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DashboardIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.70)';
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function LibraryIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.70)';
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function AIAssistantIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.70)';
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  const c = active ? '#f97316' : 'rgba(255,255,255,0.70)';
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ─── Nav item data ──────────────────────────────────── */
const primaryNavItems = [
  { id: 'upload-documents', label: 'Upload',           Icon: UploadIcon,      path: '/app/upload' },
  { id: 'dashboard',        label: 'Dashboard',        Icon: DashboardIcon,   path: '/app/dashboard' },
  { id: 'document-library', label: 'Document Library', Icon: LibraryIcon,     path: '/app/library' },
  { id: 'ai-assistant',     label: 'AI Assistant',     Icon: AIAssistantIcon, path: '/app/assistant' },
];

const secondaryNavItems = [
  { id: 'profile', label: 'Profile', Icon: ProfileIcon, path: '/app/profile' },
];

/* ─── Single nav item ────────────────────────────────── */
function NavItem({ item, isActive, onNavigate, collapsed }) {
  const { Icon } = item;
  return (
    <div
      onClick={() => onNavigate(item.path)}
      title={collapsed ? item.label : undefined}
      className={`structra-sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 11,
        width: collapsed ? 44 : '100%',
        height: collapsed ? 44 : 'auto',
        padding: collapsed ? 0 : '9px 12px',
        margin: collapsed ? '0 auto' : 0,
        borderRadius: collapsed ? 12 : 10,
        cursor: 'pointer',
        background: isActive
          ? 'rgba(249, 115, 22, 0.18)'
          : 'transparent',
        border: isActive
          ? '1px solid rgba(249, 115, 22, 0.38)'
          : '1px solid transparent',
        boxShadow: isActive && collapsed
          ? '0 0 14px rgba(249, 115, 22, 0.22), inset 0 0 10px rgba(249, 115, 22, 0.10)'
          : 'none',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, width 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Active left accent bar */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: collapsed ? '22%' : '18%',
            height: collapsed ? '56%' : '64%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: 'linear-gradient(180deg, #ffb347 0%, #f97316 100%)',
            boxShadow: '0 0 8px rgba(249,115,22,0.60)',
          }}
        />
      )}

      {/* Icon — spacious and un-cramped */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: collapsed ? '100%' : 34,
          height: collapsed ? '100%' : 34,
          borderRadius: collapsed ? 12 : 8,
          background: collapsed
            ? 'transparent'
            : (isActive ? 'rgba(249, 115, 22, 0.22)' : 'rgba(255,255,255,0.07)'),
          flexShrink: 0,
          transition: 'background-color 0.15s ease',
        }}
      >
        <Icon active={isActive} />
      </div>

      {/* Label — only rendered when expanded with smooth fade */}
      <span
        style={{
          fontSize: 13.5,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.62)',
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.005em',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          maxWidth: collapsed ? 0 : 160,
          opacity: collapsed ? 0 : 1,
          transition: 'max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
        }}
      >
        {item.label}
      </span>
    </div>
  );
}

/* ─── Divider ────────────────────────────────────────── */
function Divider({ collapsed }) {
  return (
    <div
      style={{
        height: 1,
        background: 'rgba(255,255,255,0.08)',
        margin: collapsed ? '12px auto' : '10px 0',
        width: collapsed ? 36 : '100%',
        transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), margin 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}
    />
  );
}

/* ─── Sidebar ────────────────────────────────────────── */
export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        width: collapsed ? 68 : 215,
        minWidth: collapsed ? 68 : 215,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(32px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset -1px 0 0 rgba(249,115,22,0.08), 4px 0 24px rgba(0,0,0,0.35)',
        padding: collapsed ? '22px 0' : '22px 12px',
        zIndex: 10,
        flexShrink: 0,
        position: 'relative',
        isolation: 'isolate',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), min-width 0.35s cubic-bezier(0.4,0,0.2,1), padding 0.35s cubic-bezier(0.4,0,0.2,1)',
        /* overflow: visible so the edge toggle button can peek out seamlessly */
        overflow: 'visible',
      }}
    >
      <style>{`
        .structra-sidebar-item {
          transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .structra-sidebar-item:hover:not(.active) {
          background-color: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.10) !important;
        }
        .structra-sidebar-item.collapsed:hover:not(.active) {
          background-color: rgba(255, 255, 255, 0.09) !important;
        }
        .structra-logout-item {
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .structra-logout-item:hover {
          background-color: rgba(220, 60, 60, 0.14) !important;
          border-color: rgba(220, 60, 60, 0.28) !important;
        }

        /* ── Transparent glass edge toggle button ── */
        #sidebar-edge-toggle {
          transition:
            right 0.35s cubic-bezier(0.4, 0, 0.2, 1),
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        #sidebar-edge-toggle:hover {
          background: rgba(249, 115, 22, 0.20) !important;
          border-color: rgba(249, 115, 22, 0.50) !important;
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.35), 0 2px 10px rgba(0, 0, 0, 0.40) !important;
          transform: translateY(-50%) scale(1.12) !important;
        }
        #sidebar-edge-toggle:hover .sidebar-toggle-chevron {
          stroke: #ffffff !important;
        }
      `}</style>

      {/* Logo row — perfectly centered when collapsed */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '2px 0 16px 0' : '2px 4px 18px 4px',
          textDecoration: 'none',
          cursor: 'pointer',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <img
          src={logo}
          alt="Structra"
          style={{
            width: 38,
            height: 38,
            objectFit: 'contain',
            flexShrink: 0,
            margin: collapsed ? '0 auto' : 0,
          }}
        />
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "'Rajdhani', 'Inter', system-ui, sans-serif",
            color: '#ffffff',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxWidth: collapsed ? 0 : 160,
            opacity: collapsed ? 0 : 1,
            transition: 'max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
          }}
        >
          STRUCTRA
        </span>
      </Link>

      <Divider collapsed={collapsed} />

      {/* Primary nav — well-spaced with breathable gap when collapsed */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: collapsed ? 8 : 2,
          paddingTop: 6,
          alignItems: collapsed ? 'center' : 'stretch',
          width: '100%',
        }}
      >
        {primaryNavItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            onNavigate={navigate}
            collapsed={collapsed}
            isActive={
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/')
            }
          />
        ))}
      </nav>

      {/* ── Divider container in between AI Assistant and Profile with the toggle button ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Divider collapsed={collapsed} />

        {/* ── Floating Transparent Glass Toggle Button exactly at the horizontal line ── */}
        <button
          id="sidebar-edge-toggle"
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute',
            /* Right edge: in expanded mode (12px aside padding), -25px puts center at border line.
               In collapsed mode (0px aside padding), -13px puts center at border line. */
            right: collapsed ? -13 : -25,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 25,
            width: 26,
            height: 26,
            borderRadius: '50%',
            /* Crystal-clear transparent glass finish */
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            userSelect: 'none',
            outline: 'none',
          }}
        >
          <svg
            className="sidebar-toggle-chevron"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255, 255, 255, 0.78)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.2s ease',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            {/* Default points left (towards collapse) when expanded */}
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Secondary nav */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: collapsed ? 8 : 2,
          alignItems: collapsed ? 'center' : 'stretch',
          width: '100%',
        }}
      >
        {secondaryNavItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            onNavigate={navigate}
            collapsed={collapsed}
            isActive={location.pathname === item.path}
          />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* ── Logout button ─────────────────────────────── */}
      <Divider collapsed={collapsed} />
      <div
        style={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'stretch',
          width: '100%',
          paddingBottom: 4,
        }}
      >
        <button
          id="sidebar-logout-btn"
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="structra-logout-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 11,
            width: collapsed ? 44 : '100%',
            height: collapsed ? 44 : 'auto',
            padding: collapsed ? 0 : '9px 12px',
            margin: collapsed ? '0 auto' : 0,
            borderRadius: collapsed ? 12 : 10,
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid transparent',
            textAlign: 'left',
            userSelect: 'none',
          }}
        >
          {/* Logout icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: collapsed ? '100%' : 34,
              height: collapsed ? '100%' : 34,
              borderRadius: collapsed ? 12 : 8,
              background: collapsed ? 'transparent' : 'rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,100,100,0.78)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 400,
              color: 'rgba(255,120,120,0.80)',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.005em',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              maxWidth: collapsed ? 0 : 160,
              opacity: collapsed ? 0 : 1,
              transition: 'max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
