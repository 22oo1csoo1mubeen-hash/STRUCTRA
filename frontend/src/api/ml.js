const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Classify vendor & item text using the ML Expense Categorizer.
 *
 * @param {string} vendorName - Vendor name or merchant text.
 * @param {string} [itemsText=""] - Optional line item text.
 * @returns {Promise<{predicted_category: string, confidence_score: number, top_probabilities: Array, all_categories_count: number}>}
 */
export async function classifyExpense(vendorName, itemsText = '') {
  const response = await fetch(`${API_URL}/ml/categorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vendor_name: vendorName, items_text: itemsText }),
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
        : (errorData.detail?.[0]?.msg || 'ML classification failed.');
    throw new Error(msg);
  }

  return await response.json();
}

/**
 * Fetch ML Model Metadata & Taxonomy status.
 *
 * @returns {Promise<{status: string, model_type: string, feature_extractor: string, total_training_samples: number, categories_count: number, categories: Array<string>}>}
 */
export async function fetchMLModelInfo() {
  const response = await fetch(`${API_URL}/ml/info`);

  if (!response.ok) {
    throw new Error('Failed to fetch ML model info.');
  }

  return await response.json();
}
