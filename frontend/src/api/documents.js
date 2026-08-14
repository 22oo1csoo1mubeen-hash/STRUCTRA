import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Uploads a document to the backend API.
 * 
 * @param {File} file - The file object to upload.
 * @returns {Promise<Object>} The backend upload response containing document_id.
 */
export async function uploadDocument(file) {
  // 1. Get the current authenticated user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  // 2. Construct FormData using the exact field name 'file'
  const formData = new FormData();
  formData.append('file', file);

  // 3. Send the request to the real backend
  const response = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
      // Do NOT set Content-Type manually, fetch will automatically set it to multipart/form-data with the correct boundary
    },
    body: formData
  });

  // 4. Handle response
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : (errorData.detail?.[0]?.msg || 'Upload failed. Please try again.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Extracts data from a stored document.
 * 
 * @param {string} documentId - The real document_id returned by upload.
 * @returns {Promise<Object>} The backend extraction response.
 */
export async function extractDocument(documentId) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}/extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : (errorData.detail?.[0]?.msg || 'Extraction failed. Please try again.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Validates extraction data using the M5 validation engine.
 * 
 * @param {string} documentId - The real document_id.
 * @param {Object} extraction - The real extraction JSON.
 * @returns {Promise<Object>} The DocumentValidationResult.
 */
export async function validateDocument(documentId, extraction) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}/validate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(extraction)
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : (errorData.detail?.[0]?.msg || 'Validation failed.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Downloads the original uploaded document from storage.
 * 
 * @param {string} documentId - The real document_id.
 * @returns {Promise<{blob: Blob, filename: string}>} The file blob and filename.
 */
export async function downloadDocument(documentId) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : (errorData.detail?.[0]?.msg || 'Document download failed.');
    throw new Error(errorMessage);
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = 'document';
  if (contentDisposition && contentDisposition.includes('filename*=')) {
    const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = decodeURIComponent(filenameMatch[1]);
    }
  } else if (contentDisposition && contentDisposition.includes('filename=')) {
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  const blob = await response.blob();
  return { blob, filename };
}
