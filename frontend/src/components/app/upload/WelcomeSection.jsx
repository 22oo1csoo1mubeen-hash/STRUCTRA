import { motion } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';

function getGreetingIST() {
  const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false };
  const formatter = new Intl.DateTimeFormat([], options);
  const h = parseInt(formatter.format(new Date()), 10);
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * WelcomeSection
 * Time-based greeting. Warm white text on the dark glass/bg atmosphere.
 */
export default function WelcomeSection() {
  const { user } = useAuth();
  
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] 
                      || user?.email?.split('@')[0] 
                      || 'User';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{ padding: '10px 28px 22px 28px' }}
    >
      <h1
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: 'rgba(255,250,242,0.96)',
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '-0.025em',
          lineHeight: 1.18,
          marginBottom: 9,
          textShadow: '0 2px 16px rgba(0,0,0,0.35), 0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(249,115,22,0.3)',
        }}
      >
        {getGreetingIST()}, {displayName}..
      </h1>
      <p
        style={{
          fontSize: 14.5,
          fontWeight: 400,
          color: 'rgba(255,232,205,0.65)',
          fontFamily: "'Inter', system-ui, sans-serif",
          lineHeight: 1.55,
          maxWidth: 420,
          textShadow: '0 1px 8px rgba(0,0,0,0.28)',
        }}
      >
        Upload your documents and let AI extract structured information with precision.
      </p>
    </motion.div>
  );
}
