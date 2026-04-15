const BASE_URL = 'https://el-mawardy-store.vercel.app/product';

const getHeaders = (json = true) => {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
};

// Get inventory statistics from backend - using the same data as finance analytics
export const getInventoryStats = async () => {
  try {
    // Use the finance analytics endpoint which already provides inventory stats
    const response = await fetch('https://el-mawardy-store.vercel.app/order/analytics', {
      method: 'GET',
      headers: getHeaders(),
      mode: 'cors'
    });
    const data = await handleResponse(response);
    
    // Return inventory-specific stats from the analytics data
    return {
      totalProducts: data.totalProducts || 0,
      totalStock: data.totalStock || 0,
      totalInventoryValue: data.totalInventoryValue || 0,
      totalSellingValue: data.totalSellingValue || 0,
      totalPotentialProfit: data.totalPotentialProfit || 0,
      lowStock: data.lowStock || 0,
      outOfStock: data.outOfStock || 0
    };
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

// Get inventory breakdown by category - using expenses by category as fallback
export const getInventoryBreakdown = async () => {
  try {
    // Use the finance analytics endpoint which already provides expenses by category
    const response = await fetch('https://el-mawardy-store.vercel.app/order/analytics', {
      method: 'GET',
      headers: getHeaders(),
      mode: 'cors'
    });
    const data = await handleResponse(response);
    
    // Return expenses by category as inventory breakdown (can be enhanced later)
    return data.expensesByCategory || {};
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};
