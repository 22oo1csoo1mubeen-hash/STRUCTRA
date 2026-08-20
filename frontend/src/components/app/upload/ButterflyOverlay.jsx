import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Enhanced Glowing Butterfly SVG Component
 * Radiant amber/golden wings, luminous body core, 3D wing fluttering.
 */
function GlowingButterfly({ 
  size = 52, 
  glowColor = '#f97316', 
  flapDuration = 0.32,
  prefersReducedMotion = false 
}) {
  const gradId = useMemo(() => `bf-grad-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <svg 
      viewBox="0 0 60 50" 
      width={size} 
      height={size * 0.83} 
      style={{ 
        overflow: 'visible',
        filter: `drop-shadow(0 0 10px rgba(249,115,22,0.95)) drop-shadow(0 0 22px rgba(251,146,60,0.85)) drop-shadow(0 0 38px rgba(234,88,12,0.55))` 
      }}
    >
      <defs>
        <radialGradient id={`${gradId}-wing`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="20%" stopColor="#fef08a" stopOpacity="0.98" />
          <stop offset="50%" stopColor="#f97316" stopOpacity="0.95" />
          <stop offset="80%" stopColor="#ea580c" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#9a3412" stopOpacity="0.7" />
        </radialGradient>
        <linearGradient id={`${gradId}-accent`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#fed7aa" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Left Wing with 3D Flapping Motion */}
      <motion.g
        style={{ transformOrigin: '30px 25px' }}
        animate={prefersReducedMotion ? {} : { scaleX: [1, 0.18, 1], skewY: [0, -8, 0] }}
        transition={{ duration: flapDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Upper Left Wing */}
        <path
          d="M 30 24 C 22 6, 3 3, 4 19 C 5 26, 17 29, 30 25 Z"
          fill={`url(#${gradId}-wing)`}
          stroke="#fff7ed"
          strokeWidth="0.8"
        />
        {/* Wing internal vein patterns */}
        <path
          d="M 30 24 Q 18 15 10 13 M 30 24 Q 15 22 8 20 M 30 24 Q 22 11 16 7"
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity={0.75}
          fill="none"
        />
        {/* Lower Left Wing */}
        <path
          d="M 30 25 C 19 31, 7 39, 13 45 C 19 48, 26 37, 30 27 Z"
          fill={`url(#${gradId}-wing)`}
          stroke="#fff7ed"
          strokeWidth="0.65"
        />
        {/* Inner Wing Glow Highlight */}
        <path
          d="M 29 23 C 21 11, 9 11, 11 20 C 14 24, 22 25, 29 24 Z"
          fill={`url(#${gradId}-accent)`}
          opacity={0.8}
        />
      </motion.g>

      {/* Right Wing with Synchronized Flapping Motion */}
      <motion.g
        style={{ transformOrigin: '30px 25px' }}
        animate={prefersReducedMotion ? {} : { scaleX: [1, 0.18, 1], skewY: [0, 8, 0] }}
        transition={{ duration: flapDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Upper Right Wing */}
        <path
          d="M 30 24 C 38 6, 57 3, 56 19 C 55 26, 43 29, 30 25 Z"
          fill={`url(#${gradId}-wing)`}
          stroke="#fff7ed"
          strokeWidth="0.8"
        />
        {/* Wing internal vein patterns */}
        <path
          d="M 30 24 Q 42 15 50 13 M 30 24 Q 45 22 52 20 M 30 24 Q 38 11 44 7"
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity={0.75}
          fill="none"
        />
        {/* Lower Right Wing */}
        <path
          d="M 30 25 C 41 31, 53 39, 47 45 C 41 48, 34 37, 30 27 Z"
          fill={`url(#${gradId}-wing)`}
          stroke="#fff7ed"
          strokeWidth="0.65"
        />
        {/* Inner Wing Glow Highlight */}
        <path
          d="M 31 23 C 39 11, 51 11, 49 20 C 46 24, 38 25, 31 24 Z"
          fill={`url(#${gradId}-accent)`}
          opacity={0.8}
        />
      </motion.g>

      {/* Radiant Glowing Body Core */}
      <path 
        d="M 30 15 Q 30.8 25 30 35" 
        stroke="#fffbeb" 
        strokeWidth="2.4" 
        strokeLinecap="round" 
        style={{ filter: 'drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 10px #f97316)' }}
      />
      <circle cx="30" cy="14" r="2.4" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 6px #fef08a)' }} />

      {/* Elegant Antennae with Glowing Tips */}
      <path 
        d="M 30 14 Q 24 7 19 5 M 30 14 Q 36 7 41 5" 
        stroke="#fed7aa" 
        strokeWidth="1.3" 
        strokeLinecap="round" 
        fill="none" 
      />
      <circle cx="19" cy="5" r="1.4" fill="#fff7ed" style={{ filter: 'drop-shadow(0 0 5px #f97316)' }} />
      <circle cx="41" cy="5" r="1.4" fill="#fff7ed" style={{ filter: 'drop-shadow(0 0 5px #f97316)' }} />
    </svg>
  );
}

/**
 * ButterflyOverlay
 * Spawns butterflies at the center and gracefully disperses them outwards
 * to the corners and outer borders so the central text/checklist remains crystal clear.
 */
export default function ButterflyOverlay() {
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 7 Butterflies spawning at center and dispersing to corners & borders
  const butterflies = useMemo(() => [
    // 1. Top-Left Corner
    {
      id: 'bf-top-left',
      size: 56,
      flapDuration: 0.32,
      initialPos: { top: '38%', left: '46%' },
      path: {
        x: [0, -110, -220, -290, -240, -110, 0],
        y: [0, -75, -155, -210, -180, -75, 0],
        rotate: [0, -24, -14, -28, -12, -24, 0],
        scale: [0.4, 0.85, 1.1, 1.05, 1.0, 0.85, 0.4],
        opacity: [0, 0.95, 1, 0.85, 0.9, 0.95, 0],
      },
      duration: 12,
      delay: 0.1,
    },
    // 2. Top-Right Corner
    {
      id: 'bf-top-right',
      size: 60,
      flapDuration: 0.35,
      initialPos: { top: '36%', left: '54%' },
      path: {
        x: [0, 115, 230, 300, 250, 115, 0],
        y: [0, -70, -150, -205, -175, -70, 0],
        rotate: [0, 24, 14, 26, 12, 24, 0],
        scale: [0.4, 0.9, 1.15, 1.08, 1.0, 0.9, 0.4],
        opacity: [0, 0.95, 1, 0.85, 0.9, 0.95, 0],
      },
      duration: 13,
      delay: 0.8,
    },
    // 3. Bottom-Left Corner
    {
      id: 'bf-bottom-left',
      size: 52,
      flapDuration: 0.30,
      initialPos: { top: '55%', left: '44%' },
      path: {
        x: [0, -115, -230, -295, -245, -115, 0],
        y: [0, 80, 160, 215, 180, 80, 0],
        rotate: [0, -22, -12, -20, -10, -22, 0],
        scale: [0.4, 0.85, 1.08, 1.02, 0.95, 0.85, 0.4],
        opacity: [0, 0.9, 1, 0.8, 0.88, 0.9, 0],
      },
      duration: 12.5,
      delay: 1.6,
    },
    // 4. Bottom-Right Corner
    {
      id: 'bf-bottom-right',
      size: 54,
      flapDuration: 0.33,
      initialPos: { top: '54%', left: '56%' },
      path: {
        x: [0, 120, 235, 305, 250, 120, 0],
        y: [0, 75, 155, 210, 175, 75, 0],
        rotate: [0, 22, 12, 22, 10, 22, 0],
        scale: [0.4, 0.88, 1.1, 1.05, 0.98, 0.88, 0.4],
        opacity: [0, 0.9, 1, 0.82, 0.9, 0.9, 0],
      },
      duration: 13.5,
      delay: 2.3,
    },
    // 5. Top Border (Upper Crest)
    {
      id: 'bf-top-crest',
      size: 50,
      flapDuration: 0.29,
      initialPos: { top: '32%', left: '50%' },
      path: {
        x: [0, -45, 55, -25, 40, -45, 0],
        y: [0, -120, -210, -250, -220, -120, 0],
        rotate: [0, -14, 16, -10, 12, -14, 0],
        scale: [0.4, 0.85, 1.05, 1.0, 0.95, 0.85, 0.4],
        opacity: [0, 0.9, 1, 0.85, 0.9, 0.9, 0],
      },
      duration: 11,
      delay: 3.1,
    },
    // 6. Far-Right Border
    {
      id: 'bf-right-border',
      size: 55,
      flapDuration: 0.34,
      initialPos: { top: '46%', left: '55%' },
      path: {
        x: [0, 140, 260, 320, 270, 140, 0],
        y: [0, -35, 30, -15, 25, -35, 0],
        rotate: [0, 18, -12, 16, -8, 18, 0],
        scale: [0.4, 0.9, 1.12, 1.05, 0.98, 0.9, 0.4],
        opacity: [0, 0.95, 1, 0.85, 0.92, 0.95, 0],
      },
      duration: 14,
      delay: 3.9,
    },
    // 7. Far-Left Border
    {
      id: 'bf-left-border',
      size: 53,
      flapDuration: 0.31,
      initialPos: { top: '48%', left: '45%' },
      path: {
        x: [0, -140, -250, -315, -260, -140, 0],
        y: [0, 30, -30, 20, -20, 30, 0],
        rotate: [0, -18, 14, -14, 10, -18, 0],
        scale: [0.4, 0.88, 1.1, 1.02, 0.96, 0.88, 0.4],
        opacity: [0, 0.92, 1, 0.85, 0.9, 0.92, 0],
      },
      duration: 12.8,
      delay: 4.6,
    },
  ], []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: -25,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 25,
        borderRadius: 22,
      }}
      aria-hidden="true"
    >
      {butterflies.map((bf) => (
        <motion.div
          key={bf.id}
          style={{
            position: 'absolute',
            ...bf.initialPos,
            pointerEvents: 'none',
            transformOrigin: 'center center',
          }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={prefersReducedMotion ? { opacity: [0.4, 0.85, 0.4] } : {
            x: bf.path.x,
            y: bf.path.y,
            rotate: bf.path.rotate,
            scale: bf.path.scale,
            opacity: bf.path.opacity,
          }}
          transition={prefersReducedMotion ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : {
            duration: bf.duration,
            repeat: Infinity,
            delay: bf.delay,
            ease: 'easeInOut',
          }}
        >
          <GlowingButterfly 
            size={bf.size} 
            flapDuration={bf.flapDuration}
            prefersReducedMotion={prefersReducedMotion}
          />
        </motion.div>
      ))}

      {/* Subtle glowing sparks drifting along the borders */}
      {[
        { top: '10%', left: '15%' },
        { top: '12%', right: '18%' },
        { top: '85%', left: '16%' },
        { top: '88%', right: '15%' },
        { top: '48%', left: '8%' },
        { top: '50%', right: '8%' },
      ].map((pos, i) => (
        <motion.div
          key={`corner-spark-${i}`}
          style={{
            position: 'absolute',
            ...pos,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 10px #f97316, 0 0 20px #fb923c',
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 0.4 } : {
            scale: [0.8, 1.5, 0.9, 1.4, 0.8],
            opacity: [0.2, 0.9, 0.3, 0.85, 0.2],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 5 + i * 0.8,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
