import { motion } from 'framer-motion';
import FeatureCard from './FeatureCard';

/* ─── Feature data ──────────────────────────────────── */
const FEATURES = [
  {
    id: 'extract',
    title: 'Extract',
    description: 'Capture every detail\nwith AI precision.',
    icon: <ExtractIcon />,
  },
  {
    id: 'understand',
    title: 'Understand',
    description: 'AI understands and\nstructures your data.',
    icon: <UnderstandIcon />,
  },
  {
    id: 'organize',
    title: 'Organize',
    description: 'Organize and access\ninformation effortlessly.',
    icon: <OrganizeIcon />,
  },
];

/**
 * FeatureStrip
 * Bottom-anchored glass container with three feature columns
 */
export default function FeatureStrip() {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 flex justify-center"
      style={{ paddingBottom: 32, paddingLeft: 32, paddingRight: 32 }}
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
          padding: '18px 24px',
          maxWidth: 800,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
        }}
      >
        {/* Fading top border */}
        <div style={{
          position: 'absolute', top: 0, left: '-5%', right: '-5%', height: 1,
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)'
        }} />
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
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
            {/* Divider between cards */}
            {idx < FEATURES.length - 1 && (
              <div
                style={{
                  width: 1,
                  background: 'rgba(255,255,255,0.08)',
                  margin: '0 24px',
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

/* ─── SVG Icons (matching the reference amber/warm tone) ── */

function ExtractIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Document scan frame corners */}
      <path
        d="M3 7V4a1 1 0 0 1 1-1h3"
        stroke="rgba(210,170,100,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M17 3h3a1 1 0 0 1 1 1v3"
        stroke="rgba(210,170,100,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M21 17v3a1 1 0 0 1-1 1h-3"
        stroke="rgba(210,170,100,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 21H4a1 1 0 0 1-1-1v-3"
        stroke="rgba(210,170,100,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Inner document lines */}
      <path
        d="M8 12h8M8 15.5h5"
        stroke="rgba(210,170,100,0.65)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* S-shape suggestion */}
      <rect
        x="8"
        y="7.5"
        width="8"
        height="2.5"
        rx="1.2"
        fill="rgba(210,170,100,0.28)"
        stroke="rgba(210,170,100,0.65)"
        strokeWidth="1"
      />
    </svg>
  );
}

function UnderstandIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Three stacked layers */}
      <path
        d="M12 3L21 8L12 13L3 8L12 3Z"
        stroke="rgba(210,170,100,0.85)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="rgba(210,170,100,0.12)"
      />
      <path
        d="M3 12L12 17L21 12"
        stroke="rgba(210,170,100,0.65)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 16L12 21L21 16"
        stroke="rgba(210,170,100,0.40)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrganizeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield */}
      <path
        d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z"
        stroke="rgba(210,170,100,0.85)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="rgba(210,170,100,0.10)"
      />
      {/* Checkmark */}
      <path
        d="M9 12.5L11 14.5L15 10.5"
        stroke="rgba(210,170,100,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
