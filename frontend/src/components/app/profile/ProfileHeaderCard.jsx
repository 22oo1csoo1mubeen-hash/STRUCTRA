import { motion } from 'framer-motion';
import { Pencil, Check, Calendar, Mail, Shield, FileText } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Format date utility (e.g. "21 Aug 2026")
───────────────────────────────────────────────────────────── */
function formatMemberDate(rawDate) {
  if (!rawDate) return '21 Aug 2026';
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return '21 Aug 2026';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '21 Aug 2026';
  }
}

/* ─────────────────────────────────────────────────────────────
   Faceted 3D Low-Poly Mesh Graphic for Top-Right Corner
───────────────────────────────────────────────────────────── */
function FacetedMeshGraphic() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 560,
        height: '100%',
        maxHeight: 270,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        maskImage:
          'radial-gradient(ellipse 540px 270px at 100% 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.50) 75%, rgba(0,0,0,0) 98%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 540px 270px at 100% 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.50) 75%, rgba(0,0,0,0) 98%)',
      }}
    >
      {/* Corner ambient orange glow bleeding directly from the top-right apex */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(249,115,22,0.40) 0%, rgba(234,88,12,0.16) 45%, rgba(124,45,18,0.03) 70%, transparent 85%)',
          filter: 'blur(32px)',
        }}
      />

      {/* SVG Low-Poly Faceted 3D Geometric Mesh (Flush to right & top edge) */}
      <svg
        viewBox="0 0 560 270"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 'calc(100% + 4px)',
          height: 'calc(100% + 4px)',
          opacity: 0.52,
        }}
      >
        <defs>
          <linearGradient id="facet1" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff9838" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.38" />
          </linearGradient>
          <linearGradient id="facet2" x1="100%" y1="0%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.70" />
            <stop offset="100%" stopColor="#9a3412" stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id="facet3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.50" />
            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.20" />
          </linearGradient>
          <linearGradient id="facet4" x1="50%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c2410c" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#431407" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="facet5" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3d1405" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="facet6" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#c2410c" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="facet7" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1a0601" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Top edge and corner bleeding facets */}
        <polygon points="560,0 450,0 515,48" fill="url(#facet1)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <polygon points="560,0 515,48 560,65" fill="url(#facet2)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
        <polygon points="450,0 350,0 415,38" fill="url(#facet3)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <polygon points="450,0 415,38 515,48" fill="url(#facet6)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <polygon points="350,0 240,0 310,32" fill="url(#facet7)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="350,0 310,32 415,38" fill="url(#facet5)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <polygon points="240,0 140,0 205,28" fill="url(#facet7)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <polygon points="240,0 205,28 310,32" fill="url(#facet5)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="140,0 60,0 115,22" fill="url(#facet7)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <polygon points="140,0 115,22 205,28" fill="url(#facet5)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

        <polygon points="560,65 515,48 560,115" fill="url(#facet2)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <polygon points="515,48 455,90 560,115" fill="url(#facet1)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <polygon points="515,48 415,38 455,90" fill="url(#facet6)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <polygon points="415,38 350,75 455,90" fill="url(#facet4)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <polygon points="415,38 310,32 350,75" fill="url(#facet5)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <polygon points="310,32 245,60 350,75" fill="url(#facet7)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="310,32 205,28 245,60" fill="url(#facet5)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="205,28 145,50 245,60" fill="url(#facet7)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <polygon points="205,28 115,22 145,50" fill="url(#facet5)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

        <polygon points="560,115 455,90 515,148" fill="url(#facet4)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <polygon points="560,115 515,148 560,175" fill="url(#facet2)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <polygon points="455,90 380,130 515,148" fill="url(#facet5)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <polygon points="455,90 350,75 380,130" fill="url(#facet6)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <polygon points="350,75 280,115 380,130" fill="url(#facet7)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="350,75 245,60 280,115" fill="url(#facet4)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="245,60 175,95 280,115" fill="url(#facet7)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <polygon points="245,60 145,50 175,95" fill="url(#facet5)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <polygon points="145,50 85,75 175,95" fill="url(#facet7)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

        <polygon points="280,115 205,155 305,185" fill="url(#facet7)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <polygon points="280,115 305,185 380,130" fill="url(#facet5)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="380,130 305,185 410,210" fill="url(#facet4)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="380,130 410,210 515,148" fill="url(#facet6)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <polygon points="515,148 410,210 500,230" fill="url(#facet5)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="515,148 500,230 560,175" fill="url(#facet2)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        <polygon points="560,175 500,230 560,245" fill="url(#facet4)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="410,210 325,240 435,265" fill="url(#facet7)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <polygon points="410,210 435,265 500,230" fill="url(#facet5)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="500,230 435,265 530,270" fill="url(#facet6)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        <polygon points="500,230 530,270 560,245" fill="url(#facet2)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

export default function ProfileHeaderCard({
  user = null,
  totalDocuments = 24,
  onEditProfile = () => {},
}) {
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Ram';

  const userEmail = user?.email || 'mubeen@email.com';
  const memberSinceFormatted = formatMemberDate(user?.created_at);
  const initial = (displayName.charAt(0) || 'R').toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Low-Poly Faceted Mesh Artwork & Orange Corner Glow ── */}
      <FacetedMeshGraphic />

      {/* ── Top Hero Identity Row ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '28px 32px 22px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        {/* Left: Avatar + Identity Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0 }}>
          {/* Avatar with Edit Badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9838 0%, #f97316 50%, #ea580c 100%)',
                boxShadow: '0 8px 24px rgba(249,115,22,0.35), inset 0 2px 4px rgba(255,255,255,0.3)',
                border: '2px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: '#ffffff',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  lineHeight: 1,
                }}
              >
                {initial}
              </span>
            </div>

            {/* Edit Avatar Button */}
            <motion.button
              onClick={onEditProfile}
              title="Change Avatar"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#1c1c22',
                border: '1px solid rgba(255,255,255,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                padding: 0,
              }}
            >
              <Pencil size={13} color="rgba(255,255,255,0.85)" />
            </motion.button>
          </div>

          {/* User Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              {displayName}
            </h2>

            <span
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.60)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {userEmail}
            </span>

            {/* Plan Badge */}
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 9999,
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.30)',
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'rgba(74,222,128,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={9} strokeWidth={3} color="#4ade80" />
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#4ade80',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.01em',
                  }}
                >
                  Premium Plan
                </span>
              </div>
            </div>

            {/* Member Since Information */}
            <div
              style={{
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.50)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Calendar size={13} color="rgba(255,255,255,0.45)" />
              <span>Member since {memberSinceFormatted}</span>
            </div>
          </div>
        </div>

        {/* Right: Edit Profile Button */}
        <motion.button
          onClick={onEditProfile}
          whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(249,115,22,0.35)',
            color: '#ffffff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.20)',
          }}
        >
          <Pencil size={14} color="#f97316" />
          <span>Edit Profile</span>
        </motion.button>
      </div>

      {/* ── Bottom Information Strip: Email & Member Since (Single Row) ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          margin: '0 24px 22px 24px',
          background: 'rgba(14,14,18,0.55)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          padding: '14px 22px',
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* 1. Email Box (Full email accommodated) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(249,115,22,0.10)',
              border: '1px solid rgba(249,115,22,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mail size={17} color="#f97316" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Email
            </span>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                wordBreak: 'break-all',
              }}
              title={userEmail}
            >
              {userEmail}
            </span>
          </div>
        </div>

        {/* 2. Member Since Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(96,165,250,0.10)',
              border: '1px solid rgba(96,165,250,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={17} color="#60a5fa" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Member Since
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {memberSinceFormatted}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
