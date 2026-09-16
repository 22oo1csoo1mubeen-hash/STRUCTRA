import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, markNotificationsRead } from '../../../api/notifications';

/* ─── Event type icons ─────────────────────────────────────── */
function EventIcon({ type }) {
  const iconStyle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 14,
  };

  if (type === 'document_saved') {
    return (
      <div style={{ ...iconStyle, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.25)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </div>
    );
  }
  if (type === 'document_edited') {
    return (
      <div style={{ ...iconStyle, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>
    );
  }
  if (type === 'document_deleted') {
    return (
      <div style={{ ...iconStyle, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </div>
    );
  }
  if (type === 'document_exported') {
    return (
      <div style={{ ...iconStyle, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
    );
  }
  if (type.startsWith('password') || type === 'sign_in' || type === 'sign_out' || type === 'account_created') {
    return (
      <div style={{ ...iconStyle, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    );
  }
  if (type === 'profile_updated' || type === 'avatar_changed' || type === 'avatar_removed') {
    return (
      <div style={{ ...iconStyle, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    );
  }
  // Generic fallback
  return (
    <div style={{ ...iconStyle, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,220,180,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
  );
}

/* ─── Relative time ────────────────────────────────────────── */
function relativeTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr  / 24);
    if (diffSec < 60)  return 'Just now';
    if (diffMin < 60)  return `${diffMin}m ago`;
    if (diffHr < 24)   return `${diffHr}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7)   return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/* ─── Group label ──────────────────────────────────────────── */
function dayLabel(isoString) {
  if (!isoString) return 'Earlier';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffDay = Math.floor((now - date) / 86400000);
    if (diffDay < 1) return 'Today';
    if (diffDay < 2) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;
    return 'Earlier';
  } catch {
    return 'Earlier';
  }
}

/* ─── Skeleton item ────────────────────────────────────────── */
function SkeletonItem() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '60%', height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginBottom: 6 }} />
        <div style={{ width: '35%', height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}

/* ─── Format notification description ─────────────────────── */
function formatNotificationDesc(item) {
  if (!item?.description) return '';
  const desc = item.description;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidPrefixRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s+was\s+/i;

  if (uuidRegex.test(desc.trim())) {
    return item.event_type === 'document_exported'
      ? 'Document was exported'
      : (item.title || 'Activity recorded');
  }
  if (uuidPrefixRegex.test(desc)) {
    return desc.replace(uuidPrefixRegex, 'Document was ');
  }
  return desc;
}

/* ─── Main panel ───────────────────────────────────────────── */
export default function NotificationPanel({ isOpen, onClose, onUnreadCountChange }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef(null);

  /* Fetch notifications when panel opens */
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getNotifications();
        if (!cancelled) {
          setItems(data?.items ?? []);
          onUnreadCountChange?.(data?.unread_count ?? 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load notifications.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isOpen]);

  /* Close on outside click */
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, onClose]);

  const handleMarkAllRead = useCallback(async () => {
    if (marking) return;
    setMarking(true);
    try {
      await markNotificationsRead();
      setItems((prev) => prev.map((it) => ({ ...it, is_read: true, read_at: new Date().toISOString() })));
      onUnreadCountChange?.(0);
    } catch {
      /* silent */
    } finally {
      setMarking(false);
    }
  }, [marking, onUnreadCountChange]);

  const unreadCount = items.filter((it) => !it.is_read).length;

  /* Group items by day */
  const groups = [];
  for (const item of items) {
    const label = dayLabel(item.created_at);
    const existing = groups.find((g) => g.label === label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          id="notification-panel"
          role="dialog"
          aria-label="Notifications"
          initial={{ opacity: 0, scale: 0.94, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -8 }}
          transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            borderRadius: 16,
            background: 'rgba(12, 6, 2, 0.88)',
            backdropFilter: 'blur(32px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
            border: '1px solid rgba(249,115,22,0.22)',
            boxShadow: '0 16px 50px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04), 0 0 20px rgba(249,115,22,0.08)',
            zIndex: 300,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Scoped custom scrollbar: sleek 4px width */}
          <style>{`
            #notification-panel::-webkit-scrollbar {
              width: 4px;
            }
            #notification-panel::-webkit-scrollbar-track {
              background: transparent;
            }
            #notification-panel::-webkit-scrollbar-thumb {
              background: rgba(249, 115, 22, 0.45);
              border-radius: 9999px;
            }
            #notification-panel::-webkit-scrollbar-thumb:hover {
              background: rgba(249, 115, 22, 0.80);
            }
            #notification-panel {
              scrollbar-width: thin;
              scrollbar-color: rgba(249, 115, 22, 0.45) transparent;
            }
          `}</style>
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              position: 'sticky',
              top: 0,
              background: 'rgba(12, 6, 2, 0.92)',
              backdropFilter: 'blur(20px)',
              zIndex: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'rgba(255,248,238,0.95)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  margin: 0,
                }}
              >
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                disabled={marking}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: marking ? 'default' : 'pointer',
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: marking ? 'rgba(255,170,80,0.40)' : 'rgba(255,170,80,0.75)',
                  fontFamily: "'Inter', sans-serif",
                  padding: 0,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => !marking && (e.currentTarget.style.color = 'rgba(255,170,80,1)')}
                onMouseLeave={(e) => !marking && (e.currentTarget.style.color = 'rgba(255,170,80,0.75)')}
              >
                {marking ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div style={{ padding: '8px 0' }}>
              <SkeletonItem />
              <SkeletonItem />
              <SkeletonItem />
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,120,120,0.75)', fontFamily: "'Inter', sans-serif" }}>
                Could not load notifications.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && items.length === 0 && (
            <div
              style={{
                padding: '36px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                textAlign: 'center',
              }}
            >
              {/* Bell illustration */}
              <div style={{ opacity: 0.45 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,248,238,0.65)', fontFamily: "'Inter', sans-serif", margin: 0 }}>
                No activity yet
              </p>
              <p style={{ fontSize: 12.5, color: 'rgba(255,220,180,0.40)', fontFamily: "'Inter', sans-serif", margin: 0 }}>
                Upload or edit documents to see activity here.
              </p>
            </div>
          )}

          {/* Grouped notification items */}
          {!isLoading && !error && groups.length > 0 && (
            <div style={{ paddingBottom: 8 }}>
              {groups.map((group) => (
                <div key={group.label}>
                  {/* Day divider */}
                  <div
                    style={{
                      padding: '8px 16px 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,200,140,0.45)',
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {group.label}
                  </div>

                  {group.items.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ background: 'rgba(255,255,255,0.05)' }}
                      transition={{ duration: 0.12 }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        position: 'relative',
                      }}
                    >
                      {/* Unread dot */}
                      {!item.is_read && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 14,
                            left: 6,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#f97316',
                            boxShadow: '0 0 6px rgba(249,115,22,0.7)',
                          }}
                        />
                      )}

                      <EventIcon type={item.event_type} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          title={formatNotificationDesc(item)}
                          style={{
                            fontSize: 13,
                            fontWeight: item.is_read ? 400 : 600,
                            color: item.is_read ? 'rgba(255,240,220,0.65)' : 'rgba(255,248,238,0.92)',
                            fontFamily: "'Inter', sans-serif",
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatNotificationDesc(item)}
                        </p>
                        <p
                          style={{
                            fontSize: 11.5,
                            color: 'rgba(255,200,140,0.45)',
                            fontFamily: "'Inter', sans-serif",
                            margin: '2px 0 0',
                          }}
                        >
                          {relativeTime(item.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
