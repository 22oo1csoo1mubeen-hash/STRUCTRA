import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import NavBar from '../landing/NavBar';
import loginBg from '../../assets/login-background.webp';
import logo from '../../assets/structra-logo.png';
import {
  AuthCheckbox,
  AuthInput,
  GoogleButton,
  AuthDivider,
  AuthSubmitButton,
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Navigate to the upload section of the main app
    navigate('/app/upload');
  };

  const handleGoogleLogin = () => {
    // Google OAuth logic will be implemented later
    navigate('/app/upload');
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

        <form onSubmit={handleLogin} noValidate>
          {/* ── Google button ─────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <GoogleButton id="google-login-btn" onClick={handleGoogleLogin} />
          </div>

          {/* ── OR divider ────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <AuthDivider />
          </div>

          {/* ── Email input ───────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <AuthInput
              id="login-email"
              type="text"
              placeholder="Username or Email"
              icon={User}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* ── Password input ────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <AuthInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightElement={eyeToggle}
            />
          </div>

          {/* ── Remember me + Forgot password ────────── */}
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

          {/* ── Login button ──────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <AuthSubmitButton id="login-submit-btn">Login</AuthSubmitButton>
          </div>
        </form>

        {/* ── Register link ─────────────────────────────── */}
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
