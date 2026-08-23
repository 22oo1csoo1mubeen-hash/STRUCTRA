import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import NavBar from '../landing/NavBar';
import loginBg from '../../assets/login-background.webp';
import logo from '../../assets/structra-logo.png';
import { useAuth } from '../../hooks/useAuth';
import {
  AuthInput,
  AuthSubmitButton,
  AuthSecondaryButton,
  AuthGlassCard,
} from './AuthComponents';

/* ── Animation variants ─────────────────────────────────── */
const pageVariants = {
  hidden: { y: 18 },
  visible: {
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { session, loading, updatePassword, logout } = useAuth();
  const navigate = useNavigate();

  // If auth is still checking, render nothing to avoid flash
  if (loading) return null;

  // The user MUST have an active session (established by the recovery link).
  // If not, they either navigated here manually or their link expired.
  // We skip this check if isSuccess is true, because we explicitly clear the session on success.
  if (!session && !isSuccess) {
    return <ExpiredLinkState />;
  }

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(password);
    
    if (error) {
      setErrorMsg(error.message ?? 'Failed to update password. Please try again.');
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setIsLoading(false);
      // Security: Clear the recovery session so the user is forced to log in
      // with their newly created password, preventing unintended authenticated states.
      // We don't await this so the UI can immediately transition to the success state.
      logout().catch(console.error);
    }
  };

  /* ── Eye toggles ────────────────────────────────────── */
  const togglePassword = (
    <motion.button
      type="button"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      onClick={() => setShowPassword((v) => !v)}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
        display: 'flex', alignItems: 'center',
        color: showPassword ? 'rgba(255,185,80,0.85)' : 'rgba(255,185,80,0.65)',
        transition: 'color 0.2s ease',
      }}
    >
      {showPassword ? <EyeOff size={17} strokeWidth={1.6} /> : <Eye size={17} strokeWidth={1.6} />}
    </motion.button>
  );

  const toggleConfirmPassword = (
    <motion.button
      type="button"
      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
      onClick={() => setShowConfirmPassword((v) => !v)}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
        display: 'flex', alignItems: 'center',
        color: showConfirmPassword ? 'rgba(255,185,80,0.85)' : 'rgba(255,185,80,0.65)',
        transition: 'color 0.2s ease',
      }}
    >
      {showConfirmPassword ? <EyeOff size={17} strokeWidth={1.6} /> : <Eye size={17} strokeWidth={1.6} />}
    </motion.button>
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: 'relative', width: '100vw', height: '100vh',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.img
        initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} transition={{ duration: 0.65 }}
        src={loginBg} alt="" aria-hidden="true" draggable={false}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          userSelect: 'none', pointerEvents: 'none',
        }}
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.65 }}>
        <NavBar />
      </motion.div>

      <AuthGlassCard>
        {/* ── Brand header ────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src={logo} alt="Structra logo"
            style={{ width: 42, height: 'auto', marginBottom: 8, display: 'inline-block' }}
          />
          <h1 style={{
            fontFamily: "'Rajdhani', 'Inter', system-ui, sans-serif",
            fontSize: 22, fontWeight: 700, letterSpacing: '0.22em',
            color: '#ffffff', margin: 0, lineHeight: 1,
          }}>
            STRUCTRA
          </h1>
          <p style={{
            marginTop: 4, fontSize: 11,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 400, letterSpacing: '0.01em',
            color: 'rgba(255,255,255,0.55)',
          }}>
            AI Document{' '}
            <span style={{ color: 'rgba(255, 185, 80, 0.9)', fontStyle: 'italic' }}>Intelligence</span>{' '}
            Platform
          </p>
        </div>

        {isSuccess ? (
          <SuccessState onContinue={() => navigate('/login', { replace: true })} />
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 18, fontWeight: 700, color: '#ffffff',
                margin: '0 0 4px 0', letterSpacing: '-0.01em',
              }}>
                Create a new password
              </h2>
              <p style={{
                fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 400, color: 'rgba(255,255,255,0.52)', margin: 0,
              }}>
                Please enter your new password below.
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div
                role="alert"
                style={{
                  marginBottom: 14, padding: '9px 14px', borderRadius: 8,
                  background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.35)',
                  color: 'rgba(255,140,140,0.95)', fontSize: 12.5,
                  fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.4,
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} noValidate>
              {/* Password */}
              <div style={{ marginBottom: 12 }}>
                <AuthInput
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightElement={togglePassword}
                  autoComplete="new-password"
                />
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 20 }}>
                <AuthInput
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  rightElement={toggleConfirmPassword}
                  autoComplete="new-password"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <AuthSubmitButton id="reset-submit-btn" loading={isLoading} disabled={isLoading}>
                  {isLoading ? 'Updating…' : 'Update Password'}
                </AuthSubmitButton>
              </div>
            </form>
          </>
        )}
      </AuthGlassCard>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Success State
───────────────────────────────────────────────────────── */
function SuccessState({ onContinue }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center', padding: '4px 0 8px' }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(80, 200, 120, 0.12)',
          border: '1.5px solid rgba(80, 200, 120, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 24px rgba(80,200,120,0.18)',
        }}
      >
        <CheckCircle size={28} color="rgba(100,220,140,0.92)" strokeWidth={1.8} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 18, fontWeight: 700, color: '#ffffff',
          margin: '0 0 8px', letterSpacing: '-0.01em',
        }}
      >
        Password updated
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        style={{
          fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.52)', margin: '0 0 24px', lineHeight: 1.55,
        }}
      >
        Your password has been changed successfully.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        onClick={onContinue}
        whileHover={{ scale: 1.02, filter: 'brightness(1.06)' }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '11px 20px', borderRadius: 10,
          background: 'rgba(20, 12, 6, 0.65)', border: '1px solid rgba(255, 185, 80, 0.55)',
          boxShadow: '0 0 12px rgba(255,165,50,0.10), inset 0 0 12px rgba(255,160,40,0.15)',
          color: '#ffffff', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600, letterSpacing: '0.02em', cursor: 'pointer',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        Continue to Login
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Expired/Invalid Link State
───────────────────────────────────────────────────────── */
function ExpiredLinkState() {
  const navigate = useNavigate();
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: 'relative', width: '100vw', height: '100vh',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.img
        initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} transition={{ duration: 0.65 }}
        src={loginBg} alt="" aria-hidden="true" draggable={false}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          userSelect: 'none', pointerEvents: 'none',
        }}
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.65 }}>
        <NavBar />
      </motion.div>

      <AuthGlassCard>
        <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(220, 60, 60, 0.10)',
              border: '1.5px solid rgba(220, 60, 60, 0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 0 24px rgba(220,60,60,0.14)',
            }}
          >
            <XCircle size={28} color="rgba(255,110,110,0.88)" strokeWidth={1.8} />
          </motion.div>

          <h2 style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 18, fontWeight: 700, color: '#ffffff',
            margin: '0 0 6px', letterSpacing: '-0.01em',
          }}>
            Password reset link expired
          </h2>

          <p style={{
            fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
            color: 'rgba(255,255,255,0.52)', margin: '0 0 24px', lineHeight: 1.55,
          }}>
            This link is no longer valid. Please request a new password reset link.
          </p>

          <AuthSecondaryButton onClick={() => navigate('/forgot-password', { replace: true })}>
            Request New Reset Link
          </AuthSecondaryButton>
        </div>
      </AuthGlassCard>
    </motion.div>
  );
}
