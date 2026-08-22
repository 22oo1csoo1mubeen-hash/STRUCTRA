import { useState } from 'react';
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
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

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
  const { signOut } = useAuth();

  // Controlled confirmation input state
  const [deleteInput, setDeleteInput] = useState('');
  const isDeleteReady = deleteInput.trim() === 'DELETE';

  // Safe local confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleDeleteClick = () => {
    if (!isDeleteReady) return;
    setShowConfirmModal(true);
  };

  const DATA_PILLS = [
    { id: 'docs', line1: 'Uploaded', line2: 'Documents', Icon: FileText },
    { id: 'extract', line1: 'Extracted', line2: 'Information', Icon: FileSpreadsheet },
    { id: 'ai', line1: 'AI', line2: 'Conversations', Icon: MessageSquare },
    { id: 'settings', line1: 'Account', line2: 'Settings', Icon: Settings },
    { id: 'history', line1: 'Usage', line2: 'History', Icon: History },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        width: '100%',
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
            }}
          />

          <motion.button
            onClick={handleDeleteClick}
            disabled={!isDeleteReady}
            whileHover={isDeleteReady ? { scale: 1.02, boxShadow: '0 6px 20px rgba(239,68,68,0.45)' } : {}}
            whileTap={isDeleteReady ? { scale: 0.98 } : {}}
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
              cursor: isDeleteReady ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxShadow: isDeleteReady ? '0 4px 16px rgba(239,68,68,0.35)' : 'none',
            }}
          >
            <Trash2 size={14} color={isDeleteReady ? '#ffffff' : 'rgba(255,255,255,0.35)'} />
            <span>Delete Account</span>
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
          onClick={() => signOut?.()}
          whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Sign Out Instead
        </motion.button>
      </motion.div>

      {/* ── Safe Local Confirmation Dialog (UI-Only) ── */}
      <AnimatePresence>
        {showConfirmModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.70)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              style={{
                width: '100%',
                maxWidth: 440,
                borderRadius: 18,
                background: '#14141c',
                border: '1px solid rgba(239,68,68,0.30)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
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
                  onClick={() => setShowConfirmModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                This is a UI preview. In production, this will initiate the permanent deletion of your account and all associated documents.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setDeleteInput('');
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Understood (Preview)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
