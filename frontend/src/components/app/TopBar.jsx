import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, ChevronDown, Search } from 'lucide-react';

/**
 * TopBar
 * Glassmorphism styling matching the main app cards.
 */
export default function TopBar({
  userName = 'Mubeen',
  userPlan = 'Premium Plan',
  notificationCount = 3,
  isScrolled = false,
}) {
  const [searchFocused, setSearchFocused] = useState(false);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <style>{`
        #global-search-input::placeholder {
          color: rgba(255, 240, 220, 0.45);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13.5px;
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
              /* True glassmorphism */
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
        <motion.button
          id="notification-bell"
          aria-label="Notifications"
          whileHover={{ scale: 1.05, boxShadow: '0 0 16px rgba(249,115,22,0.25), inset 0 0 12px rgba(249,115,22,0.15)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '50%',
            /* Glass styling */
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            borderTop: '1px solid rgba(249,115,22,0.4)',
            borderBottom: '1px solid rgba(249,115,22,0.4)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            cursor: 'pointer',
            flexShrink: 0,
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
        </motion.button>

        {/* ── User Profile ──────────────────────────────────── */}
        <motion.button
          id="user-profile-menu"
          aria-label="User menu"
          whileHover={{ scale: 1.02, boxShadow: '0 0 16px rgba(249,115,22,0.25), inset 0 0 12px rgba(249,115,22,0.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '5px 12px 5px 5px',
            borderRadius: 50,
            /* Glass styling */
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            borderTop: '1px solid rgba(249,115,22,0.4)',
            borderBottom: '1px solid rgba(249,115,22,0.4)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            cursor: 'pointer',
            flexShrink: 0,
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

          <ChevronDown size={14} strokeWidth={2.5} color="rgba(255,240,220,0.60)" />
        </motion.button>
      </div>
    </>
  );
}
