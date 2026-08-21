import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Uploads a document to the backend API.
 * 
 * @param {File} file - The file object to upload.
 * @returns {Promise<Object>} The backend upload response containing document_id.
 */
export async function uploadDocument(file, forceDuplicate = false) {
  // 1. Get the current authenticated user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  // 2. Construct FormData using the exact field name 'file'
  const formData = new FormData();
  formData.append('file', file);

  // 3. Send the request to the real backend
  const url = forceDuplicate
    ? `${API_URL}/documents/upload?force_duplicate=true`
    : `${API_URL}/documents/upload`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
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

/**
 * Exports a processed document as a formatted STRUCTRA Excel (.xlsx) workbook.
 * 
 * @param {string} documentId - The target document ID to export.
 * @returns {Promise<{blob: Blob, filename: string}>} The Excel workbook blob and clean filename.
 */
export async function exportDocument(documentId) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}/export`, {
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
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : (errorData.detail?.[0]?.msg || 'Document export failed. Please try again.');
    throw new Error(errorMessage);
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = 'STRUCTRA_EXPORT_document.xlsx';
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

/**
 * Retrieves detailed metadata, saved extraction, and quality signals for one document.
 * 
 * @param {string} documentId - The target document ID.
 * @returns {Promise<Object>} The DocumentDetailResponse object.
 */
export async function getDocumentDetail(documentId) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}`, {
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
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : (errorData.detail?.[0]?.msg || 'Failed to fetch document detail.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Lists the authenticated user's documents for the Document Library.
 *
 * @param {number} [page=1]        - 1-indexed page number.
 * @param {number} [pageSize=20]   - Items per page (1–100).
 * @param {Object} [options={}]    - Optional query filters (search, docType, status, sortBy).
 * @returns {Promise<Object>}      DocumentListResponse { items, page, page_size, total, has_next, stats }
 */
export async function listDocuments(page = 1, pageSize = 20, options = {}) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  // Ensure page_size is strictly within backend supported bounds 1..100
  const validPageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const validPage = Math.max(1, Number(page) || 1);

  const params = new URLSearchParams({
    page: String(validPage),
    page_size: String(validPageSize),
  });

  if (options.search && options.search.trim()) {
    params.set('q', options.search.trim());
  }
  if (options.docType && options.docType !== 'all') {
    params.set('doc_type', options.docType);
  }
  if (options.status) {
    params.set('status_filter', options.status);
  }
  if (options.sortBy) {
    params.set('sort_by', options.sortBy);
  }

  const response = await fetch(`${API_URL}/documents?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string'
      ? errorData.detail
      : (errorData.detail?.[0]?.msg || 'Failed to fetch documents.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Deletes one owned document (storage + metadata).
 *
 * @param {string} documentId - The document ID to delete.
 * @returns {Promise<Object>}  DocumentDeleteResponse { success, message }
 */
export async function deleteDocument(documentId) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string'
      ? errorData.detail
      : (errorData.detail?.[0]?.msg || 'Failed to delete document.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Retrieves a signed preview URL for a private owned document.
 * 
 * @param {string} documentId - The document ID to preview.
 * @returns {Promise<Object>} DocumentPreviewResponse { preview_url, expires_in, content_type, filename }
 */
export async function getDocumentPreview(documentId) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}/preview`, {
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
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : (errorData.detail?.[0]?.msg || 'Failed to fetch document preview.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Updates extraction data on an existing owned document in Document Library.
 * 
 * @param {string} documentId - The document ID to update.
 * @param {Object} extraction - The updated extraction JSON.
 * @returns {Promise<Object>} DocumentDetailResponse
 */
export async function updateDocument(documentId, extraction) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const response = await fetch(`${API_URL}/documents/${documentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(extraction),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string'
      ? errorData.detail
      : (errorData.detail?.[0]?.msg || 'Failed to update document.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Saves a processed document to the user's Document Library, or updates an existing document in-place.
 *
 * @param {string} documentId - The document ID to save.
 * @param {boolean} [forceSaveDuplicate=false] - If true, allow saving a duplicate copy.
 * @param {Object} [extraction=null] - Optional updated extraction JSON for in-place edit updates.
 * @returns {Promise<Object>} DocumentDetailResponse
 */
export async function saveDocument(documentId, forceSaveDuplicate = false, extraction = null, confidenceOverride = undefined) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const url = forceSaveDuplicate
    ? `${API_URL}/documents/${documentId}/save?force_save_duplicate=true`
    : `${API_URL}/documents/${documentId}/save`;

  const isOverrideSpecified = confidenceOverride !== undefined;
  const hasBody = Boolean(extraction || isOverrideSpecified);
  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
  };
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const payload = {};
  if (extraction) payload.extraction = extraction;
  if (isOverrideSpecified) payload.confidence_override = confidenceOverride;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: hasBody ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    const errorMessage = typeof errorData.detail === 'string'
      ? errorData.detail
      : (errorData.detail?.[0]?.msg || 'Failed to save document to library.');
    throw new Error(errorMessage);
  }

  return await response.json();
}

