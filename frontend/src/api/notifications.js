import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Helper: get the current session's Bearer token.
 */
async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }
  return session.access_token;
}

/**
 * Fetches the notification/activity feed for the current user.
 *
 * Returns:
 *   { items: NotificationItem[], unread_count: number, total: number }
 */
export async function getNotifications() {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/notifications`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const msg = typeof errorData.detail === 'string'
      ? errorData.detail
      : (errorData.detail?.[0]?.msg || 'Failed to load notifications.');
    throw new Error(msg);
  }

  return await response.json();
}

/**
 * Marks all current user's unread notifications as read.
 *
 * Returns: { marked_read: number, message: string }
 */
export async function markNotificationsRead() {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/notifications/mark-read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const msg = typeof errorData.detail === 'string'
      ? errorData.detail
      : (errorData.detail?.[0]?.msg || 'Failed to mark notifications as read.');
    throw new Error(msg);
  }

  const data = await response.json();
  notifyNotificationsUpdated();
  return data;
}

/**
 * Triggers a global event telling the UI that notifications have been updated.
 */
export function notifyNotificationsUpdated() {
  try {
    window.dispatchEvent(new CustomEvent('structra:notifications-updated'));
  } catch {
    /* silent */
  }
}
