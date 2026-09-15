import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/structra-logo.png';

/**
 * FloatingAIAssistant
 * Circular FAB at bottom-right. Orange gradient, Structra logo (white).
 * Clicking navigates to /app/assistant.
 * Hidden on the assistant page itself to avoid redundancy.
 *
 * Breathing animation: a subtle, continuous scale pulse (1.0 → 1.06 → 1.0 → 0.96 → 1.0)
 * that gives the button a calm, alive feel. Respects prefers-reduced-motion.
 */

// Detect reduced motion preference once at module load time so it is stable
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function FloatingAIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the assistant page itself
  if (location.pathname.startsWith('/app/assistant')) return null;

  // Breathing keyframe animation
  // Respects prefers-reduced-motion: when enabled, skip the pulse entirely
  const breatheAnimation = prefersReducedMotion
    ? { opacity: 1, scale: 1 }
    : {
        opacity: 1,
        scale: [1, 1.06, 1, 0.96, 1],
      };

  const breatheTransition = prefersReducedMotion
    ? { duration: 0 }
    : {
        scale: {
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
          // Slight delay so the entrance animation settles first
          delay: 0.6,
        },
        opacity: {
          duration: 0.28,
          ease: [0.34, 1.56, 0.64, 1],
        },
      };

  return (
    <motion.button
      id="floating-ai-assistant-btn"
      aria-label="Open AI Assistant"
      onClick={() => navigate('/app/assistant')}
      // Entrance animation
      initial={{ opacity: 0, scale: 0.6 }}
      // Breathing animation merges with the entrance endpoint
      animate={breatheAnimation}
      transition={breatheTransition}
      whileHover={{
        scale: 1.12,
        boxShadow: '0 0 36px rgba(249,115,22,0.60), 0 8px 24px rgba(249,115,22,0.38)',
      }}
      whileTap={{ scale: 0.92 }}
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #ffb347 0%, #f97316 55%, #ea580c 100%)',
        border: '2px solid rgba(255,185,110,0.50)',
        boxShadow: '0 0 22px rgba(249,115,22,0.40), 0 6px 20px rgba(0,0,0,0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 100,
      }}
    >
      <img
        src={logo}
        alt="AI Assistant"
        style={{
          width: 30,
          height: 30,
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)',
          display: 'block',
        }}
      />
    </motion.button>
  );
}
