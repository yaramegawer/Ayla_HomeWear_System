import { API_URL } from "../config/api";

const BASE_URL = `${API_URL}/treasury`;

// Get daily treasury data
export const getDailyTreasury = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/daily`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch treasury data`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

// Update finance (capital money and available cash)
export const updateFinance = async (financeData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${BASE_URL}/finance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        capitalMoney: Number(financeData.capitalMoney) || 0,
        availableCash: Number(financeData.availableCash) || 0
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update finance data');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};
