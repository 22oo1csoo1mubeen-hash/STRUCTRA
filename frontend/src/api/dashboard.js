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
 * Generic JSON fetcher with authorization header and error extraction.
 */
async function fetchJson(endpoint, options = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
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
      : (errorData.detail?.[0]?.msg || 'Dashboard request failed.');
    throw new Error(msg);
  }

  return await response.json();
}

/**
 * Fetches primary dashboard summary, highlights, and quality intelligence (Milestone 7.1).
 * @returns {Promise<Object>} DashboardResponse
 */
export async function getDashboard() {
  return await fetchJson('/dashboard');
}

/**
 * Fetches spending over time time-series analytics (Milestone 7.2).
 * @param {'day'|'week'|'month'|'year'} period - Aggregation interval
 * @returns {Promise<Object>} SpendingAnalyticsResponse
 */
export async function getSpendingAnalytics(period = 'month') {
  return await fetchJson(`/dashboard/spending?period=${encodeURIComponent(period)}`);
}

/**
 * Fetches vendor spending breakdown ranked by total amount (Milestone 7.2).
 * @param {number} limit - Maximum number of vendors
 * @returns {Promise<Object>} VendorAnalyticsResponse
 */
export async function getVendorAnalytics(limit = 10) {
  return await fetchJson(`/dashboard/vendors?limit=${encodeURIComponent(limit)}`);
}

/**
 * Fetches most purchased line items ranked by quantity (Milestone 7.2).
 * @param {number} limit - Maximum number of items
 * @returns {Promise<Object>} ItemAnalyticsResponse
 */
export async function getItemAnalytics(limit = 10) {
  return await fetchJson(`/dashboard/items?limit=${encodeURIComponent(limit)}`);
}

/**
 * Fetches purchase highlights (most expensive item and receipt) (Milestone 7.2).
 * @returns {Promise<Object>} PurchaseHighlightsResponse
 */
export async function getPurchaseHighlights() {
  return await fetchJson('/dashboard/highlights');
}

/**
 * Fetches document quality summary and confidence distribution (Milestone 7.3).
 * @returns {Promise<Object>} DashboardQualityResponse
 */
export async function getQualitySummary() {
  return await fetchJson('/dashboard/quality');
}

/**
 * Fetches actionable review queue of documents requiring review (Milestone 7.3).
 * @param {number} limit - Maximum review items
 * @returns {Promise<Object>} ReviewQueueResponse
 */
export async function getReviewQueue(limit = 10) {
  return await fetchJson(`/dashboard/review-queue?limit=${encodeURIComponent(limit)}`);
}

/**
 * Fetches recently saved documents sorted newest first (Milestone 7.3).
 * @param {number} limit - Maximum recent documents
 * @returns {Promise<Object>} RecentDocumentsResponse
 */
export async function getRecentDocuments(limit = 10) {
  return await fetchJson(`/dashboard/recent-documents?limit=${encodeURIComponent(limit)}`);
}
