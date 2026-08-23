import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Settings,
  History,
  Info,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { deleteAccount } from '../../../api/profile';

// Unified STRUCTRA glassmorphism card style
const glassCardStyle = {
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
};

export default function DangerZoneCard() {
  const { logout } = useAuth();

  // Controlled confirmation input state
  const [deleteInput, setDeleteInput] = useState('');
  const isDeleteReady = deleteInput.trim() === 'DELETE';

  // Deletion operation state
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Safe confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-scroll to top and lock scroll when modal is open
  useEffect(() => {
    if (showConfirmModal) {
      const scrollEl = document.getElementById('app-scroll-area');
      if (scrollEl) {
        scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        const prevOverflow = scrollEl.style.overflowY;
        scrollEl.style.overflowY = 'hidden';
        return () => {
          scrollEl.style.overflowY = prevOverflow;
        };
      }
    }
  }, [showConfirmModal]);

  /**
   * Execute permanent account deletion across DB, Storage, and Auth.
   */
  const handlePermanentDeletion = async () => {
    if (!isDeleteReady || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      // 1. Call secure backend endpoint to cascade-delete all user data and auth user
      await deleteAccount('DELETE');

      // 2. Clear local auth context and Supabase sessions
      try {
        await logout?.();
      } catch {
        /* Ignore signout errors if auth user was already dropped */
      }

      // 3. Clear local & session cache
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }

      // 4. Redirect to landing page
      window.location.href = '/';
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
      setShowConfirmModal(false);
    }
  };

  /**
   * Standard sign out without deleting any user data.
   */
  const handleSignOutInstead = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout?.();
      window.location.href = '/login';
    } catch {
      setIsSigningOut(false);
    }
  };

  const DATA_PILLS = [
    { id: 'docs', line1: 'Uploaded', line2: 'Documents', Icon: FileText },
    { id: 'extract', line1: 'Extracted', line2: 'Information', Icon: FileSpreadsheet },
    { id: 'ai', line1: 'AI', line2: 'Conversations', Icon: MessageSquare },
    { id: 'settings', line1: 'Account', line2: 'Settings', Icon: Settings },
    { id: 'history', line1: 'Usage', line2: 'History', Icon: History },
  ];

  // Translucent glowing backdrop touching the left sidebar
  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    left: typeof window !== 'undefined' && window.innerWidth > 768 ? 215 : 0,
    right: 0,
    bottom: 0,
    width: typeof window !== 'undefined' && window.innerWidth > 768 ? 'calc(100vw - 215px)' : '100vw',
    height: '100vh',
    background:
      'radial-gradient(ellipse at 50% 45%, rgba(239, 68, 68, 0.10) 0%, rgba(6, 4, 10, 0.45) 60%, rgba(4, 2, 8, 0.58) 100%)',
    backdropFilter: 'blur(16px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        width: '100%',
        position: 'relative',
      }}
    >
      {/* ── CARD 1: Delete Your Account Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        style={{
          ...glassCardStyle,
          border: '1px solid rgba(239,68,68,0.18)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Top Hero Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Circular Glowing Red Trash Badge */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.06) 100%)',
              border: '1.5px solid rgba(239,68,68,0.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(239,68,68,0.25)',
              flexShrink: 0,
            }}
          >
            <Trash2 size={24} color="#ef4444" strokeWidth={1.75} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              Delete Your Account
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.70)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              This action is permanent and cannot be undone.
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              All your data will be permanently deleted, including:
            </p>
          </div>
        </div>

        {/* 5 Data Category Items — Row with Vertical Dividers Matching Reference */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 6,
            width: '100%',
          }}
        >
          {DATA_PILLS.map((item, index) => {
            const { Icon } = item;
            const isLast = index === DATA_PILLS.length - 1;
            const isFirst = index === 0;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flex: 1,
                  minWidth: 0,
                  padding: isFirst
                    ? '0 16px 0 0'
                    : isLast
                    ? '0 0 0 16px'
                    : '0 16px',
                  borderRight: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <Icon size={20} color="#ef4444" strokeWidth={1.6} style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.80)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.line1}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.80)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.line2}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Error Banner ── */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#fca5a5',
              fontSize: 13,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CARD 2: Delete Account Confirmation & Action ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, delay: 0.06, ease: 'easeOut' }}
        style={{
          ...glassCardStyle,
          border: '1px solid rgba(239,68,68,0.20)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: '#ef4444',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Delete Account
          </h2>
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            To continue, please type DELETE in the box below to confirm.
          </p>
        </div>

        {/* Input + Action Button */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            disabled={isDeleting}
            placeholder="Type DELETE to confirm"
            style={{
              flex: 1,
              minWidth: 220,
              height: 44,
              borderRadius: 10,
              background: 'rgba(15,15,20,0.60)',
              border: isDeleteReady
                ? '1px solid rgba(239,68,68,0.60)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease',
              boxSizing: 'border-box',
              opacity: isDeleting ? 0.6 : 1,
            }}
          />

          <motion.button
            onClick={() => setShowConfirmModal(true)}
            disabled={!isDeleteReady || isDeleting}
            whileHover={isDeleteReady && !isDeleting ? { scale: 1.02, boxShadow: '0 6px 20px rgba(239,68,68,0.45)' } : {}}
            whileTap={isDeleteReady && !isDeleting ? { scale: 0.98 } : {}}
            style={{
              height: 44,
              padding: '0 24px',
              borderRadius: 10,
              background: isDeleteReady
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'rgba(239,68,68,0.12)',
              border: isDeleteReady ? 'none' : '1px solid rgba(239,68,68,0.25)',
              color: isDeleteReady ? '#ffffff' : 'rgba(255,255,255,0.35)',
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: isDeleteReady && !isDeleting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxShadow: isDeleteReady ? '0 4px 16px rgba(239,68,68,0.35)' : 'none',
              opacity: isDeleting ? 0.7 : 1,
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Deleting Account...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} color={isDeleteReady ? '#ffffff' : 'rgba(255,255,255,0.35)'} />
                <span>Delete Account</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* ── CARD 3: Need help? Alternative Option (Icon spans 2 rows) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.12, ease: 'easeOut' }}
        style={{
          ...glassCardStyle,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
          {/* Info Badge spanning both text rows */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Info size={22} color="#60a5fa" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.2,
              }}
            >
              Need help?
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.50)',
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.35,
              }}
            >
              If you're having trouble with your account or need to take a break, you can simply sign out instead of deleting your account.
            </span>
          </div>
        </div>

        <motion.button
          onClick={handleSignOutInstead}
          disabled={isSigningOut}
          whileHover={!isSigningOut ? { scale: 1.03, backgroundColor: 'rgba(255,255,255,0.08)' } : {}}
          whileTap={!isSigningOut ? { scale: 0.97 } : {}}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 500,
            cursor: isSigningOut ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            opacity: isSigningOut ? 0.7 : 1,
          }}
        >
          {isSigningOut ? 'Signing out...' : 'Sign Out Instead'}
        </motion.button>
      </motion.div>

      {/* ── Confirmation Modal (Portal onto body) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showConfirmModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={modalBackdropStyle}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 10 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{
                    width: '100%',
                    maxWidth: 460,
                    borderRadius: 18,
                    background: 'rgba(18, 15, 24, 0.92)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.70), 0 0 35px rgba(239,68,68,0.18)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AlertTriangle size={18} color="#ef4444" />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
                        Confirm Account Deletion
                      </h3>
                    </div>
                    <button
                      onClick={() => !isDeleting && setShowConfirmModal(false)}
                      disabled={isDeleting}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.5 }}>
                    Are you sure you want to permanently delete your account? All documents, extracted metadata, custom avatar, and activity logs will be permanently purged.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      disabled={isDeleting}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePermanentDeletion}
                      disabled={isDeleting}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                        opacity: isDeleting ? 0.7 : 1,
                      }}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Permanently Delete</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
