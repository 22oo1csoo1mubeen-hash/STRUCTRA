import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, FileText, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDocumentLibrary } from '../../../context/DocumentLibraryContext';
import { useDashboard } from '../../../context/DashboardContext';

import ProfileSidebarNav from './ProfileSidebarNav';
import ProfileHeaderCard from './ProfileHeaderCard';
import QuickOverviewGrid from './QuickOverviewGrid';
import PersonalInfoCard from './PersonalInfoCard';
import AccountSecurityCard from './AccountSecurityCard';
import DangerZoneCard from './DangerZoneCard';

/* ─── Framer Motion Page Variants ───────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.25,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' },
  },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const docLibrary = useDocumentLibrary();
  const dashboard = useDashboard();

  // Active mini section tab — preserved across navigations
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('structra_profile_tab') || 'profile';
    } catch {
      return 'profile';
    }
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('structra_profile_tab', tab);
    } catch {
      /* silent */
    }
  };

  // Derive total documents from context or fallback to 24
  const totalDocuments = useMemo(() => {
    if (docLibrary?.total !== undefined && docLibrary.total > 0) {
      return docLibrary.total;
    }
    if (docLibrary?.stats?.total !== undefined && docLibrary.stats.total > 0) {
      return docLibrary.stats.total;
    }
    if (dashboard?.summary?.total_receipts !== undefined && dashboard.summary.total_receipts > 0) {
      return dashboard.summary.total_receipts;
    }
    return 24;
  }, [docLibrary?.total, docLibrary?.stats?.total, dashboard?.summary?.total_receipts]);

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
              {/* 1. Main Profile Header Hero Card */}
              <ProfileHeaderCard
                user={user}
                totalDocuments={totalDocuments}
                onEditProfile={() => setActiveTab('personal-info')}
              />

              {/* 2. Quick Overview Section Card (includes Security Banner) */}
              <QuickOverviewGrid
                totalDocuments={totalDocuments}
                lastSignInAt={user?.last_sign_in_at}
              />
            </>
          )}

          {activeTab === 'personal-info' && (
            <PersonalInfoCard user={user} />
          )}

          {activeTab === 'account-security' && (
            <AccountSecurityCard user={user} />
          )}

          {activeTab === 'danger-zone' && (
            <DangerZoneCard />
          )}
        </div>
      </div>
    </div>
  );
}
