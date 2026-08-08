import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import NavBar from '../landing/NavBar';
import loginBg from '../../assets/login-background.webp';
import logo from '../../assets/structra-logo.png';
import { useAuth } from '../../hooks/useAuth';
import {
  AuthInput,
  AuthDivider,
  AuthSubmitButton,
  AuthSecondaryButton,
  AuthGlassCard,
} from './AuthComponents';

/* ─── Animation variants ──────────────────────────────── */
const pageVariants = {
  hidden: { y: 18 },
  visible: {
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    
    const { error } = await resetPassword(email);
    
    if (error) {
      setErrorMsg(error.message ?? 'Failed to send reset email. Please try again.');
    } else {
      setIsSuccess(true);
    }
    setIsLoading(false);
  };

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
      {/* ── 1. Background image ───────────────────────── */}
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

      {/* ── 2. NavBar ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.65 }}>
        <NavBar />
      </motion.div>

      {/* ── 3. Glass authentication card ──────────────── */}
      <AuthGlassCard>
        {/* ── Logo + Brand ─────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src={logo}
            alt="Structra logo"
            style={{
              width: 42,
              height: 'auto',
              marginBottom: 8,
              display: 'inline-block',
            }}
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

        {isSuccess ? (
          <CheckEmailState email={email} onBack={() => navigate('/login')} />
        ) : (
          <>
            {/* ── Welcome heading ──────────────────────────── */}
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
                Forgot Password?
              </h2>
              <p
                style={{
                  fontSize: 13,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.52)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* ── Error message ─────────────────────────────── */}
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

            <form onSubmit={handleReset} noValidate>
              {/* ── Email input ───────────────────────────── */}
              <div style={{ marginBottom: 20 }}>
                <AuthInput
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email address"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* ── Send Reset Link button ──────────────────── */}
              <div style={{ marginBottom: 16 }}>
                <AuthSubmitButton id="forgot-submit-btn" loading={isLoading} disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </AuthSubmitButton>
              </div>

              {/* ── OR divider ────────────────────────────── */}
              <div style={{ marginBottom: 16 }}>
                <AuthDivider />
              </div>

              {/* ── Back to Login button ────────────────────── */}
              <div style={{ marginBottom: 20 }}>
                <AuthSecondaryButton id="back-to-login-btn" onClick={() => navigate('/login')}>
                  Back to Login
                </AuthSecondaryButton>
              </div>
            </form>

            {/* ── Bottom Text ─────────────────────────────── */}
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
              Remember your password?{' '}
              <Link
                to="/login"
                id="login-nav-link"
                style={{
                  color: 'rgba(255,175,60,0.90)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.target.style.color = 'rgba(255,200,100,1)')}
                onMouseLeave={(e) => (e.target.style.color = 'rgba(255,175,60,0.90)')}
              >
                Login
              </Link>
            </p>
          </>
        )}
      </AuthGlassCard>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   "Check your email" sub-state
───────────────────────────────────────────────────────── */
function CheckEmailState({ email, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(255,185,80,0.10)',
          border: '1.5px solid rgba(255,185,80,0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 22px rgba(255,185,80,0.15)',
        }}
      >
        <Mail size={26} color="rgba(255,185,80,0.90)" strokeWidth={1.8} />
      </motion.div>

      <h2
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 17,
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 8px',
          letterSpacing: '-0.01em',
        }}
      >
        Check your email
      </h2>

      <p
        style={{
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.55)',
          margin: '0 0 6px',
          lineHeight: 1.55,
        }}
      >
        We've sent a password reset link to
      </p>

      {/* Email address pill */}
      <div
        style={{
          display: 'inline-block',
          padding: '4px 14px',
          borderRadius: 20,
          background: 'rgba(255,185,80,0.08)',
          border: '1px solid rgba(255,185,80,0.22)',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(255,200,100,0.95)',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.01em',
          }}
        >
          {email}
        </span>
      </div>

      <p
        style={{
          fontSize: 12.5,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.40)',
          margin: '0 0 22px',
          lineHeight: 1.55,
        }}
      >
        Open the email and click the link to create a new password. Check your spam folder if you don't see it.
      </p>

      <AuthSecondaryButton onClick={onBack}>Back to Login</AuthSecondaryButton>
    </motion.div>
  );
}
