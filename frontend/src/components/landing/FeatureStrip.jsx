import { motion } from 'framer-motion';
import FeatureCard from './FeatureCard';
import { useLanding } from './LandingLayoutContext';

/* ─── Feature data ──────────────────────────────────── */
const FEATURES = [
  {
    id: 'extract',
    title: 'Extract',
    description: 'Capture every detail\nwith AI precision.',
    mobileDescription: 'Capture every detail with AI precision.',
    icon: (s) => <ExtractIcon s={s} />,
  },
  {
    id: 'understand',
    title: 'Understand',
    description: 'AI understands and\nstructures your data.',
    mobileDescription: 'AI understands and structures your data.',
    icon: (s) => <UnderstandIcon s={s} />,
  },
  {
    id: 'organize',
    title: 'Organize',
    description: 'Organize and access\ninformation effortlessly.',
    mobileDescription: 'Organize and access information effortlessly.',
    icon: (s) => <OrganizeIcon s={s} />,
  },
];

/**
 * FeatureStrip
 * Desktop: Bottom-anchored 3-column glass container (100% preserved)
 * Mobile Portrait: Stacked 3-row frosted glass card exactly replicating the mobile mockup
 * Mobile Landscape: Compact horizontal bar
 */
export default function FeatureStrip() {
  const { s, isMobile, isLandscape, isSmallMobile } = useLanding();

  // ── DESKTOP RENDERING (100% Preserved) ─────────────────
  if (!isMobile) {
    return (
      <motion.div
        className="absolute left-0 right-0 flex justify-center"
        style={{
          bottom: `${Math.max(16, Math.round(20 * s))}px`,
          paddingLeft: '24px',
          paddingRight: '24px',
          zIndex: 10,
        }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Transparent container with fading top border */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            padding: `${Math.round(12 * s)}px ${Math.round(20 * s)}px`,
            maxWidth: `${Math.round(820 * s)}px`,
            width: '100%',
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: Math.round(16 * s),
          }}
        >
          {/* Fading top border */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-5%',
              right: '-5%',
              height: 1,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)',
            }}
          />
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.id}
              style={{
                display: 'flex',
                flexDirection: 'row',
                flex: 1,
                alignItems: 'stretch',
              }}
            >
              <FeatureCard
                icon={feature.icon(s)}
                title={feature.title}
                description={feature.description}
                s={s}
              />
              {/* Divider between cards */}
              {idx < FEATURES.length - 1 && (
                <div
                  style={{
                    width: 1,
                    background: 'rgba(255,255,255,0.08)',
                    margin: `0 ${Math.round(20 * s)}px`,
                    alignSelf: 'stretch',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── MOBILE LANDSCAPE (Compact Row) ─────────────────────
  if (isLandscape) {
    return (
      <motion.div
        className="absolute left-0 right-0 flex justify-center"
        style={{
          bottom: 'max(6px, env(safe-area-inset-bottom, 6px))',
          paddingLeft: '16px',
          paddingRight: '16px',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '6px 14px',
            maxWidth: 620,
            width: '100%',
            background: 'rgba(18, 22, 28, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.id}
              style={{
                display: 'flex',
                flexDirection: 'row',
                flex: 1,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: 8,
                  background: 'rgba(28, 22, 17, 0.65)',
                  border: '1px solid rgba(240, 155, 60, 0.40)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {feature.icon(0.7)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: '#ffffff',
                    textTransform: 'uppercase',
                  }}
                >
                  {feature.title}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '9.5px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.65)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {feature.mobileDescription}
                </span>
              </div>
              {idx < FEATURES.length - 1 && (
                <div
                  style={{
                    width: 1,
                    height: 28,
                    background: 'rgba(255,255,255,0.08)',
                    margin: '0 8px',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── MOBILE PORTRAIT (Exact Match to User Attached Mockup with Fluid Animation) ──
  return (
    <motion.div
      className="absolute left-0 right-0 flex justify-center"
      style={{
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        paddingLeft: '18px',
        paddingRight: '18px',
        zIndex: 10,
        pointerEvents: 'auto',
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 390,
          padding: isSmallMobile ? '12px 14px' : '14px 18px',
          background: 'rgba(18, 22, 28, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderRadius: 22,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.48), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Subtle luminous glass sheen sweep across card */}
        <motion.span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '60%',
            height: '100%',
            background:
              'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.07), transparent)',
            transform: 'skewX(-20deg)',
            pointerEvents: 'none',
          }}
          animate={{
            left: ['-100%', '220%'],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            repeatDelay: 3.5,
            ease: 'easeInOut',
          }}
        />

        {FEATURES.map((feature, idx) => (
          <div key={feature.id}>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.35,
                delay: 0.18 + idx * 0.08,
                ease: 'easeOut',
              }}
              whileTap={{ scale: 0.985 }}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {/* Rounded amber glowing icon container */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: isSmallMobile ? 40 : 44,
                  height: isSmallMobile ? 40 : 44,
                  minWidth: isSmallMobile ? 40 : 44,
                  borderRadius: 12,
                  background: 'rgba(28, 22, 17, 0.65)',
                  border: '1px solid rgba(240, 155, 60, 0.45)',
                  boxShadow:
                    '0 0 14px rgba(235, 140, 50, 0.22), inset 0 0 8px rgba(235, 140, 50, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {feature.icon(isSmallMobile ? 0.9 : 1)}
              </motion.div>

              {/* Title & Description */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  marginLeft: 14,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: isSmallMobile ? '12.5px' : '13.5px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#ffffff',
                    lineHeight: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  {feature.title}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: isSmallMobile ? '11px' : '12px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.68)',
                    marginTop: 3,
                    lineHeight: 1.3,
                  }}
                >
                  {feature.mobileDescription}
                </span>
              </div>
            </motion.div>

            {/* Subtle divider line between rows */}
            {idx < FEATURES.length - 1 && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{
                  duration: 0.35,
                  delay: 0.22 + idx * 0.08,
                  ease: 'easeOut',
                }}
                style={{
                  height: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  margin: isSmallMobile ? '8px 0' : '10px 0',
                  transformOrigin: 'left',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── SVG Icons (matching the reference amber/warm tone) ── */

function ExtractIcon({ s = 1 }) {
  const sz = Math.round(22 * s);
  return (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 7V4a1 1 0 0 1 1-1h3"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M17 3h3a1 1 0 0 1 1 1v3"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M21 17v3a1 1 0 0 1-1 1h-3"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M7 21H4a1 1 0 0 1-1-1v-3"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8 10h8M8 14h8"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UnderstandIcon({ s = 1 }) {
  const sz = Math.round(22 * s);
  return (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3L21 8L12 13L3 8L12 3Z"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill="rgba(246, 164, 62, 0.12)"
      />
      <path
        d="M3 12L12 17L21 12"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 16L12 21L21 16"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrganizeIcon({ s = 1 }) {
  const sz = Math.round(22 * s);
  return (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill="rgba(246, 164, 62, 0.10)"
      />
      <path
        d="M9 12.5L11 14.5L15 10.5"
        stroke="#f6a43e"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
