import { motion } from 'framer-motion';

export function CloudUploadIcon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, position: 'absolute' }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <motion.svg
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        width="80"
        height="72"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f97316"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.6))' }}
      >
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </motion.svg>
    </motion.div>
  );
}

export function AISparkIcon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, position: 'absolute' }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '1px dashed rgba(249,115,22,0.4)',
          borderTop: '2px solid rgba(249,115,22,0.8)',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 70,
          height: 70,
          background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 60%)',
          filter: 'blur(8px)'
        }}
      />
      <motion.svg
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        width="60"
        height="60"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f97316"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 15px rgba(249,115,22,0.8))' }}
      >
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="M5.6 5.6l12.8 12.8" />
        <path d="M18.4 5.6L5.6 18.4" />
      </motion.svg>
    </motion.div>
  );
}

export function ShieldValidationIcon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, position: 'absolute' }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <motion.svg
        width="68"
        height="68"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.5))' }}
      >
        <motion.path 
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.path 
          d="M9 12l2 2 4-4" 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8, ease: 'easeOut' }}
          strokeWidth="2.5"
        />
      </motion.svg>
    </motion.div>
  );
}

export function SuccessReadyIcon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, position: 'absolute' }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <motion.svg
        width="110"
        height="110"
        viewBox="0 0 120 120"
        style={{ position: 'absolute' }}
      >
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="#f97316"
          strokeWidth="3.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ filter: 'drop-shadow(0 0 8px rgba(249,115,22,0.8))' }}
        />
      </motion.svg>
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10b981"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.5))' }}
      >
        <motion.path 
          d="M20 6L9 17l-5-5" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
        />
      </motion.svg>
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#f97316',
            boxShadow: '0 0 8px #f97316',
            top: 50 - 2 + Math.sin(i * Math.PI / 2 + Math.PI/4) * 60,
            left: 50 - 2 + Math.cos(i * Math.PI / 2 + Math.PI/4) * 60,
          }}
        />
      ))}
    </motion.div>
  );
}
