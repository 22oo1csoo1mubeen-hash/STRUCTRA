import { useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = (e) => {
    e.preventDefault();
    // Registration logic will be implemented later
  };

  const handleGoogleRegister = () => {
    // Google OAuth logic will be implemented later
  };

  const togglePassword = (
    <motion.button
      type="button"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
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

  const toggleConfirmPassword = (
    <motion.button
      type="button"
      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
      onClick={() => setShowConfirmPassword((v) => !v)}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
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
            Create Your Account
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
            Sign up to get started
          </p>
        </div>

        <form onSubmit={handleRegister} noValidate>
          {/* ── Google button ─────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <GoogleButton id="google-register-btn" onClick={handleGoogleRegister} />
          </div>

          {/* ── OR divider ────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <AuthDivider />
          </div>

          {/* ── Username input ───────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <AuthInput
              id="register-username"
              type="text"
              placeholder="Username"
              icon={User}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* ── Password input ────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <AuthInput
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightElement={togglePassword}
            />
          </div>

          {/* ── Confirm Password input ────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <AuthInput
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              rightElement={toggleConfirmPassword}
            />
          </div>



          {/* ── Register button ──────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <AuthSubmitButton id="register-submit-btn">Register</AuthSubmitButton>
          </div>
        </form>

        {/* ── Login link ─────────────────────────────── */}
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
          Already have an account?{' '}
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
