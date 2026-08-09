import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * TopBar
 * Glassmorphism styling matching the main app cards.
 * userName is derived from the authenticated user's metadata.
 *
 * Changes vs previous version:
 *  - Hover animations: replaced whileHover boxShadow (which conflicts with the
 *    style prop and causes choppy transitions) with CSS transitions on a thin
 *    wrapper <div>. The scale is now a CSS transform so enter AND leave are
 *    perfectly smooth via the same cubic-bezier curve.
 *  - Account menu: clicking the user-profile area opens a small popover that
 *    shows the authenticated user's display name + email and a Logout action.
 *    Closes when clicking outside. Logout calls the existing useAuth().logout()
 *    and redirects to '/'.
 */
export default function TopBar({
  userPlan = 'Premium Plan',
  notificationCount = 3,
  isScrolled = false,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const userEmail = user?.email || '';

  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);

  // Close the account menu when clicking outside of it
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  /* ─── Shared glass button style ─────────────────────────── */
  const glassStyle = {
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(24px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
    borderTop: '1px solid rgba(249,115,22,0.4)',
    borderBottom: '1px solid rgba(249,115,22,0.4)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
  };

  return (
    <>
      <style>{`
        /* Search input placeholder */
        #global-search-input::placeholder {
          color: rgba(255, 240, 220, 0.45);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13.5px;
        }

        /*
         * Smooth hover for the two glass icon buttons.
         * Using CSS transitions instead of Framer whileHover so that
         * both the enter AND leave transitions use the same curve.
         * transform: scale() on the GPU layer — no layout shift, no jank.
         */
        .topbar-icon-btn {
          transition:
            transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow  0.22s ease-out;
          will-change: transform, box-shadow;
        }
        .topbar-icon-btn:hover {
          transform: scale(1.05);
          box-shadow:
            0 0 18px rgba(249,115,22,0.28),
            inset 0 0 14px rgba(249,115,22,0.14),
            0 4px 20px rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .topbar-icon-btn:active {
          transform: scale(0.96);
          transition-duration: 0.10s;
        }

        /* Account popover */
        .account-popover {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 220px;
          border-radius: 14px;
          background: rgba(14, 8, 2, 0.82);
          backdrop-filter: blur(28px) saturate(1.5);
          -webkit-backdrop-filter: blur(28px) saturate(1.5);
          border: 1px solid rgba(249,115,22,0.22);
          box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
          padding: 6px;
          z-index: 200;
          /* Smooth appear/disappear */
          transform-origin: top right;
          animation: popoverIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes popoverIn {
          from { opacity: 0; transform: scale(0.92) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }

        .account-popover-logout {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 9px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: rgba(255, 110, 110, 0.88);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .account-popover-logout:hover {
          background: rgba(220, 60, 60, 0.12);
          color: rgba(255, 140, 140, 1);
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 28px 12px 28px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
          background: isScrolled ? 'rgba(4,2,0,0.45)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px) saturate(1.2)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(20px) saturate(1.2)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(249,115,22,0.15)' : '1px solid transparent',
        }}
      >
        {/* ── Search Bar ───────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            maxWidth: 800,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Search icon */}
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: searchFocused ? '#f97316' : 'rgba(255,240,220,0.55)',
              zIndex: 1,
              transition: 'color 0.2s ease',
            }}
          >
            <Search size={16} strokeWidth={1.8} />
          </div>

          <motion.input
            id="global-search-input"
            type="text"
            placeholder="Search documents, vendors, invoices..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Global search"
            animate={{
              boxShadow: searchFocused
                ? '0 0 20px rgba(249,115,22,0.25), inset 0 0 12px rgba(249,115,22,0.1)'
                : '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              width: '100%',
              height: 44,
              padding: '0 20px 0 42px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(24px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
              borderTop: '1px solid rgba(249,115,22,0.4)',
              borderBottom: '1px solid rgba(249,115,22,0.4)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,248,238,0.95)',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 400,
              outline: 'none',
              caretColor: '#f97316',
              transition: 'border-color 0.18s ease',
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* ── Notification Bell ─────────────────────────────── */}
        <button
          id="notification-bell"
          aria-label="Notifications"
          className="topbar-icon-btn"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '50%',
            cursor: 'pointer',
            flexShrink: 0,
            ...glassStyle,
          }}
        >
          <Bell size={18} strokeWidth={1.8} color="rgba(255,240,220,0.85)" />

          {/* Badge */}
          {notificationCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: '1.5px solid rgba(20,10,5,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9.5,
                fontWeight: 700,
                color: '#fff',
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1,
                padding: '0 3px',
                boxShadow: '0 0 10px rgba(249,115,22,0.6)',
              }}
            >
              {notificationCount}
            </div>
          )}
        </button>

        {/* ── User Profile ──────────────────────────────────── */}
        {/* Wrapper gives us a relative anchor for the popover */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            id="user-profile-menu"
            aria-label="User menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((v) => !v)}
            className="topbar-icon-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 12px 5px 5px',
              borderRadius: 50,
              cursor: 'pointer',
              ...glassStyle,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffb347 0%, #f97316 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                fontFamily: "'Inter', system-ui, sans-serif",
                flexShrink: 0,
                letterSpacing: '0.03em',
                boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
              }}
            >
              {initials}
            </div>

            {/* Name + plan */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'rgba(255,248,238,0.95)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  lineHeight: 1.25,
                }}
              >
                {userName}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: '#ffb347',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  lineHeight: 1.25,
                }}
              >
                {userPlan}
              </span>
            </div>

            <ChevronDown
              size={14}
              strokeWidth={2.5}
              color="rgba(255,240,220,0.60)"
              style={{
                transition: 'transform 0.2s ease',
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* ── Account Popover ──────────────────────── */}
          {menuOpen && (
            <div className="account-popover" role="menu" aria-label="Account menu">
              {/* User info header */}
              <div
                style={{
                  padding: '10px 12px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  marginBottom: 4,
                }}
              >
                {/* Display name (if different from email prefix) */}
                {user?.user_metadata?.full_name && (
                  <p
                    style={{
                      margin: '0 0 2px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'rgba(255,248,238,0.95)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.user_metadata.full_name}
                  </p>
                )}
                {/* Email — always shown */}
                <p
                  style={{
                    margin: 0,
                    fontSize: 11.5,
                    fontWeight: 400,
                    color: 'rgba(255,240,220,0.50)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userEmail}
                </p>
              </div>

              {/* Logout */}
              <button
                id="account-menu-logout"
                className="account-popover-logout"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={14} strokeWidth={2} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
