import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import NavBar from '../landing/NavBar';
import loginBg from '../../assets/login-background.webp';
import logo from '../../assets/structra-logo.png';
import { supabase } from '../../lib/supabase';
import { AuthGlassCard } from './AuthComponents';

/**
 * AuthCallbackPage
 *
 * Single callback route for ALL Supabase auth redirects:
 *   1. Email confirmation  (type=signup in hash)
 *   2. Google OAuth        (no type / type absent in hash)
 *
 * Supabase appends session tokens to the URL as a hash fragment:
 *   http://localhost:5173/auth/callback#access_token=...&type=signup
 *   http://localhost:5173/auth/callback#access_token=...  (OAuth)
 *
 * Because detectSessionInUrl=true in our Supabase client, the SDK exchanges
 * the token automatically and fires onAuthStateChange.
 *
 * BEHAVIOUR BY FLOW:
 *
 *  Email confirmation (type === 'signup'):
 *    → sign out the auto-created session
 *    → show "Email verified" success screen
 *    → button navigates to /login
 *
 *  Google OAuth (type is not 'signup'):
 *    → keep the session (user is now authenticated)
 *    → navigate directly to /app/upload
 *
 * This page NEVER manually reads, stores, or forwards tokens.
 */

/* ── Page entrance animation ──────────────────────────── */
const pageVariants = {
  hidden: { y: 18 },
  visible: {
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  /**
   * status:
   *   'loading'        — waiting for Supabase to process the URL token
   *   'email_verified' — email confirmation succeeded → show success + "Continue to Login"
   *   'oauth_success'  — Google OAuth succeeded → show success animation for 5s → auto-navigate
   *   'error'          — token expired / invalid / cancelled
   */
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-navigate after 5 seconds when OAuth succeeds
  useEffect(() => {
    if (status === 'oauth_success') {
      const timer = setTimeout(() => {
        navigate('/app/upload', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  useEffect(() => {
    let settled = false;

    /**
     * Determine the redirect type from the URL hash synchronously.
     * type=signup  → email confirmation flow
     * anything else (or absent) → OAuth flow (Google, etc.)
     */
    const hash = window.location.hash;

    // Immediate error in hash (e.g. user cancelled OAuth, expired link)
    if (hash.includes('error=')) {
      settled = true;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const desc =
        params.get('error_description') ||
        'Authentication failed. Please try again.';
      setErrorMessage(decodeURIComponent(desc.replace(/\+/g, ' ')));
      setStatus('error');
      return;
    }

    // Read the token type from the hash
    const hashParams = new URLSearchParams(hash.replace('#', '?'));
    const tokenType = hashParams.get('type'); // 'signup' | 'recovery' | null (OAuth)
    const isEmailConfirmation = tokenType === 'signup';

    /**
     * Listen for the auth event fired by the SDK after it exchanges the hash
     * token. Both email confirmation and OAuth produce SIGNED_IN here.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (settled) return;

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') && session) {
        settled = true;

        if (event === 'PASSWORD_RECOVERY' || tokenType === 'recovery') {
          /**
           * Password recovery flow:
           * A recovery session has been established. Route the user to the
           * Reset Password page so they can enter a new password.
           */
          navigate('/auth/reset-password', { replace: true });
        } else if (isEmailConfirmation) {
          /**
           * Email confirmation flow:
           * Sign out the auto-created session so the user must log in
           * explicitly. Show the "Email verified" success screen.
           */
          await supabase.auth.signOut();
          setStatus('email_verified');
        } else {
          /**
           * Google OAuth (or any other provider) flow:
           * The session is valid and the user is authenticated.
           * Show the success animation for 5 seconds before navigating.
           */
          setStatus('oauth_success');
        }
      }
    });

    // Safety timeout — 10 s. If no event fires the page was reached without
    // a valid token (e.g. navigated to manually, or link completely invalid).
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setErrorMessage(
          'The link has expired or is no longer valid. Please try again.'
        );
        setStatus('error');
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  /* ── Handlers ─────────────────────────────────────────── */
  const handleContinueToLogin = () => navigate('/login', { replace: true });
  const handleBackToLogin = () => navigate('/login', { replace: true });

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background */}
      <motion.img
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ duration: 0.65 }}
        src={loginBg}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.65 }}
      >
        <NavBar />
      </motion.div>

      <AuthGlassCard>
        {/* ── Brand header ──────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={logo}
            alt="Structra logo"
            style={{ width: 42, height: 'auto', marginBottom: 8, display: 'inline-block' }}
          />
          <h1
            style={{
              fontFamily: "'Rajdhani', 'Inter', system-ui, sans-serif",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: '#ffffff',
              margin: 0,
              lineHeight: 1,
            }}
          >
            STRUCTRA
          </h1>
          <p
            style={{
              marginTop: 4,
              fontSize: 11,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 400,
              letterSpacing: '0.01em',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            AI Document{' '}
            <span style={{ color: 'rgba(255, 185, 80, 0.9)', fontStyle: 'italic' }}>
              Intelligence
            </span>{' '}
            Platform
          </p>
        </div>

        {/* ── Loading (OAuth or email confirmation in progress) ── */}
        {status === 'loading' && <LoadingState />}

        {/* ── Email confirmation success ─────────────────────── */}
        {status === 'email_verified' && (
          <EmailVerifiedState onContinue={handleContinueToLogin} />
        )}

        {/* ── OAuth success (Google) ─────────────────────────── */}
        {status === 'oauth_success' && <OAuthSuccessState />}

        {/* ── Error ─────────────────────────────────────────── */}
        {status === 'error' && (
          <ErrorState message={errorMessage} onBack={handleBackToLogin} />
        )}
      </AuthGlassCard>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────
   Sub-states
────────────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid rgba(255,185,80,0.15)',
          borderTopColor: 'rgba(255,185,80,0.85)',
          margin: '0 auto 18px',
        }}
      />
      <h2
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 17,
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
        }}
      >
        Completing sign-in…
      </h2>
      <p
        style={{
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.52)',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Please wait while we verify your account.
      </p>
    </div>
  );
}

function EmailVerifiedState({ onContinue }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center', padding: '4px 0 8px' }}
    >
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(80, 200, 120, 0.12)',
          border: '1.5px solid rgba(80, 200, 120, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 24px rgba(80,200,120,0.18)',
        }}
      >
        <CheckCircle size={28} color="rgba(100,220,140,0.92)" strokeWidth={1.8} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 8px',
          letterSpacing: '-0.01em',
        }}
      >
        Email verified successfully
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.52)',
          margin: '0 0 24px',
          lineHeight: 1.55,
        }}
      >
        Your STRUCTRA account is ready.
        <br />
        Log in to continue.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        onClick={onContinue}
        whileHover={{ scale: 1.02, filter: 'brightness(1.06)' }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '11px 20px',
          borderRadius: 10,
          background: 'rgba(20, 12, 6, 0.65)',
          border: '1px solid rgba(255, 185, 80, 0.55)',
          boxShadow:
            '0 0 12px rgba(255,165,50,0.10), inset 0 0 12px rgba(255,160,40,0.15)',
          color: '#ffffff',
          fontSize: 14,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600,
          letterSpacing: '0.02em',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        Continue to Login
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M3 9H15M15 9L10 4M15 9L10 14"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>
    </motion.div>
  );
}

function OAuthSuccessState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center', padding: '12px 0 20px' }}
    >
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(80, 200, 120, 0.12)',
          border: '1.5px solid rgba(80, 200, 120, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 24px rgba(80,200,120,0.18)',
        }}
      >
        {/* Draw animation for the checkmark itself */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(100,220,140,0.92)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.polyline
            points="20 6 9 17 4 12"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 8px',
          letterSpacing: '-0.01em',
        }}
      >
        Signed in successfully
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        style={{
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.52)',
          margin: '0',
          lineHeight: 1.55,
        }}
      >
        Welcome back to STRUCTRA.
        <br />
        Loading your workspace...
      </motion.p>
    </motion.div>
  );
}

function ErrorState({ message, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center', padding: '4px 0 8px' }}
    >
      {/* Error icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(220, 60, 60, 0.10)',
          border: '1.5px solid rgba(220, 60, 60, 0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 24px rgba(220,60,60,0.14)',
        }}
      >
        <XCircle size={28} color="rgba(255,110,110,0.88)" strokeWidth={1.8} />
      </motion.div>

      <h2
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
        }}
      >
        Authentication failed
      </h2>

      <p
        style={{
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px',
          lineHeight: 1.55,
        }}
      >
        {message || 'Something went wrong. Please try again.'}
      </p>

      <p
        style={{
          fontSize: 12.5,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.38)',
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}
      >
        You can return to the login page and try again.
      </p>

      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '11px 20px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: 'rgba(255,255,255,0.88)',
          fontSize: 14,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 500,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M15 9H3M3 9L8 4M3 9L8 14"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Login
      </motion.button>
    </motion.div>
  );
}
