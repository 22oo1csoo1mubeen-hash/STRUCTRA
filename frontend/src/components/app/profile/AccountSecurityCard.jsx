import { useState } from 'react';
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
} from 'lucide-react';

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

// Unified STRUCTRA glassmorphism card style
const glassCardStyle = {
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
};

export default function AccountSecurityCard({ user = null }) {
  const userEmail = user?.email || 'ramulapentaramakotesh@gmail.com';

  // Modal states for frontend-only interactive flows
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Active sessions local state
  const [sessions, setSessions] = useState([
    {
      id: 'session-1',
      device: 'Windows PC (Chrome)',
      icon: Laptop,
      location: 'Hyderabad, India',
      ip: '103.24.88.12',
      lastActive: 'Active now',
      isCurrent: true,
    },
    {
      id: 'session-2',
      device: 'Android Smartphone (Chrome)',
      icon: Smartphone,
      location: 'Hyderabad, India',
      ip: '103.24.88.19',
      lastActive: '2 hours ago',
      isCurrent: false,
    },
  ]);

  const handleRevokeSession = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // Form states for password modal
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currPassword || !newPassword) {
      setPasswordNotice('Please fill in all required fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice('New passwords do not match.');
      return;
    }
    setPasswordNotice('Password updated locally.');
    setTimeout(() => {
      setShowPasswordModal(false);
      setPasswordNotice('');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 900);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        width: '100%',
      }}
    >
      {/* ── CARD 1: Sign-in Method ── */}
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
                      background: 'rgba(74,222,128,0.12)',
                      border: '1px solid rgba(74,222,128,0.25)',
                      color: '#4ade80',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Active
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
                  Used to sign in
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={18} color="#4ade80" />
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <MoreVertical size={16} />
              </button>
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
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.25)',
                      color: '#60a5fa',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Active
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
                  Used for account recovery
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.button
                onClick={() => setShowPasswordModal(true)}
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
                Use Password
              </motion.button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── CARD 2: Password ── */}
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
                Last changed: 21 Aug 2026
              </span>
            </div>
          </div>

          <motion.button
            onClick={() => setShowPasswordModal(true)}
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
            Change Password
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
            onClick={() => setShowActivityModal(true)}
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

        {/* Logged-in Devices List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map((sess) => {
            const IconComponent = sess.icon;
            return (
              <div
                key={sess.id}
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
                      background: sess.isCurrent
                        ? 'rgba(74,222,128,0.10)'
                        : 'rgba(59,130,246,0.10)',
                      border: sess.isCurrent
                        ? '1px solid rgba(74,222,128,0.25)'
                        : '1px solid rgba(59,130,246,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent
                      size={18}
                      color={sess.isCurrent ? '#4ade80' : '#60a5fa'}
                    />
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
                        {sess.device}
                      </span>
                      {sess.isCurrent && (
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
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                        {sess.location}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>•</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                        IP: {sess.ip}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>•</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: sess.isCurrent ? '#4ade80' : 'rgba(255,255,255,0.45)',
                          fontWeight: sess.isCurrent ? 500 : 400,
                        }}
                      >
                        {sess.lastActive}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {sess.isCurrent ? (
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
                  ) : (
                    <motion.button
                      onClick={() => handleRevokeSession(sess.id)}
                      whileHover={{ scale: 1.03, backgroundColor: 'rgba(239,68,68,0.16)' }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        border: '1px solid rgba(239,68,68,0.35)',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#ef4444',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Sign Out Device
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })}
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
              Recent Sign-in: Windows (Chrome) • Hyderabad, India • Today, 04:32 PM
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

      {/* ── MODAL 1: Change Password (UI-Only) ── */}
      <AnimatePresence>
        {showPasswordModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
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
                background: '#13131a',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
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
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#ffffff',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Change Password
                  </h3>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {/* Current Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    Current Password
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showCurr ? 'text' : 'password'}
                      value={currPassword}
                      onChange={(e) => setCurrPassword(e.target.value)}
                      placeholder="Enter current password"
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
                      placeholder="Enter new password"
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
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={{
                      width: '100%',
                      height: 42,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      padding: '0 12px',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {passwordNotice && (
                  <span
                    style={{
                      fontSize: 12,
                      color: passwordNotice.includes('updated') ? '#4ade80' : '#ef4444',
                    }}
                  >
                    {passwordNotice}
                  </span>
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
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      background:
                        'linear-gradient(135deg, #ff9838 0%, #f97316 50%, #ea580c 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: View All Activity (UI-Only) ── */}
      <AnimatePresence>
        {showActivityModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
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
                maxWidth: 480,
                borderRadius: 18,
                background: '#13131a',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
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
                    <Globe size={18} color="#f97316" />
                  </div>
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
                </div>
                <button
                  onClick={() => setShowActivityModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={16} color="#4ade80" />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>
                      Sign-in via Google Auth
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                      Windows (Chrome) • Today, 04:32 PM • IP: 103.24.88.12
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={16} color="#4ade80" />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>
                      Sign-in via Email & Password
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                      Android (Chrome) • Yesterday, 02:14 PM • IP: 103.24.88.19
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={() => setShowActivityModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
