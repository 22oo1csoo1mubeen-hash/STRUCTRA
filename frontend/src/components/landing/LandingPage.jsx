import NavBar from './NavBar';
import HeroSection from './HeroSection';
import FeatureStrip from './FeatureStrip';
import bgImage from '../../assets/bg.webp';

/**
 * LandingPage
 * Full-viewport container. Layers (bottom to top):
 *   1. Background image (object-fit: cover)
 *   2. Subtle dark overlay (readability)
 *   3. NavBar (absolute, top)
 *   4. HeroSection (absolute, center)
 *   5. FeatureStrip (absolute, bottom)
 */
export default function LandingPage() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* ── 1. Background image ──────────────────────── */}
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center bottom',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      {/* ── 2. Subtle dark overlay ───────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.12)',
          pointerEvents: 'none',
        }}
      />

      {/* ── 3. NavBar ────────────────────────────────── */}
      <NavBar />

      {/* ── 4. Hero section ──────────────────────────── */}
      <HeroSection />

      {/* ── 5. Feature strip ─────────────────────────── */}
      <FeatureStrip />
    </div>
  );
}
