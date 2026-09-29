const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch trained categories information and model metadata.
 */
export async function getMLCategories() {
  try {
    const res = await fetch(`${API_URL}/ml/categories`);
    if (!res.ok) {
      throw new Error(`Failed to fetch ML categories: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Error fetching ML categories:', err);
    throw err;
  }
}

/**
 * Live inference prediction for a given transaction text or vendor string.
 * @param {string} text 
 */
export async function predictMLCategory(text) {
  try {
    const res = await fetch(`${API_URL}/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`Failed to predict category: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Error predicting category:', err);
    throw err;
  }
}
