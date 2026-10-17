import { createContext, useContext } from 'react';
import { useLandingLayout } from './useLandingLayout';

const LandingLayoutContext = createContext(null);

export function LandingLayoutProvider({ children }) {
  const layout = useLandingLayout();
  return (
    <LandingLayoutContext.Provider value={layout}>
      {children}
    </LandingLayoutContext.Provider>
  );
}

export function useLanding() {
  const ctx = useContext(LandingLayoutContext);
  if (!ctx) {
    return {
      w: 1366,
      h: 768,
      s: 1,
      imgW: 1366,
      imgH: 768,
      imgTop: 0,
      imgLeft: 0,
      heroTop: 169,
      grassY: 635,
    };
  }
  return ctx;
}
