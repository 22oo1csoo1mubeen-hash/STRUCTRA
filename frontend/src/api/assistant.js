import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Helper to retrieve the current user's JWT access token for authenticated API calls.
 */
async function getAuthToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }
  return session.access_token;
}

/**
 * Create a new ephemeral AI Assistant session on the backend.
 *
 * @returns {Promise<{session_id: string, created_at: string, expires_at: string}>}
 */
export async function createAssistantSession() {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/assistant/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMsg = 'Failed to initialize assistant session.';
    try {
      const errorData = await response.json();
      errorMsg =
        typeof errorData.detail === 'string'
          ? errorData.detail
          : errorData.detail?.[0]?.msg || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

/**
 * Send a message to the STRUCTRA AI assistant.
 *
 * @param {object} params
 * @param {string|null} [params.session_id] - Ephemeral session identifier.
 * @param {string} params.message - The user's question.
 * @param {Array<{role: string, content: string}>} [params.history] - Previous conversation turns.
 * @returns {Promise<{
 *   session_id: string,
 *   message: string,
 *   reply: string,
 *   result_type: string|null,
 *   title: string|null,
 *   summary: string|null,
 *   sources: Array<{document_id: string, filename: string, vendor: string|null, document_date: string|null, total: number|null}>,
 *   source_count: number,
 *   metadata: object|null
 * }>}
 */
export async function sendAssistantMessage({ session_id, message, history = [] }) {
  const token = await getAuthToken();

  const payload = {
    message: message.trim(),
    history: history.slice(-8), // Send bounded history of last 8 turns
  };

  if (session_id) {
    payload.session_id = session_id;
  }

  let response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    response = await fetch(`${API_URL}/assistant/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (netErr) {
    if (netErr.name === 'AbortError') {
      throw new Error('STRUCTRA response timed out. Please try asking again.');
    }
    throw netErr;
  }

  if (!response.ok) {
    let errorMsg = "STRUCTRA couldn't process that right now. Please try again.";
    let isExpired = false;

    if (response.status === 404) {
      isExpired = true;
      errorMsg = 'Session expired. Reconnecting...';
    } else if (response.status === 401) {
      errorMsg = 'Authentication session expired. Please sign in again.';
    } else if (response.status === 429) {
      errorMsg = 'Too many requests. Please wait a moment before asking again.';
    }

    try {
      const errorData = await response.json();
      if (typeof errorData.detail === 'string') {
        if (errorData.detail.toLowerCase().includes('session')) {
          isExpired = true;
        }
      }
    } catch {
      /* ignore JSON parse failure */
    }

    const err = new Error(errorMsg);
    err.status = response.status;
    err.isSessionExpired = isExpired;
    throw err;
  }

  return await response.json();
}

/**
 * Reset an active AI Assistant session on the backend.
 *
 * @param {string} sessionId
 * @returns {Promise<{session_id: string, status: string, message: string}>}
 */
export async function resetAssistantSession(sessionId) {
  if (!sessionId) return { status: 'reset' };
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/assistant/session/${sessionId}/reset`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // 404 means session already expired on server, which is safe to ignore during reset
    if (response.status === 404) {
      return { session_id: sessionId, status: 'reset', message: 'Session already expired.' };
    }
    throw new Error('Failed to reset assistant session.');
  }

  return await response.json();
}
