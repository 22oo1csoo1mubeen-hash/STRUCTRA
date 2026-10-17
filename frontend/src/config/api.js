const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error('VITE_API_URL must be set when building the production frontend.');
}

export const API_URL = (configuredApiUrl || 'http://localhost:8000').replace(/\/+$/, '');

export function getApiAssetUrl(path) {
  if (!path?.startsWith('/')) return path;
  return `${API_URL}${path}`;
}
