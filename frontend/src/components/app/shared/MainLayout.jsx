import { useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import FloatingAIAssistant from './FloatingAIAssistant';
import bgImage from '../../../assets/bg.webp';

/**
 * MainLayout
 * Persistent shell for all authenticated pages.
 * Background image visible through glass layers.
 * Custom themed scrollbar — gradient orange, appears on hover only, full height.
 * Sidebar is collapsible; toggle button is housed cleanly on the sidebar right border at the horizontal line.
 */
export default function MainLayout() {
  const [isScrolled, setIsScrolled]             = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      setIsScrolled(scrollRef.current.scrollTop > 10);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {/* ── Scrollbar styles ── */}
      <style>{`
        #app-scroll-area::-webkit-scrollbar { width: 5px; }
        #app-scroll-area::-webkit-scrollbar-track {
          background: transparent; border-radius: 9999px;
        }
        #app-scroll-area::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg,#ffb347 0%,#f97316 45%,#ea580c 100%);
          border-radius: 9999px;
          box-shadow: 0 0 6px rgba(249,115,22,0.40);
        }
        #app-scroll-area::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg,#f97316 0%,#ea580c 45%,#c2410c 100%);
        }
        #app-scroll-area {
          scrollbar-width: thin;
          scrollbar-color: rgba(249,115,22,0.65) transparent;
        }
      `}</style>

      {/* ── Full-viewport background ── */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img
          src={bgImage}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,2,0,0.48)' }} />
      </div>

      {/* ── Sidebar with embedded open/close toggle on the right edge ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* ── Main content column ── */}
      <main
        id="app-scroll-area"
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          zIndex: 1,
          isolation: 'isolate',
          transform: 'translateZ(0)',
          transition: 'flex 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <TopBar isScrolled={isScrolled} />
        <div style={{ flex: 1, paddingRight: 0 }}>
          <Outlet />
        </div>
      </main>

      {/* ── Floating AI Assistant ── */}
      <FloatingAIAssistant />
    </div>
  );
}
