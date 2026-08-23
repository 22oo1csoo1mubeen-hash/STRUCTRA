import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Mail, MailCheck, RefreshCw } from 'lucide-react';
import NavBar from '../landing/NavBar';
import loginBg from '../../assets/login-background.webp';
import logo from '../../assets/structra-logo.png';
import { useAuth } from '../../hooks/useAuth';
import {
  AuthInput,
  GoogleButton,
  AuthDivider,
  AuthSubmitButton,
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

export default function RegisterPage() {
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  /**
   * emailPendingConfirmation:
   *   null          → form is visible
   *   string (email) → "Check your inbox" state is shown
   */
  const [emailPendingConfirmation, setEmailPendingConfirmation] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg]         = useState('');

  const { register, resendConfirmation, loginWithGoogle, session, loading } = useAuth();
  const navigate = useNavigate();

  // Tracks whether the Google OAuth redirect is in progress
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  /* ── Auth guard ─────────────────────────────────────────
     Loading: render nothing (avoid flash).
     Already authenticated: send to the app.
  ────────────────────────────────────────────────────── */
  if (loading) return null;
  if (session) return <Navigate to="/app/upload" replace />;

  /* ── Form submit ────────────────────────────────────── */
  const handleRegister = async (e) => {
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
    const { error, emailSent, duplicateEmail } = await register(email, password, fullName);

    if (error) {
      setErrorMsg(error.message ?? 'Registration failed. Please try again.');
      setIsLoading(false);
      return;
    }

    if (duplicateEmail) {
      setErrorMsg(
        'An account with this email already exists. Please log in instead.'
      );
      setIsLoading(false);
      return;
    }

    if (emailSent) {
      // Show the "Check your inbox" state — do NOT treat user as authenticated.
      setEmailPendingConfirmation(email);
      setIsLoading(false);
      return;
    }

    // Email confirmation disabled in Supabase dashboard →
    // session was immediately created; go straight to the app.
    navigate('/app/upload');
  };

  /* ── Resend confirmation ────────────────────────────── */
  const handleResend = async () => {
    if (!emailPendingConfirmation) return;
    setResendMsg('');
    setResendLoading(true);
    const { error } = await resendConfirmation(emailPendingConfirmation);
    setResendLoading(false);
    if (error) {
      setResendMsg('Could not resend the email. Please try again shortly.');
    } else {
      setResendMsg('Confirmation email resent. Please check your inbox.');
    }
  };

  /* ── Google OAuth ───────────────────────────────────── */
  const handleGoogleLogin = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    // On RegisterPage there is no "Remember Me" checkbox, so we pass false
    // to default to a session-only login (consistent with email signup).
    const { error } = await loginWithGoogle(false);
    if (error) {
      setGoogleError('Could not connect to Google. Please try again.');
      setGoogleLoading(false);
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

  /* ── Shared page shell ──────────────────────────────── */
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

        {/* ══════════════════════════════════════
            STATE A — Check your email
        ══════════════════════════════════════ */}
        {emailPendingConfirmation ? (
          <CheckEmailState
            email={emailPendingConfirmation}
            resendLoading={resendLoading}
            resendMsg={resendMsg}
            onResend={handleResend}
          />
        ) : (
          /* ══════════════════════════════════════
             STATE B — Registration form
          ══════════════════════════════════════ */
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 18, fontWeight: 700, color: '#ffffff',
                margin: '0 0 4px 0', letterSpacing: '-0.01em',
              }}>
                Create Your Account
              </h2>
              <p style={{
                fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 400, color: 'rgba(255,255,255,0.52)', margin: 0,
              }}>
                Sign up to get started
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
                {/* If it's a duplicate-email error, provide a quick path to login */}
                {errorMsg.includes('already exists') && (
                  <>
                    {' '}
                    <Link
                      to="/login"
                      style={{ color: 'rgba(255,185,80,0.90)', fontWeight: 500, textDecoration: 'none' }}
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Google OAuth error */}
            {googleError && (
              <div
                role="alert"
                style={{
                  marginBottom: 14, padding: '9px 14px', borderRadius: 8,
                  background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.35)',
                  color: 'rgba(255,140,140,0.95)', fontSize: 12.5,
                  fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.4,
                }}
              >
                {googleError}
              </div>
            )}

            <form onSubmit={handleRegister} noValidate>
              <div style={{ marginBottom: 16 }}>
                <GoogleButton
                  id="google-register-btn"
                  onClick={handleGoogleLogin}
                  loading={googleLoading}
                  disabled={googleLoading || isLoading}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <AuthDivider />
              </div>

              {/* Full Name */}
              <div style={{ marginBottom: 12 }}>
                <AuthInput
                  id="register-fullname"
                  type="text"
                  placeholder="Full Name"
                  icon={User}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 12 }}>
                <AuthInput
                  id="register-email"
                  type="email"
                  placeholder="Email"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 12 }}>
                <AuthInput
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightElement={togglePassword}
                  autoComplete="new-password"
                />
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 16 }}>
                <AuthInput
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  rightElement={toggleConfirmPassword}
                  autoComplete="new-password"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <AuthSubmitButton id="register-submit-btn" loading={isLoading} disabled={isLoading}>
                  {isLoading ? 'Creating account…' : 'Register'}
                </AuthSubmitButton>
              </div>
            </form>

            <p style={{
              textAlign: 'center', fontSize: 13,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 400, color: 'rgba(255,255,255,0.52)', margin: 0,
            }}>
              Already have an account?{' '}
              <Link
                to="/login" id="login-nav-link"
                style={{
                  color: 'rgba(255,175,60,0.90)', textDecoration: 'none',
                  fontWeight: 500, transition: 'color 0.2s ease',
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
   Replaces the form once signUp returns emailSent=true.
───────────────────────────────────────────────────────── */
function CheckEmailState({ email, resendLoading, resendMsg, onResend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center' }}
    >
      {/* Mail icon */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,185,80,0.10)',
          border: '1.5px solid rgba(255,185,80,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 22px rgba(255,185,80,0.15)',
        }}
      >
        <MailCheck size={26} color="rgba(255,185,80,0.90)" strokeWidth={1.8} />
      </motion.div>

      <h2 style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 17, fontWeight: 700, color: '#ffffff',
        margin: '0 0 8px', letterSpacing: '-0.01em',
      }}>
        Account almost ready
      </h2>

      <p style={{
        fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
        color: 'rgba(255,255,255,0.55)', margin: '0 0 6px', lineHeight: 1.55,
      }}>
        We've sent a confirmation link to
      </p>

      {/* Email address pill */}
      <div style={{
        display: 'inline-block', padding: '4px 14px', borderRadius: 20,
        background: 'rgba(255,185,80,0.08)', border: '1px solid rgba(255,185,80,0.22)',
        marginBottom: 14,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: 'rgba(255,200,100,0.95)',
          fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.01em',
        }}>
          {email}
        </span>
      </div>

      <p style={{
        fontSize: 12.5, fontFamily: "'Inter', system-ui, sans-serif",
        color: 'rgba(255,255,255,0.40)', margin: '0 0 22px', lineHeight: 1.55,
      }}>
        Please confirm your email address to activate your STRUCTRA account. Check your spam folder if you don't see it.
      </p>

      {/* Resend button */}
      <motion.button
        type="button"
        onClick={onResend}
        disabled={resendLoading}
        whileHover={!resendLoading ? { scale: 1.02 } : {}}
        whileTap={!resendLoading ? { scale: 0.97 } : {}}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: resendLoading ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.80)',
          fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 500, cursor: resendLoading ? 'default' : 'pointer',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          marginBottom: 10,
          transition: 'color 0.2s ease',
        }}
      >
        {resendLoading
          ? <><SpinnerInline /> Sending…</>
          : <><RefreshCw size={14} strokeWidth={2} /> Resend confirmation email</>
        }
      </motion.button>

      {/* Feedback from resend action */}
      {resendMsg && (
        <p style={{
          fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif",
          color: resendMsg.startsWith('Could') ? 'rgba(255,140,140,0.85)' : 'rgba(130,220,160,0.85)',
          margin: '0 0 10px', lineHeight: 1.4, textAlign: 'center',
        }}>
          {resendMsg}
        </p>
      )}

      <Link
        to="/login"
        style={{
          display: 'block', textAlign: 'center', marginTop: 4,
          fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,175,60,0.80)', textDecoration: 'none',
          fontWeight: 400, transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.target.style.color = 'rgba(255,200,100,1)')}
        onMouseLeave={(e) => (e.target.style.color = 'rgba(255,175,60,0.80)')}
      >
        Back to Login
      </Link>
    </motion.div>
  );
}

/* Tiny inline spinner for the resend button */
function SpinnerInline() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
      style={{
        display: 'inline-block',
        width: 14, height: 14, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)',
        borderTopColor: 'rgba(255,255,255,0.70)',
      }}
    />
  );
}
