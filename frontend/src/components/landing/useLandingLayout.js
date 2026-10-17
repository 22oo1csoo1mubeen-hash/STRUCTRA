import { useState, useEffect } from 'react';

/**
 * Calculates deterministic layout coordinates and scale
 * locking foreground elements to background image geometry
 * on desktop, and adapting thoughtfully for mobile viewports.
 */
export function getLandingLayout(w = window.innerWidth, h = window.innerHeight) {
  const isMobile = w < 768;
  const isLandscape = w > h && h < 520;
  const isSmallMobile = w <= 360;
  const isShort = h < 660;

  if (!isMobile && !isLandscape) {
    // ── DESKTOP / LAPTOP (100% Preserved) ─────────────────
    const imgAspect = 16 / 9;
    const screenAspect = w / h;

    let imgW, imgH, imgTop, imgLeft;
    if (screenAspect >= imgAspect) {
      imgW = w;
      imgH = w / imgAspect;
      imgLeft = 0;
      imgTop = (h - imgH) * 0.40;
    } else {
      imgH = h;
      imgW = h * imgAspect;
      imgTop = 0;
      imgLeft = (w - imgW) / 2;
    }

    const s = imgH / 768;

    return {
      w,
      h,
      s,
      isMobile: false,
      isSmallMobile: false,
      isShort: false,
      isLandscape: false,
      imgW,
      imgH,
      imgTop,
      imgLeft,
      heroTop: imgTop + imgH * 0.22,
      grassY: imgTop + imgH * 0.827,
    };
  }

  // ── MOBILE PORTRAIT or LANDSCAPE ───────────────────────
  const imgAspect = 16 / 9;
  const screenAspect = w / h;
  let imgW, imgH, imgTop, imgLeft;

  if (screenAspect >= imgAspect) {
    // Landscape mobile (e.g. 844x390, 812x375, 667x375) or wide screen: fill width edge-to-edge
    imgW = w;
    imgH = w / imgAspect;
    imgLeft = 0;
    imgTop = (h - imgH) * 0.40;
  } else {
    // Portrait mobile (e.g. 320x568, 390x844, 430x932): fill height, horizontally centered
    imgH = h;
    imgW = h * imgAspect;
    imgTop = 0;
    imgLeft = (w - imgW) / 2;
  }

  // Hero vertical position tailored for mobile vertical rhythm
  let heroTop;
  if (isLandscape) {
    heroTop = Math.max(38, Math.round(h * 0.06));
  } else if (isShort) {
    heroTop = Math.max(48, Math.round(h * 0.18));
  } else {
    heroTop = Math.round(h * 0.25);
  }

  return {
    w,
    h,
    s: 1, // On mobile, components use responsive clamp / mobile metrics
    isMobile: true,
    isSmallMobile,
    isShort,
    isLandscape,
    imgW,
    imgH,
    imgTop,
    imgLeft,
    heroTop,
    grassY: h * 0.827,
  };
}

export function useLandingLayout() {
  const [layout, setLayout] = useState(() => {
    if (typeof window !== 'undefined') {
      return getLandingLayout(window.innerWidth, window.innerHeight);
    }
    return getLandingLayout(1366, 768);
  });

  useEffect(() => {
    const handleResize = () => {
      setLayout(getLandingLayout(window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return layout;
}
