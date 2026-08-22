import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Camera, Upload, Trash2 } from 'lucide-react';

export default function PersonalInfoCard({ user = null }) {
  const defaultName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Ram';

  const defaultEmail = user?.email || 'ramulapentaramakotesh@gmail.com';
  const initial = (defaultName.charAt(0) || 'R').toUpperCase();

  // Local form state
  const [formData, setFormData] = useState({
    fullName: defaultName,
    email: defaultEmail,
    phone: '+91 98765 43210',
    organization: 'Acme Pvt. Ltd.',
    jobTitle: 'Document Analyst',
    location: 'Hyderabad, India',
  });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [savedData, setSavedData] = useState({ ...formData });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSavedData({ ...formData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({ ...savedData });
    setIsEditing(false);
  };

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
        padding: '28px 34px 32px 34px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        position: 'relative',
      }}
    >
      {/* ── Top Row: Profile Picture + Edit Mode Button ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Left: Avatar + Picture Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar with Camera Badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9838 0%, #f97316 50%, #ea580c 100%)',
                boxShadow: '0 6px 20px rgba(249,115,22,0.30)',
                border: '2px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#ffffff',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {initial}
              </span>
            </div>

            {/* Camera Icon Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#1a1a20',
                border: '1px solid rgba(255,255,255,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              <Camera size={11} color="rgba(255,255,255,0.90)" />
            </div>
          </div>

          {/* Picture Actions Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Profile Picture
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: "'Inter', system-ui, sans-serif",
                marginBottom: 6,
              }}
            >
              JPG, PNG or WEBP. Max size 2MB.
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(249,115,22,0.35)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                <Upload size={13} color="#f97316" />
                <span>Change Picture</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 10px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                <Trash2 size={13} color="#ef4444" />
                <span>Remove</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right: Edit Mode Button */}
        <motion.button
          onClick={() => setIsEditing(!isEditing)}
          whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 10,
            background: isEditing ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
            border: isEditing
              ? '1px solid rgba(249,115,22,0.60)'
              : '1px solid rgba(249,115,22,0.35)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.20)',
          }}
        >
          <Pencil size={13} color="#f97316" />
          <span>{isEditing ? 'Editing Mode' : 'Edit Mode'}</span>
        </motion.button>
      </div>

      {/* ── 2-Column Form Fields (6 fields) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px 24px',
        }}
      >
        {/* 1. Full Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.70)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Full Name
          </label>
          <input
            type="text"
            value={formData.fullName}
            readOnly={!isEditing}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            style={{
              height: 44,
              borderRadius: 10,
              background: 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.40)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 2. Email Address with Verified Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.70)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Email Address
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="email"
              value={formData.email}
              readOnly={!isEditing}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                background: 'rgba(15,15,20,0.60)',
                border: isEditing
                  ? '1px solid rgba(249,115,22,0.40)'
                  : '1px solid rgba(255,255,255,0.08)',
                padding: '0 88px 0 14px',
                color: '#ffffff',
                fontSize: 13.5,
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
                transition: 'border-color 0.15s ease',
                cursor: isEditing ? 'text' : 'default',
                boxSizing: 'border-box',
              }}
            />
            {/* Verified Badge */}
            <div
              style={{
                position: 'absolute',
                right: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(74,222,128,0.12)',
                border: '1px solid rgba(74,222,128,0.25)',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#4ade80',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.02em',
                }}
              >
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* 3. Phone Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.70)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Phone Number
          </label>
          <input
            type="text"
            value={formData.phone}
            readOnly={!isEditing}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            style={{
              height: 44,
              borderRadius: 10,
              background: 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.40)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 4. Organization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.70)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Organization
          </label>
          <input
            type="text"
            value={formData.organization}
            readOnly={!isEditing}
            onChange={(e) => handleInputChange('organization', e.target.value)}
            style={{
              height: 44,
              borderRadius: 10,
              background: 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.40)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 5. Job Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.70)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Job Title
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            readOnly={!isEditing}
            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
            style={{
              height: 44,
              borderRadius: 10,
              background: 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.40)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 6. Location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.70)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            readOnly={!isEditing}
            onChange={(e) => handleInputChange('location', e.target.value)}
            style={{
              height: 44,
              borderRadius: 10,
              background: 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.40)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>
      </div>

      {/* ── Bottom Action Buttons: Cancel & Save Changes ── */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        <motion.button
          onClick={handleCancel}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '10px 22px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Cancel
        </motion.button>

        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(249,115,22,0.50)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ff9838 0%, #f97316 50%, #ea580c 100%)',
            border: 'none',
            color: '#ffffff',
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          Save Changes
        </motion.button>
      </div>
    </motion.div>
  );
}
