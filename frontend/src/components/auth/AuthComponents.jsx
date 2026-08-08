import { useState } from 'react';
import { motion } from 'framer-motion';

/* ─── Google SVG icon ─────────────────────────────────── */
export function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.311 0-9.822-3.317-11.484-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
    </svg>
  );
}

/* ─── Custom Checkbox ─────────────────────────────────── */
export function AuthCheckbox({ id, checked, onChange, children }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      id={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
      }}
    >
      <motion.div
        whileHover={{ boxShadow: '0 0 8px rgba(255,165,50,0.35)' }}
        transition={{ duration: 0.2 }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: checked
            ? '1.5px solid rgba(255, 185, 80, 0.80)'
            : '1.5px solid rgba(255,255,255,0.28)',
          background: checked
            ? 'rgba(255, 160, 40, 0.18)'
            : 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        {checked && (
          <motion.svg
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            width="11"
            height="8"
            viewBox="0 0 11 8"
            fill="none"
          >
            <path
              d="M1 3.5L4 6.5L10 1"
              stroke="rgba(255,185,80,0.95)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </motion.div>
      <span
        style={{
          color: 'rgba(255,255,255,0.72)',
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 400,
          userSelect: 'none',
        }}
        onClick={(e) => {
          if (e.target.tagName === 'A') {
            e.stopPropagation();
          }
        }}
      >
        {children}
      </span>
    </button>
  );
}

/* ─── Input Field ─────────────────────────────────────── */
export function AuthInput({ id, type = 'text', placeholder, icon: Icon, value, onChange, rightElement }) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const borderColor = focused
    ? 'rgba(255, 255, 255, 0.45)'
    : hovered
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(255, 255, 255, 0.16)';

  const boxShadow = focused
    ? '0 0 0 2px rgba(255, 255, 255, 0.1)'
    : 'none';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left icon */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: focused ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.38)',
          transition: 'color 0.2s ease',
        }}
      >
        <Icon size={17} strokeWidth={1.6} />
      </div>

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'username' : 'off'}
        style={{
          width: '100%',
          padding: '10px 38px 10px 38px',
          background: 'rgba(10, 8, 6, 0.55)',
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          color: '#fff',
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 400,
          letterSpacing: '0.01em',
          outline: 'none',
          boxShadow,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          caretColor: '#ffffff',
        }}
      />

      {/* Right element (e.g. eye toggle) */}
      {rightElement && (
        <div
          style={{
            position: 'absolute',
            right: 14,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {rightElement}
        </div>
      )}
    </div>
  );
}

/* ─── Google Button ───────────────────────────────────── */
export function GoogleButton({ id, onClick, text = "Continue with Google", loading = false, disabled = false }) {
  return (
    <motion.button
      type="button"
      id={id}
      onClick={disabled ? undefined : onClick}
      whileHover={
        !disabled
          ? { scale: 1.02, boxShadow: '0 0 22px rgba(255,255,255,0.10)' }
          : {}
      }
      whileTap={!disabled ? { scale: 0.97 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '9px 16px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.18)',
        color: disabled ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.88)',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
        letterSpacing: '0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {loading ? (
        <>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.70)',
              flexShrink: 0,
            }}
          />
          Connecting to Google…
        </>
      ) : (
        <>
          <GoogleIcon />
          {text}
        </>
      )}
    </motion.button>
  );
}

/* ─── OR Divider ──────────────────────────────────────── */
export function AuthDivider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'rgba(255,255,255,0.12)',
        }}
      />
      <span
        style={{
          color: 'rgba(255,255,255,0.40)',
          fontSize: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 400,
          letterSpacing: '0.08em',
        }}
      >
        OR
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'rgba(255,255,255,0.12)',
        }}
      />
    </div>
  );
}

/* ─── Primary Submit Button ───────────────────────────── */
export function AuthSubmitButton({ id, children, loading = false, disabled = false }) {
  return (
    <motion.button
      type="submit"
      id={id}
      disabled={disabled}
      whileHover={
        !disabled
          ? {
              scale: 1.02,
              boxShadow:
                '0 0 20px rgba(255, 165, 50, 0.20), inset 0 0 16px rgba(255, 160, 40, 0.20)',
              filter: 'brightness(1.05)',
            }
          : {}
      }
      whileTap={!disabled ? { scale: 0.97 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '11px 20px',
        borderRadius: 10,
        background: disabled ? 'rgba(20, 12, 6, 0.45)' : 'rgba(20, 12, 6, 0.65)',
        border: '1px solid rgba(255, 185, 80, 0.55)',
        boxShadow:
          '0 0 12px rgba(255, 165, 50, 0.10), inset 0 0 12px rgba(255, 160, 40, 0.15)',
        color: disabled ? 'rgba(255,255,255,0.55)' : '#ffffff',
        fontSize: 14,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid rgba(255,185,80,0.25)',
              borderTopColor: 'rgba(255,185,80,0.85)',
              animation: 'btnSpin 0.7s linear infinite',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <style>{`@keyframes btnSpin { to { transform: rotate(360deg); } }`}</style>
          {children}
        </>
      ) : (
        <>
          {children}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9H15M15 9L10 4M15 9L10 14"
                stroke="rgba(255,255,255,0.88)"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </>
      )}
    </motion.button>
  );
}


/* ─── Secondary Button ────────────────────────────────── */
export function AuthSecondaryButton({ id, onClick, children }) {
  return (
    <motion.button
      type="button"
      id={id}
      onClick={onClick}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 0 22px rgba(255,255,255,0.10)',
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '9px 16px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.18)',
        color: 'rgba(255,255,255,0.88)',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 9H3M3 9L8 4M3 9L8 14" stroke="rgba(255,255,255,0.88)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </motion.button>
  );
}

/* ─── Glass Card Wrapper ──────────────────────────────── */
export function AuthGlassCard({ children }) {
  return (
    <>
      <style>{`
        @keyframes cardFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 360,
          margin: '0 auto',
          padding: '32px 32px 24px',
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(20, 15, 10, 0.25) 0%, rgba(12, 9, 7, 0.45) 100%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.25)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
          borderLeft: 'none',
          borderRight: 'none',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          boxShadow:
            '0 0 60px rgba(255, 140, 30, 0.12), 0 8px 40px rgba(0,0,0,0.35), inset 0 25px 30px -15px rgba(255, 165, 50, 0.15), inset 0 -25px 30px -15px rgba(255, 165, 50, 0.15)',
          animation: 'cardFadeIn 0.7s ease-out 0.15s both',
        }}
      >
        {children}
      </div>
    </>
  );
}
