import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import NavBar from '../landing/NavBar';
import loginBg from '../../assets/login-background.webp';
import logo from '../../assets/structra-logo.png';
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
  const navigate = useNavigate();

  const handleReset = (e) => {
    e.preventDefault();
    // Password reset logic will be implemented later
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
            <AuthSubmitButton id="forgot-submit-btn">Send Reset Link</AuthSubmitButton>
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
      </AuthGlassCard>
    </motion.div>
  );
}
