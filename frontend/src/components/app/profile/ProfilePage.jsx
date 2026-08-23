import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, FileText, Shield, AlertTriangle, Lock, ShieldCheck, Database, RefreshCw, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { getProfile } from '../../../api/profile';

import ProfileSidebarNav from './ProfileSidebarNav';
import ProfileHeaderCard from './ProfileHeaderCard';
import QuickOverviewGrid from './QuickOverviewGrid';
import PersonalInfoCard from './PersonalInfoCard';
import AccountSecurityCard from './AccountSecurityCard';
import DangerZoneCard from './DangerZoneCard';

/* ─── Unified Glass Card Style ──────────────────────────────── */
const glassCardStyle = {
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
};

/* ─── Profile Skeleton Loader ───────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {/* Header Card Skeleton */}
      <div
        style={{
          ...glassCardStyle,
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          minHeight: 220,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Avatar Skeleton */}
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          {/* Text Skeletons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div
              style={{
                width: 180,
                height: 24,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.08)',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
            <div
              style={{
                width: 240,
                height: 14,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.05)',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
            <div
              style={{
                width: 100,
                height: 20,
                borderRadius: 9999,
                background: 'rgba(249,115,22,0.12)',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Overview Skeleton */}
      <div
        style={{
          ...glassCardStyle,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          minHeight: 200,
        }}
      >
        <div
          style={{
            width: 150,
            height: 18,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 100,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}

/* ─── Security & Data Protection Modal ──────────────────────── */
function DataProtectionModal({ onClose, onNavigateSecurity }) {
  // Lock scroll on app-scroll-area and ensure scrolled to top while modal is open
  useEffect(() => {
    const scrollEl = document.getElementById('app-scroll-area');
    if (scrollEl) {
      scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
      const prevOverflow = scrollEl.style.overflowY;
      scrollEl.style.overflowY = 'hidden';
      return () => {
        scrollEl.style.overflowY = prevOverflow;
      };
    }
  }, []);

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        top: 0,
        left: typeof window !== 'undefined' && window.innerWidth > 768 ? 215 : 0,
        right: 0,
        bottom: 0,
        width: typeof window !== 'undefined' && window.innerWidth > 768 ? 'calc(100vw - 215px)' : '100vw',
        height: '100vh',
        background:
          'radial-gradient(ellipse at 50% 45%, rgba(59, 130, 246, 0.10) 0%, rgba(6, 4, 10, 0.45) 60%, rgba(4, 2, 8, 0.58) 100%)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 540,
          borderRadius: 20,
          background: 'rgba(15, 12, 20, 0.88)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.70), 0 0 35px rgba(59,130,246,0.18)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '26px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxSizing: 'border-box',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.16)',
                border: '1px solid rgba(59, 130, 246, 0.30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} color="#60a5fa" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Data Protection & Privacy
              </h3>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                STRUCTRA Security Architecture
              </span>
            </div>
          </div>
          <motion.button
            onClick={onClose}
            aria-label="Close"
            whileHover={{ scale: 1.1, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.92 }}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* Informational Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Lock size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Strict User & Tenant Isolation
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.4, fontFamily: "'Inter', system-ui, sans-serif" }}>
                All document records and analytics are cryptographically bound to your user identity. Cross-account data retrieval is strictly prohibited by Row-Level Security.
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Database size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Encrypted Storage & Transmission
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.4, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Your documents are encrypted at rest using AES-256 and transmitted exclusively over secure TLS 1.3 channels.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions with subtle, smooth animations */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6 }}>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.22)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
          >
            Close
          </motion.button>
          <motion.button
            onClick={() => {
              onClose();
              onNavigateSecurity();
            }}
            whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(249,115,22,0.45)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
              transition: 'box-shadow 0.15s ease',
            }}
          >
            <span>Account & Security</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

export default function ProfilePage() {
  const { user } = useAuth();

  // Active mini section tab — preserved across navigations
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('structra_profile_tab') || 'profile';
    } catch {
      return 'profile';
    }
  });

  const [personalInfoEditMode, setPersonalInfoEditMode] = useState(false);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (tab !== 'personal-info') {
      setPersonalInfoEditMode(false);
    }
    try {
      sessionStorage.setItem('structra_profile_tab', tab);
    } catch {
      /* silent */
    }
  };

  const handleEditProfile = () => {
    setPersonalInfoEditMode(true);
    setActiveTab('personal-info');
  };

  // Real Profile Data State
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setError(err?.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Page header config based on active tab
  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case 'personal-info':
        return {
          title: 'Personal Information',
          subtitle: 'Update your personal details and how others see you on STRUCTRA.',
          Icon: FileText,
          iconBg: 'rgba(255,255,255,0.06)',
          iconBorder: 'rgba(255,255,255,0.12)',
          iconColor: '#ffffff',
          titleColor: '#ffffff',
        };
      case 'account-security':
        return {
          title: 'Account & Security',
          subtitle: 'Manage your account security settings and authentication methods.',
          Icon: Shield,
          iconBg: 'rgba(255,255,255,0.06)',
          iconBorder: 'rgba(255,255,255,0.12)',
          iconColor: '#ffffff',
          titleColor: '#ffffff',
        };
      case 'danger-zone':
        return {
          title: 'Danger Zone',
          subtitle: 'Permanently delete your account and all associated data.',
          Icon: AlertTriangle,
          iconBg: 'rgba(239,68,68,0.10)',
          iconBorder: 'rgba(239,68,68,0.25)',
          iconColor: '#ef4444',
          titleColor: '#ef4444',
        };
      case 'profile':
      default:
        return {
          title: 'Profile',
          subtitle: 'Manage your account information and preferences',
          Icon: User,
          iconBg: 'rgba(255,255,255,0.06)',
          iconBorder: 'rgba(255,255,255,0.12)',
          iconColor: '#ffffff',
          titleColor: '#ffffff',
        };
    }
  }, [activeTab]);

  const { title, subtitle, Icon: HeaderIcon, iconBg, iconBorder, iconColor, titleColor } = headerInfo;

  return (
    <div
      style={{
        padding: '24px 32px 40px 32px',
        maxWidth: 1240,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      {/* ── Page Header: Dynamic Icon + Title + Subtitle ── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: iconBg,
            border: `1px solid ${iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}
        >
          <HeaderIcon size={22} strokeWidth={1.8} color={iconColor} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: titleColor,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: 'rgba(255,255,255,0.50)',
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        </div>
      </motion.div>

      {/* ── 2-Column Layout: Mini Navigation + Workspace ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '290px 1fr',
          alignItems: 'stretch',
          gap: 22,
          width: '100%',
        }}
      >
        {/* Left Column: 4-Tab Mini-Sidebar */}
        <ProfileSidebarNav activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Right Column: Profile Workspace Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            minWidth: 0,
          }}
        >
          {activeTab === 'profile' && (
            <>
              {loading ? (
                <ProfileSkeleton />
              ) : error ? (
                <div
                  style={{
                    ...glassCardStyle,
                    padding: '36px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    textAlign: 'center',
                  }}
                >
                  <AlertTriangle size={32} color="#f97316" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
                      Unable to Load Profile Details
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>
                      {error}
                    </span>
                  </div>
                  <button
                    onClick={fetchProfileData}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 18px',
                      borderRadius: 10,
                      background: 'rgba(249,115,22,0.15)',
                      border: '1px solid rgba(249,115,22,0.35)',
                      color: '#f97316',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Retry</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Main Profile Header Hero Card */}
                  <ProfileHeaderCard
                    user={profileData?.user || user}
                    account={profileData?.account}
                    onEditProfile={handleEditProfile}
                  />

                  {/* 2. Quick Overview Section Card (includes Security Banner) */}
                  <QuickOverviewGrid
                    totalDocuments={profileData?.usage?.document_count ?? 0}
                    accountStatus={profileData?.account?.status || 'Active'}
                    lastSignInAt={profileData?.account?.last_login || user?.last_sign_in_at}
                    storageUsedBytes={profileData?.usage?.storage_used_bytes ?? 0}
                    storageLimitBytes={profileData?.usage?.storage_limit_bytes ?? 1073741824}
                    onLearnMore={() => setShowSecurityModal(true)}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'personal-info' && (
            <PersonalInfoCard
              user={profileData?.user || user}
              onProfileUpdated={fetchProfileData}
              startInEditMode={personalInfoEditMode}
              onExitEditMode={() => setPersonalInfoEditMode(false)}
            />
          )}

          {activeTab === 'account-security' && (
            <AccountSecurityCard user={profileData?.user || user} />
          )}

          {activeTab === 'danger-zone' && (
            <DangerZoneCard />
          )}
        </div>
      </div>

      {/* ── Data Protection Informational Modal ── */}
      <AnimatePresence>
        {showSecurityModal && (
          <DataProtectionModal
            onClose={() => setShowSecurityModal(false)}
            onNavigateSecurity={() => setActiveTab('account-security')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
