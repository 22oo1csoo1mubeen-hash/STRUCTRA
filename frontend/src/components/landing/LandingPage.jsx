import NavBar from './NavBar';
import HeroSection from './HeroSection';
import FeatureStrip from './FeatureStrip';
import landingBackground from '../../../../design-assets/landing/landing-background.webp';
import { LandingLayoutProvider, useLanding } from './LandingLayoutContext';

/**
 * LandingPage
 * Full-viewport container with deterministic responsive geometry
 * locked to the background artwork and user's laptop source of truth.
 */
function LandingPageContent() {
  const layout = useLanding();
  const backgroundStyle = {
    position: 'absolute',
    top: `${layout.imgTop}px`,
    left: `${layout.imgLeft}px`,
    width: `${layout.imgW}px`,
    height: `${layout.imgH}px`,
    maxWidth: 'none',
    maxHeight: 'none',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#0a0d14',
      }}
    >
      <img
        src={landingBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          ...backgroundStyle,
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* Subtle dark overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.12)',
          pointerEvents: 'none',
        }}
      />

      <NavBar />
      <HeroSection />
      <FeatureStrip />
    </div>
  );
}

export default function LandingPage() {
  return (
    <LandingLayoutProvider>
      <LandingPageContent />
    </LandingLayoutProvider>
  );
}
