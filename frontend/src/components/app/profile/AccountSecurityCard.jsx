import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  CheckCircle2,
  MoreVertical,
  ArrowRight,
  X,
  Eye,
  EyeOff,
  Laptop,
  Smartphone,
  Globe,
  Radio,
  Plus,
  Key,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import {
  getSecurityOverview,
  getSecurityActivity,
  recordSecurityActivity,
} from '../../../api/profile';

/* ─── Official Google 'G' Icon ──────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/* ─── Unified STRUCTRA glassmorphism card style ────────────── */
const glassCardStyle = {
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
};

/* ─── Format ISO timestamp into clean relative date ─────────── */
function formatActivityTime(raw) {
  if (!raw) return 'Recently';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return 'Recently';
    const isToday = new Date().toDateString() === d.toDateString();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    return isToday ? `Today, ${timeStr}` : `${dateStr}, ${timeStr}`;
  } catch {
    return 'Recently';
  }
}

export default function AccountSecurityCard({ user = null }) {
  const { refreshUser } = useAuth();

  // Security overview state from backend
  const [securityData, setSecurityData] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Form states for password modal
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isResettingEmail, setIsResettingEmail] = useState(false);

  // Action status / toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [showLinkingHelpModal, setShowLinkingHelpModal] = useState(false);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to scroll page to top
  const scrollToTop = () => {
    const scrollEl = document.getElementById('app-scroll-area');
    if (scrollEl) {
      scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Lock scroll and ensure scrolled to top when any modal opens
  useEffect(() => {
    if (showPasswordModal || showActivityModal) {
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
  }, [showPasswordModal, showActivityModal]);

  /* ─── Fetch real security overview ─────────────────────────── */
  const fetchSecurityState = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const data = await getSecurityOverview();
      setSecurityData(data);
    } catch (err) {
      console.error('Failed to load security overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityState();
  }, [fetchSecurityState]);

  /* ─── Derived Authentication Attributes ─────────────────────── */
  const userEmail = securityData?.email || user?.email || '';
  const googleEmail = securityData?.google_email || userEmail;

  // Real provider checks
  const providers = securityData?.providers || (user?.app_metadata?.providers ?? (user?.app_metadata?.provider ? [user.app_metadata.provider] : ['email']));
  const hasGoogle = providers.includes('google');
  const hasPassword = securityData?.has_password ?? (providers.includes('email') || !hasGoogle);

  const currentSession = securityData?.current_session || {
    device: 'Windows PC (Chrome)',
    icon_type: 'laptop',
    location: 'Location unavailable',
    ip: 'Local Network',
    last_active: 'Active now',
    is_current: true,
  };

  /* ─── Password Modal Handlers ──────────────────────────────── */
  const openPasswordModal = () => {
    scrollToTop();
    setCurrPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurr(false);
    setShowNew(false);
    setShowConfirm(false);
    setPasswordNotice(null);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordNotice(null);

    // Validation
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSubmittingPassword(true);

    try {
      // If user already has password, verify current password first
      if (hasPassword) {
        if (!currPassword) {
          setPasswordNotice({ type: 'error', text: 'Please enter your current password.' });
          setIsSubmittingPassword(false);
          return;
        }

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currPassword,
        });

        if (signInErr) {
          setPasswordNotice({
            type: 'error',
            text: 'Incorrect current password. Please try again or click "Forgot password?".',
          });
          setIsSubmittingPassword(false);
          return;
        }
      }

      // Update password via Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        throw updateErr;
      }

      // Log security event
      const eventType = hasPassword ? 'password_changed' : 'password_created';
      const eventDesc = hasPassword ? 'Account password changed' : 'Password credential established for account';
      await recordSecurityActivity({
        event_type: eventType,
        description: eventDesc,
        device_info: currentSession.device,
      });

      setShowPasswordModal(false);
      showToast(hasPassword ? 'Password changed successfully.' : 'Password added successfully. You can now sign in with email and password.');
      await refreshUser();
      fetchSecurityState();
    } catch (err) {
      console.error('Password operation failed:', err);
      setPasswordNotice({
        type: 'error',
        text: err?.message || 'Failed to update password. Please try again.',
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  /* ─── Forgot Password Trigger ───────────────────────────────── */
  const handleForgotPassword = async () => {
    if (!userEmail) return;
    setIsResettingEmail(true);
    setPasswordNotice(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;

      await recordSecurityActivity({
        event_type: 'password_reset_requested',
        description: 'Password reset link sent to email',
        device_info: currentSession.device,
      });

      setPasswordNotice({
        type: 'success',
        text: `Password reset instructions have been sent to ${userEmail}.`,
      });
    } catch (err) {
      console.error('Reset request failed:', err);
      setPasswordNotice({
        type: 'error',
        text: err?.message || 'Failed to send reset email.',
      });
    } finally {
      setIsResettingEmail(false);
    }
  };

  /* ─── Connect Google Identity ──────────────────────────────── */
  const handleConnectGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      try {
        sessionStorage.setItem('structra_linking_google', 'true');
      } catch {
        /* silent */
      }

      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        try {
          sessionStorage.removeItem('structra_linking_google');
        } catch {
          /* silent */
        }

        const errMsg = error.message || '';
        if (
          errMsg.toLowerCase().includes('manual linking is disabled') ||
          error.code === 'manual_linking_disabled'
        ) {
          setShowLinkingHelpModal(true);
        } else if (
          errMsg.includes('already linked') ||
          errMsg.includes('conflict') ||
          errMsg.includes('identity_already_exists')
        ) {
          showToast('This Google account is already linked to another STRUCTRA account.', 'error');
        } else {
          showToast(errMsg || 'Google account linking could not be initiated.', 'error');
        }
      }
    } catch (err) {
      console.error('Google linking error:', err);
      showToast('Unable to connect Google account.', 'error');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  /* ─── Sign Out Other Sessions ───────────────────────────────── */
  const handleSignOutOthers = async () => {
    setIsSigningOutOthers(true);
    try {
      await supabase.auth.signOut({ scope: 'others' });

      await recordSecurityActivity({
        event_type: 'sessions_revoked',
        description: 'Signed out of all other active device sessions',
        device_info: currentSession.device,
      });

      showToast('Signed out of all other devices successfully.');
      fetchSecurityState();
    } catch (err) {
      console.error('Failed to revoke other sessions:', err);
      showToast('Failed to sign out other sessions.');
    } finally {
      setIsSigningOutOthers(false);
    }
  };

  /* ─── View All Activity Log ────────────────────────────────── */
  const handleOpenActivityModal = async () => {
    scrollToTop();
    setShowActivityModal(true);
    setLoadingActivity(true);
    try {
      const items = await getSecurityActivity();
      setActivityLogs(items);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Full-content overlay backdrop covering whole content space (excluding sidebar)
  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    left: typeof window !== 'undefined' && window.innerWidth > 768 ? 215 : 0,
    right: 0,
    bottom: 0,
    width: typeof window !== 'undefined' && window.innerWidth > 768 ? 'calc(100vw - 215px)' : '100vw',
    height: '100vh',
    background:
      'radial-gradient(ellipse at 50% 45%, rgba(249, 115, 22, 0.10) 0%, rgba(6, 4, 10, 0.45) 60%, rgba(4, 2, 8, 0.58) 100%)',
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
      {/* ── Floating Notification Toast ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              bottom: 28,
              right: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 18px',
              borderRadius: 14,
              background: 'rgba(15, 13, 20, 0.95)',
              border:
                toastMessage.type === 'error'
                  ? '1px solid rgba(239, 68, 68, 0.45)'
                  : toastMessage.type === 'info'
                  ? '1px solid rgba(59, 130, 246, 0.45)'
                  : '1px solid rgba(74, 222, 128, 0.40)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow:
                toastMessage.type === 'error'
                  ? '0 12px 36px rgba(0, 0, 0, 0.60), 0 0 20px rgba(239, 68, 68, 0.15)'
                  : toastMessage.type === 'info'
                  ? '0 12px 36px rgba(0, 0, 0, 0.60), 0 0 20px rgba(59, 130, 246, 0.15)'
                  : '0 12px 36px rgba(0, 0, 0, 0.60), 0 0 20px rgba(74, 222, 128, 0.15)',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background:
                  toastMessage.type === 'error'
                    ? 'rgba(239, 68, 68, 0.18)'
                    : toastMessage.type === 'info'
                    ? 'rgba(59, 130, 246, 0.18)'
                    : 'rgba(74, 222, 128, 0.18)',
                border:
                  toastMessage.type === 'error'
                    ? '1px solid rgba(239, 68, 68, 0.35)'
                    : toastMessage.type === 'info'
                    ? '1px solid rgba(59, 130, 246, 0.35)'
                    : '1px solid rgba(74, 222, 128, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle size={13} strokeWidth={2.5} color="#ef4444" />
              ) : toastMessage.type === 'info' ? (
                <AlertCircle size={13} strokeWidth={2.5} color="#60a5fa" />
              ) : (
                <Check size={13} strokeWidth={3} color="#4ade80" />
              )}
            </div>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              {typeof toastMessage === 'string' ? toastMessage : toastMessage.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CARD 1: Sign-in Method (Dual Provider Awareness) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        style={{
          ...glassCardStyle,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Sign-in Method
          </h2>
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Manage how you sign in to your STRUCTRA account.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Google Account Item */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* White Circular Google Icon */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              >
                <GoogleIcon />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#ffffff',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Google Account
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: hasGoogle ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                      border: hasGoogle ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.12)',
                      color: hasGoogle ? '#4ade80' : 'rgba(255,255,255,0.50)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {hasGoogle ? 'Active' : 'Not Connected'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    color: 'rgba(255,255,255,0.70)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {hasGoogle ? googleEmail : 'One-click sign in with Google'}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    color: 'rgba(255,255,255,0.40)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {hasGoogle ? 'Used to sign in' : 'Connect to support Google login on this account'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {hasGoogle ? (
                <CheckCircle2 size={18} color="#4ade80" />
              ) : (
                <motion.button
                  onClick={handleConnectGoogle}
                  disabled={isLinkingGoogle}
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#ffffff',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: isLinkingGoogle ? 'not-allowed' : 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isLinkingGoogle ? 'Connecting...' : 'Connect Google'}
                </motion.button>
              )}
            </div>
          </div>

          {/* Email & Password Item */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Orange Mail Icon Container */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(249,115,22,0.10)',
                  border: '1px solid rgba(249,115,22,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Mail size={18} color="#f97316" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#ffffff',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Email & Password
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: hasPassword ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)',
                      border: hasPassword ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.12)',
                      color: hasPassword ? '#60a5fa' : 'rgba(255,255,255,0.50)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {hasPassword ? 'Active' : 'Not Configured'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    color: 'rgba(255,255,255,0.70)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {userEmail}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    color: 'rgba(255,255,255,0.40)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {hasPassword ? 'Used for email and password sign-in' : 'Add a password to enable email & password sign-in'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {hasPassword ? (
                <CheckCircle2 size={18} color="#60a5fa" />
              ) : (
                <motion.button
                  onClick={openPasswordModal}
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(249,115,22,0.14)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    border: '1px solid rgba(249,115,22,0.40)',
                    background: 'rgba(249,115,22,0.08)',
                    color: '#f97316',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                >
                  Add Password
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── CARD 2: Password (Dynamic based on hasPassword) ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, delay: 0.06, ease: 'easeOut' }}
        style={{
          ...glassCardStyle,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Password
          </h2>
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Manage your account password.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Orange Lock Icon Container */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(249,115,22,0.10)',
                border: '1px solid rgba(249,115,22,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Lock size={18} color="#f97316" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#ffffff',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Password
              </span>
              {hasPassword ? (
                <>
                  <span
                    style={{
                      fontSize: 14,
                      letterSpacing: '2px',
                      color: 'rgba(255,255,255,0.60)',
                      fontFamily: 'monospace',
                    }}
                  >
                    ••••••••••••••••
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: 'rgba(255,255,255,0.40)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Active credential
                  </span>
                </>
              ) : (
                <span
                  style={{
                    fontSize: 12.5,
                    color: 'rgba(255,255,255,0.50)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  No password configured (Google sign-in active)
                </span>
              )}
            </div>
          </div>

          <motion.button
            onClick={openPasswordModal}
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(249,115,22,0.14)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              border: '1px solid rgba(249,115,22,0.40)',
              background: 'rgba(249,115,22,0.08)',
              color: '#f97316',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            {hasPassword ? 'Change Password' : 'Add Password'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── CARD 3: Active Sessions & Security Activity (Integrated) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.12, ease: 'easeOut' }}
        style={{
          ...glassCardStyle,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Active Sessions & Security Activity
            </h2>
            <p
              style={{
                margin: '3px 0 0 0',
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Manage devices where your account is currently signed in and review recent activity.
            </p>
          </div>

          <motion.button
            onClick={handleOpenActivityModal}
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(249,115,22,0.14)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid rgba(249,115,22,0.40)',
              background: 'rgba(249,115,22,0.08)',
              color: '#f97316',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            <span>View All Activity</span>
            <ArrowRight size={13} />
          </motion.button>
        </div>

        {/* Current Active Session */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(74,222,128,0.10)',
                  border: '1px solid rgba(74,222,128,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {currentSession.icon_type === 'smartphone' ? (
                  <Smartphone size={18} color="#4ade80" />
                ) : (
                  <Laptop size={18} color="#4ade80" />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#ffffff',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {currentSession.device}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(74,222,128,0.12)',
                      border: '1px solid rgba(74,222,128,0.25)',
                      color: '#4ade80',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    This Device
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    {currentSession.location}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>•</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    {currentSession.ip}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>•</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#4ade80',
                      fontWeight: 500,
                    }}
                  >
                    Active now
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.20)',
                  color: '#4ade80',
                  fontSize: 11.5,
                  fontWeight: 500,
                }}
              >
                <Radio size={12} color="#4ade80" />
                <span>Current Session</span>
              </div>

              <motion.button
                onClick={handleSignOutOthers}
                disabled={isSigningOutOthers}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(239,68,68,0.12)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444',
                  fontSize: 11.5,
                  fontWeight: 500,
                  cursor: isSigningOutOthers ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <LogOut size={12} />
                <span>{isSigningOutOthers ? 'Signing out...' : 'Sign out other sessions'}</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Recent Security Activity Mini Strip */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color="#4ade80" />
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              Recent Sign-in: {currentSession.device} • {formatActivityTime(user?.last_sign_in_at)}
            </span>
          </div>
          <span
            style={{
              fontSize: 11.5,
              color: '#4ade80',
              fontWeight: 500,
            }}
          >
            ● All systems secure
          </span>
        </div>
      </motion.div>

      {/* ── MODAL 1: Add Password / Change Password (Portal onto body) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showPasswordModal && (
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
                    maxWidth: 450,
                    borderRadius: 18,
                    background: 'rgba(18, 15, 24, 0.88)',
                    border: '1px solid rgba(249, 115, 22, 0.30)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.70), 0 0 35px rgba(249,115,22,0.18)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'rgba(249,115,22,0.12)',
                          border: '1px solid rgba(249,115,22,0.30)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Lock size={18} color="#f97316" />
                      </div>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#ffffff',
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}
                        >
                          {hasPassword ? 'Change Password' : 'Add Account Password'}
                        </h3>
                        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                          {hasPassword ? 'Update your current password' : 'Enable email & password sign-in for this account'}
                        </span>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setShowPasswordModal(false)}
                      aria-label="Close"
                      whileHover={{ scale: 1.1, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)' }}
                      whileTap={{ scale: 0.92 }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>

                  <form
                    onSubmit={handlePasswordSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                  >
                    {/* Current Password — Only shown if password credential exists */}
                    {hasPassword && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'rgba(255,255,255,0.7)',
                            }}
                          >
                            Current Password
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={isResettingEmail}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f97316',
                              fontSize: 11.5,
                              fontWeight: 500,
                              cursor: isResettingEmail ? 'not-allowed' : 'pointer',
                              padding: 0,
                            }}
                          >
                            {isResettingEmail ? 'Sending reset...' : 'Forgot password?'}
                          </button>
                        </div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type={showCurr ? 'text' : 'password'}
                            value={currPassword}
                            onChange={(e) => setCurrPassword(e.target.value)}
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            style={{
                              width: '100%',
                              height: 42,
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.10)',
                              padding: '0 40px 0 12px',
                              color: '#ffffff',
                              fontSize: 13,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurr(!showCurr)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255,255,255,0.4)',
                              cursor: 'pointer',
                            }}
                          >
                            {showCurr ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* New Password */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        New Password
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 6 characters)"
                          autoComplete="new-password"
                          style={{
                            width: '100%',
                            height: 42,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            padding: '0 40px 0 12px',
                            color: '#ffffff',
                            fontSize: 13,
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          style={{
                            position: 'absolute',
                            right: 10,
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                          }}
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        Confirm New Password
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                          style={{
                            width: '100%',
                            height: 42,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            padding: '0 40px 0 12px',
                            color: '#ffffff',
                            fontSize: 13,
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          style={{
                            position: 'absolute',
                            right: 10,
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                          }}
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {passwordNotice && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: passwordNotice.type === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                          border: passwordNotice.type === 'success' ? '1px solid rgba(74,222,128,0.30)' : '1px solid rgba(239,68,68,0.30)',
                          color: passwordNotice.type === 'success' ? '#4ade80' : '#fca5a5',
                          fontSize: 12,
                        }}
                      >
                        {passwordNotice.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                        <span>{passwordNotice.text}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 10,
                        marginTop: 8,
                      }}
                    >
                      <motion.button
                        type="button"
                        onClick={() => setShowPasswordModal(false)}
                        disabled={isSubmittingPassword}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: isSubmittingPassword ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        type="submit"
                        disabled={isSubmittingPassword}
                        whileHover={{ scale: 1.02, filter: 'brightness(1.08)' }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 18px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #ff9838 0%, #f97316 50%, #ea580c 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: isSubmittingPassword ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
                          opacity: isSubmittingPassword ? 0.8 : 1,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSubmittingPassword ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>{hasPassword ? 'Update Password' : 'Save Password'}</span>
                        )}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── MODAL 2: View All Activity (Portal onto body) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showActivityModal && (
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
                    maxWidth: 520,
                    maxHeight: '80vh',
                    borderRadius: 18,
                    background: 'rgba(18, 15, 24, 0.88)',
                    border: '1px solid rgba(249, 115, 22, 0.30)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.70), 0 0 35px rgba(249,115,22,0.18)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'rgba(249,115,22,0.12)',
                          border: '1px solid rgba(249,115,22,0.30)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Globe size={18} color="#f97316" />
                      </div>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#ffffff',
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}
                        >
                          Security Activity Log
                        </h3>
                        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                          Chronological authentication and account security events
                        </span>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setShowActivityModal(false)}
                      aria-label="Close"
                      whileHover={{ scale: 1.1, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)' }}
                      whileTap={{ scale: 0.92 }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>

                  {/* Event list */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      overflowY: 'auto',
                      maxHeight: 'calc(80vh - 140px)',
                      paddingRight: 4,
                    }}
                  >
                    {loadingActivity ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                        <Loader2 size={24} className="animate-spin" color="#f97316" />
                      </div>
                    ) : activityLogs.length > 0 ? (
                      activityLogs.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                          }}
                        >
                          <CheckCircle2 size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                              {item.description}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                              {item.device_info || currentSession.device} • {formatActivityTime(item.created_at)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                        No recent security activity logged.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, flexShrink: 0 }}>
                    <motion.button
                      onClick={() => setShowActivityModal(false)}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.12)' }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Close
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── MODAL 3: Google Linking Configuration Guide (Portal onto body) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showLinkingHelpModal && (
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
                    maxWidth: 520,
                    borderRadius: 18,
                    background: 'rgba(18, 15, 24, 0.92)',
                    border: '1px solid rgba(66, 133, 244, 0.35)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.70), 0 0 35px rgba(66,133,244,0.18)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: 'rgba(66, 133, 244, 0.12)',
                          border: '1px solid rgba(66, 133, 244, 0.30)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <GoogleIcon />
                      </div>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#ffffff',
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}
                        >
                          Google Account Linking
                        </h3>
                        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                          Supabase Authentication Configuration
                        </span>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setShowLinkingHelpModal(false)}
                      aria-label="Close"
                      whileHover={{ scale: 1.1, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)' }}
                      whileTap={{ scale: 0.92 }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(66, 133, 244, 0.08)',
                        border: '1px solid rgba(66, 133, 244, 0.20)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd' }}>
                        How to Enable in Supabase Dashboard
                      </span>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                        Supabase requires <strong>Allow manual linking</strong> to be toggled ON in project settings:
                      </p>
                      <ol style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                        <li>Open your <strong>Supabase Dashboard</strong>.</li>
                        <li>Go to <strong>Authentication</strong> → <strong>Providers</strong>.</li>
                        <li>Toggle ON <strong>Allow manual linking</strong> (or enable automatic email linking).</li>
                      </ol>
                    </div>

                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(74, 222, 128, 0.08)',
                        border: '1px solid rgba(74, 222, 128, 0.20)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <CheckCircle2 size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4ade80' }}>
                          Direct Google Sign-in Supported
                        </span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', lineHeight: 1.4 }}>
                          You can also sign in directly using <strong>Continue with Google</strong> on the login screen using your email ({userEmail || 'your email'}).
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <motion.button
                      onClick={() => setShowLinkingHelpModal(false)}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.12)' }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Got it
                    </motion.button>
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
