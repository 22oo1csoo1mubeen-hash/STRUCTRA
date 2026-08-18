import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/structra-logo.png';

/**
 * FloatingAIAssistant
 * Circular FAB at bottom-right. Orange gradient, Structra logo (white).
 * Clicking navigates to /app/assistant.
 * Hidden on the assistant page itself to avoid redundancy.
 */
export default function FloatingAIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the assistant page itself
  if (location.pathname.startsWith('/app/assistant')) return null;

  return (
    <motion.button
      id="floating-ai-assistant-btn"
      aria-label="Open AI Assistant"
      onClick={() => navigate('/app/assistant')}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={{
        scale: 1.10,
        boxShadow: '0 0 36px rgba(249,115,22,0.55), 0 8px 24px rgba(249,115,22,0.35)',
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
