import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import NavBar from '../landing/NavBar';
import loginBg from '../../assets/login-background.webp';
import logo from '../../assets/structra-logo.png';
import { useAuth } from '../../hooks/useAuth';
import {
  AuthCheckbox,
  AuthInput,
  AuthDivider,
  AuthSubmitButton,
  GoogleButton,
  AuthGlassCard,
} from './AuthComponents';

/* --- Animation variants -------------------------------- */
const pageVariants = {
  hidden: { y: 18 },
  visible: {
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Tracks whether login failed because the email isn't confirmed yet
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const { login, loginWithGoogle, resendConfirmation, session, loading } = useAuth();
  const navigate = useNavigate();
  // Tracks whether the Google OAuth redirect is in progress
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // If auth is still initializing, render nothing to avoid a login-page flash
  // for users who already have a valid session.
  if (loading) return null;

  // Already authenticated — send directly to the app.
  if (session) return <Navigate to="/app/upload" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setEmailNotConfirmed(false);
    setResendMsg('');
    setIsLoading(true);
    const { error } = await login(email, password, rememberMe);
    if (error) {
      // Supabase returns this message when the email hasn't been confirmed yet.
      if (
        error.message?.toLowerCase().includes('email not confirmed') ||
        error.message?.toLowerCase().includes('email_not_confirmed')
      ) {
        setEmailNotConfirmed(true);
      } else {
        setErrorMsg(error.message ?? 'Login failed. Please try again.');
      }
      setIsLoading(false);
      return;
    }
    navigate('/app/upload');
  };

  /* ── Resend confirmation email ─────────────────────── */
  const handleResend = async () => {
    if (!email) return;
    setResendMsg('');
    setResendLoading(true);
    const { error } = await resendConfirmation(email);
    setResendLoading(false);
    if (error) {
      setResendMsg('Could not resend. Please try again shortly.');
    } else {
      setResendMsg('Confirmation email resent. Please check your inbox.');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    const { error } = await loginWithGoogle(rememberMe);
    if (error) {
      // signInWithOAuth only returns an error if the redirect itself fails
      // (e.g. network down, provider misconfigured). User cancellation is
      // handled by the callback page via the hash error param.
      setGoogleError('Could not connect to Google. Please try again.');
      setGoogleLoading(false);
    }
    // On success the browser navigates away — no further action needed here.
  };

  const eyeToggle = (
    <motion.button
      type="button"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      id="password-visibility-toggle"
      onClick={() => setShowPassword((v) => !v)}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        color: showPassword ? 'rgba(255,185,80,0.85)' : 'rgba(255,185,80,0.65)',
        transition: 'color 0.2s ease',
      }}
    >
      {showPassword ? <EyeOff size={17} strokeWidth={1.6} /> : <Eye size={17} strokeWidth={1.6} />}
    </motion.button>
  );

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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.65 }}>
        <NavBar />
      </motion.div>

      <AuthGlassCard>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
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

        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 4px 0',
              letterSpacing: '-0.01em',
            }}
          >
            Welcome Back
          </h2>
          <p
            style={{
              fontSize: 13,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 400,
              color: 'rgba(255,255,255,0.52)',
              margin: 0,
            }}
          >
            Login to your account
          </p>
        </div>

        {/* Generic error (wrong password, etc.) */}
        {errorMsg && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '9px 14px',
              borderRadius: 8,
              background: 'rgba(220, 60, 60, 0.12)',
              border: '1px solid rgba(220, 60, 60, 0.35)',
              color: 'rgba(255, 140, 140, 0.95)',
              fontSize: 12.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Google OAuth error */}
        {googleError && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '9px 14px',
              borderRadius: 8,
              background: 'rgba(220, 60, 60, 0.12)',
              border: '1px solid rgba(220, 60, 60, 0.35)',
              color: 'rgba(255, 140, 140, 0.95)',
              fontSize: 12.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.4,
            }}
          >
            {googleError}
          </div>
        )}

        {/* Unverified email notice */}
        {emailNotConfirmed && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '11px 14px',
              borderRadius: 8,
              background: 'rgba(255,185,80,0.08)',
              border: '1px solid rgba(255,185,80,0.30)',
              fontSize: 12.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.5,
            }}
          >
            <p style={{ color: 'rgba(255,215,120,0.95)', margin: '0 0 8px', fontWeight: 500 }}>
              Please confirm your email address before logging in.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0 0 10px', fontSize: 12 }}>
              Check your inbox for the confirmation link we sent when you registered.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: resendLoading ? 'default' : 'pointer',
                color: resendLoading ? 'rgba(255,185,80,0.40)' : 'rgba(255,185,80,0.85)',
                fontSize: 12.5,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              {resendLoading ? 'Sending…' : 'Resend confirmation email'}
            </button>
            {resendMsg && (
              <p style={{
                margin: '6px 0 0',
                fontSize: 12,
                color: resendMsg.startsWith('Could')
                  ? 'rgba(255,140,140,0.85)'
                  : 'rgba(130,220,160,0.85)',
              }}>
                {resendMsg}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          <div style={{ marginBottom: 16 }}>
            <GoogleButton
              id="google-login-btn"
              onClick={handleGoogleLogin}
              loading={googleLoading}
              disabled={googleLoading || isLoading}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <AuthDivider />
          </div>
          <div style={{ marginBottom: 12 }}>
            <AuthInput
              id="login-email"
              type="email"
              placeholder="Email"
              icon={User}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <AuthInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightElement={eyeToggle}
              autoComplete="current-password"
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <AuthCheckbox id="remember-me-checkbox" checked={rememberMe} onChange={setRememberMe}>
              Remember me
            </AuthCheckbox>
            <Link
              to="/forgot-password"
              id="forgot-password-link"
              style={{
                color: 'rgba(255,175,60,0.88)',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 400,
                textDecoration: 'none',
                letterSpacing: '0.01em',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.target.style.color = 'rgba(255,195,100,1)')}
              onMouseLeave={(e) => (e.target.style.color = 'rgba(255,175,60,0.88)')}
            >
              Forgot Password?
            </Link>
          </div>
          <div style={{ marginBottom: 20 }}>
            <AuthSubmitButton id="login-submit-btn" loading={isLoading} disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Login'}
            </AuthSubmitButton>
          </div>
        </form>

        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 400,
            color: 'rgba(255,255,255,0.52)',
            margin: 0,
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            id="register-nav-link"
            style={{
              color: 'rgba(255,175,60,0.90)',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.target.style.color = 'rgba(255,200,100,1)')}
            onMouseLeave={(e) => (e.target.style.color = 'rgba(255,175,60,0.90)')}
          >
            Register
          </Link>
        </p>
      </AuthGlassCard>
    </motion.div>
  );
}
