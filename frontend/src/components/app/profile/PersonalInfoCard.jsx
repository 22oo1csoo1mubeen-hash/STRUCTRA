import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Camera, Upload, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { updateProfile, uploadProfilePicture, deleteProfilePicture } from '../../../api/profile';
import { useAuth } from '../../../hooks/useAuth';

export default function PersonalInfoCard({
  user = null,
  onProfileUpdated = () => {},
  startInEditMode = false,
  onExitEditMode = () => {},
}) {
  const { refreshUser, setUser } = useAuth();
  const fileInputRef = useRef(null);

  // Derive initial values from real user props
  const initialName =
    user?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    '';

  const initialEmail = user?.email || '';
  const initialPhone = user?.phone || user?.user_metadata?.phone || user?.user_metadata?.phone_number || '';
  const initialOrg = user?.organization || user?.user_metadata?.organization || '';
  const initialJob = user?.job_title || user?.user_metadata?.job_title || '';
  const initialLoc = user?.location || user?.user_metadata?.location || '';
  const initialAvatar = user?.avatar_url || user?.user_metadata?.avatar_url || null;
  const isEmailVerified = user?.email_verified ?? true;

  // Local form state
  const [formData, setFormData] = useState({
    fullName: initialName,
    email: initialEmail,
    phone: initialPhone,
    organization: initialOrg,
    jobTitle: initialJob,
    location: initialLoc,
  });

  // Sync state if user prop updates externally
  useEffect(() => {
    setFormData({
      fullName: initialName,
      email: initialEmail,
      phone: initialPhone,
      organization: initialOrg,
      jobTitle: initialJob,
      location: initialLoc,
    });
    setSavedData({
      fullName: initialName,
      email: initialEmail,
      phone: initialPhone,
      organization: initialOrg,
      jobTitle: initialJob,
      location: initialLoc,
    });
  }, [initialName, initialEmail, initialPhone, initialOrg, initialJob, initialLoc]);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [savedData, setSavedData] = useState({ ...formData });

  useEffect(() => {
    if (startInEditMode) {
      setIsEditing(true);
    }
  }, [startInEditMode]);

  // Async / status states
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarUrl(initialAvatar);
    setAvatarLoadError(false);
  }, [initialAvatar]);

  // Derived initial letter for avatar fallback
  const displayName = formData.fullName || initialName || formData.email || 'User';
  const initial = (displayName.charAt(0) || 'U').toUpperCase();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  /* ─── Save Changes ─────────────────────────────────────────── */
  const handleSave = async () => {
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      setFormError('Full Name is required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        full_name: trimmedName,
        phone: formData.phone.trim() || null,
        organization: formData.organization.trim() || null,
        job_title: formData.jobTitle.trim() || null,
        location: formData.location.trim() || null,
      };

      await updateProfile(payload);
      setSavedData({ ...formData, fullName: trimmedName });
      setIsEditing(false);
      onExitEditMode?.();
      setSuccessToast('Personal information updated successfully.');
      setTimeout(() => setSuccessToast(null), 3000);

      // 1. Immediately update local auth context state so TopBar and entire app sync synchronously
      if (setUser) {
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              full_name: trimmedName,
              name: trimmedName,
              phone: payload.phone,
              organization: payload.organization,
              job_title: payload.job_title,
              location: payload.location,
            },
          };
        });
      }

      // 2. Refresh Supabase session so token and storage are persistently refreshed
      await refreshUser();
      onProfileUpdated();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setFormError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ─── Cancel Changes ───────────────────────────────────────── */
  const handleCancel = () => {
    setFormData({ ...savedData });
    setFormError(null);
    setIsEditing(false);
    onExitEditMode?.();
  };

  /* ─── Avatar Upload ────────────────────────────────────────── */
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setFormError('Invalid file format. Please choose a JPG, PNG, or WEBP image.');
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSize) {
      setFormError('Image size exceeds 2 MB. Please select a smaller image.');
      return;
    }

    setIsUploading(true);
    setFormError(null);

    try {
      const result = await uploadProfilePicture(file);
      setAvatarUrl(result.avatar_url);
      setAvatarLoadError(false);
      setSuccessToast('Profile picture updated.');
      setTimeout(() => setSuccessToast(null), 3000);

      if (setUser) {
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              avatar_url: result.avatar_url,
            },
          };
        });
      }

      await refreshUser();
      onProfileUpdated();
    } catch (err) {
      console.error('Failed to upload picture:', err);
      setFormError(err?.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploading(false);
    }
  };

  /* ─── Avatar Remove ────────────────────────────────────────── */
  const handleRemovePicture = async () => {
    setIsRemoving(true);
    setFormError(null);

    try {
      await deleteProfilePicture();
      setAvatarUrl(null);
      setAvatarLoadError(false);
      setSuccessToast('Custom profile picture removed.');
      setTimeout(() => setSuccessToast(null), 3000);

      if (setUser) {
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              avatar_url: null,
              avatar_storage_path: null,
              avatar_content_type: null,
            },
          };
        });
      }

      await refreshUser();
      onProfileUpdated();
    } catch (err) {
      console.error('Failed to remove picture:', err);
      setFormError(err?.message || 'Failed to remove profile picture.');
    } finally {
      setIsRemoving(false);
    }
  };

  const hasCustomPicture = Boolean(avatarUrl) && !avatarLoadError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        borderRadius: 20,
        border: isEditing
          ? '1px solid rgba(249,115,22,0.40)'
          : '1px solid rgba(255,255,255,0.08)',
        background: isEditing
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: isEditing
          ? '0 6px 36px rgba(249,115,22,0.12), 0 2px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: '28px 34px 32px 34px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        position: 'relative',
        transition: 'border-color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      {/* Floating Success Notification Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              bottom: 28,
              right: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 18px',
              borderRadius: 14,
              background: 'rgba(15, 13, 20, 0.95)',
              border: '1px solid rgba(74, 222, 128, 0.40)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.60), 0 0 20px rgba(74, 222, 128, 0.15)',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(74, 222, 128, 0.18)',
                border: '1px solid rgba(74, 222, 128, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={13} strokeWidth={3} color="#4ade80" />
            </div>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              {successToast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
                overflow: 'hidden',
              }}
            >
              {hasCustomPicture ? (
                <img
                  src={avatarUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${avatarUrl}` : avatarUrl}
                  alt={displayName}
                  onError={() => setAvatarLoadError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
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
              )}
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
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isRemoving}
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
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'all 0.15s ease',
                  opacity: isUploading ? 0.7 : 1,
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" color="#f97316" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={13} color="#f97316" />
                    <span>Change Picture</span>
                  </>
                )}
              </motion.button>

              {/* Remove button: only visible when custom picture exists */}
              {hasCustomPicture && (
                <motion.button
                  onClick={handleRemovePicture}
                  disabled={isUploading || isRemoving}
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
                    cursor: isRemoving ? 'not-allowed' : 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    opacity: isRemoving ? 0.6 : 1,
                  }}
                >
                  {isRemoving ? (
                    <Loader2 size={13} className="animate-spin" color="#ef4444" />
                  ) : (
                    <Trash2 size={13} color="#ef4444" />
                  )}
                  <span>Remove</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Edit Mode Button */}
        <motion.button
          onClick={() => {
            if (isEditing) {
              handleCancel();
            } else {
              setIsEditing(true);
            }
          }}
          whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 10,
            background: isEditing ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.05)',
            border: isEditing
              ? '1px solid rgba(249,115,22,0.65)'
              : '1px solid rgba(249,115,22,0.35)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'all 0.15s ease',
            boxShadow: isEditing
              ? '0 0 16px rgba(249,115,22,0.25)'
              : '0 2px 10px rgba(0,0,0,0.20)',
          }}
        >
          <Pencil size={13} color="#f97316" />
          <span>{isEditing ? 'Editing Mode' : 'Edit Mode'}</span>
        </motion.button>
      </div>

      {/* Error banner if save/upload fails */}
      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#fca5a5',
            fontSize: 12.5,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </motion.div>
      )}

      {/* ── 2-Column Form Fields (6 fields) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px 24px',
        }}
      >
        {/* 1. Full Name (Required) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: isEditing ? '#ffffff' : 'rgba(255,255,255,0.70)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Full Name {isEditing && <span style={{ color: '#f97316' }}>*</span>}
          </label>
          <input
            type="text"
            value={formData.fullName}
            readOnly={!isEditing}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Enter your full name"
            style={{
              height: 44,
              borderRadius: 10,
              background: isEditing ? 'rgba(20,18,25,0.75)' : 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.50)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 2. Email Address (Permanent Read-Only + Green Check Verified Indicator) */}
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
              readOnly={true}
              disabled={true}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                background: 'rgba(15,15,20,0.40)',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '0 44px 0 14px',
                color: 'rgba(255,255,255,0.75)',
                fontSize: 13.5,
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
                cursor: 'not-allowed',
                boxSizing: 'border-box',
              }}
            />
            {/* Green Verification Check Icon (No text, real verified state) */}
            {isEmailVerified && (
              <div
                title="Email is verified"
                style={{
                  position: 'absolute',
                  right: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(74,222,128,0.15)',
                  border: '1px solid rgba(74,222,128,0.30)',
                  pointerEvents: 'none',
                }}
              >
                <Check size={12} strokeWidth={2.8} color="#4ade80" />
              </div>
            )}
          </div>
        </div>

        {/* 3. Phone Number (Optional) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: isEditing ? '#ffffff' : 'rgba(255,255,255,0.70)',
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
            placeholder={isEditing ? '+1 (555) 000-0000' : '—'}
            style={{
              height: 44,
              borderRadius: 10,
              background: isEditing ? 'rgba(20,18,25,0.75)' : 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.50)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 4. Organization (Optional) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: isEditing ? '#ffffff' : 'rgba(255,255,255,0.70)',
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
            placeholder={isEditing ? 'Company or organization' : '—'}
            style={{
              height: 44,
              borderRadius: 10,
              background: isEditing ? 'rgba(20,18,25,0.75)' : 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.50)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 5. Job Title (Optional) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: isEditing ? '#ffffff' : 'rgba(255,255,255,0.70)',
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
            placeholder={isEditing ? 'Job title or role' : '—'}
            style={{
              height: 44,
              borderRadius: 10,
              background: isEditing ? 'rgba(20,18,25,0.75)' : 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.50)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>

        {/* 6. Location (Optional) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: isEditing ? '#ffffff' : 'rgba(255,255,255,0.70)',
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
            placeholder={isEditing ? 'City, Country' : '—'}
            style={{
              height: 44,
              borderRadius: 10,
              background: isEditing ? 'rgba(20,18,25,0.75)' : 'rgba(15,15,20,0.60)',
              border: isEditing
                ? '1px solid rgba(249,115,22,0.50)'
                : '1px solid rgba(255,255,255,0.08)',
              padding: '0 14px',
              color: '#ffffff',
              fontSize: 13.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              cursor: isEditing ? 'text' : 'default',
            }}
          />
        </div>
      </div>

      {/* ── Bottom Action Buttons: Cancel & Save Changes (Prominent in Edit Mode) ── */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              overflow: 'hidden',
            }}
          >
            <motion.button
              onClick={handleCancel}
              disabled={isSaving}
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
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancel
            </motion.button>

            <motion.button
              onClick={handleSave}
              disabled={isSaving}
              whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(249,115,22,0.50)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #ff9838 0%, #f97316 50%, #ea580c 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
                transition: 'all 0.15s ease',
                opacity: isSaving ? 0.8 : 1,
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" color="#ffffff" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
