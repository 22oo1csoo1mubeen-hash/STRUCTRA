/**
 * Utility functions for user avatar resolution and persistence.
 *
 * Requirements:
 * 1. When a user newly creates an account (e.g. via Google OAuth / Gmail),
 *    show their Gmail / Google profile photo.
 * 2. If the user doesn't have a profile photo for their Gmail, show letter initials.
 * 3. If the profile pic is removed, show letter initials as default.
 * 4. If the profile pic is changed or removed, preserve that choice across
 *    logouts and logins (preventing Google OAuth re-login from trampling over
 *    custom uploads or removed state).
 */

/**
 * Detect whether an avatar URL points to a Google default / auto-generated silhouette placeholder.
 */
export function isGoogleDefaultPlaceholder(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (lower.includes('default-user')) return true;
  if (lower.includes('silhouette')) return true;
  if (lower.includes('photo.jpg') && lower.includes('/aaaaaaaaaai/aaaaaaaaaaa/')) return true;
  return false;
}

/**
 * Resolve the effective avatar URL for any user object (Supabase User or API profile user).
 * Returns null if no custom/OAuth photo exists or if the picture was removed,
 * which signals the UI to render the initials letter avatar.
 */
export function getUserAvatarUrl(user) {
  if (!user) return null;

  const meta = user.user_metadata || {};

  // 1. Explicit removal: if user removed their profile photo, always return null (letters)
  if (meta.avatar_status === 'removed' || meta.avatar_removed === true || user.avatar_status === 'removed') {
    return null;
  }

  // 2. Custom uploaded photo: always take precedence and preserved across sessions
  if (meta.avatar_status === 'custom' && meta.custom_avatar_url) {
    return meta.custom_avatar_url;
  }
  if (user.custom_avatar_url) {
    return user.custom_avatar_url;
  }
  if (meta.avatar_storage_path && typeof meta.avatar_url === 'string' && meta.avatar_url.startsWith('/profile/avatar/')) {
    return meta.avatar_url;
  }

  // 3. User object avatar_url (if not default placeholder)
  if (user.avatar_url && !isGoogleDefaultPlaceholder(user.avatar_url)) {
    return user.avatar_url;
  }

  // 4. Metadata avatar_url
  if (meta.avatar_url && !isGoogleDefaultPlaceholder(meta.avatar_url)) {
    return meta.avatar_url;
  }

  // 5. Metadata picture (Google OAuth standard claim)
  if (meta.picture && !isGoogleDefaultPlaceholder(meta.picture)) {
    return meta.picture;
  }

  // 6. Identity data from Google provider
  if (Array.isArray(user.identities)) {
    const googleIdent = user.identities.find((id) => id.provider === 'google');
    if (googleIdent?.identity_data) {
      const idData = googleIdent.identity_data;
      const pic = idData.avatar_url || idData.picture;
      if (pic && !isGoogleDefaultPlaceholder(pic)) {
        return pic;
      }
    }
  }

  return null;
}

/**
 * Derive 1-2 letter uppercase initials from name or email for the letter avatar fallback.
 */
export function getUserInitials(name, email) {
  if (name && typeof name === 'string' && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && typeof email === 'string' && email.trim()) {
    return (email.trim().charAt(0) || 'U').toUpperCase();
  }
  return 'U';
}
