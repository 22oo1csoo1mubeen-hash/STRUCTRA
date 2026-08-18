import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Helper to retrieve the current user's JWT access token for authenticated API calls.
 */
async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }
  return session.access_token;
}

/**
 * Send a message to the STRUCTRA AI assistant.
 *
 * @param {string} message - The user's question.
 * @param {Array<{role: string, content: string}>} history - Previous conversation turns.
 * @returns {Promise<{reply: string, metadata: object|null}>}
 */
export async function sendAssistantMessage(message, history = []) {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/assistant/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const msg =
      typeof errorData.detail === 'string'
        ? errorData.detail
        : (errorData.detail?.[0]?.msg || 'Assistant request failed.');
    throw new Error(msg);
  }

  return await response.json();
}
