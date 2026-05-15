import { API_URL } from "../config/api";

const BASE_URL = `${API_URL}/order`;

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

// GET /order - all orders
export const getAllOrders = async () => {
  const response = await fetch(`${BASE_URL}?limit=1000`, { headers: getHeaders(), mode: 'cors' });
  return handleResponse(response);
};

// GET /order/:id
export const getOrderById = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, { headers: getHeaders(), mode: 'cors' });
  return handleResponse(response);
};

// GET /order/analytics
export const getFinanceAnalytics = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await fetch(`${BASE_URL}/analytics?${params}`, { headers: getHeaders(), mode: 'cors' });
  return handleResponse(response);
};

// Search products across all products (reusing productService function)
export const searchProducts = async (query, page = 1, category = '', season = '') => {
  try {
    const params = new URLSearchParams();
    if (query) {
      // Check if query is a product code (alphanumeric with possible numbers) or general search
      if (/^[a-zA-Z0-9\-_]+$/.test(query.trim())) {
        params.append('code', query.trim());
      } else {
        params.append('search', query.trim());
      }
    }
    if (page) params.append('page', page);
    if (category) params.append('category', category);
    if (season) params.append('season', season);

    const response = await fetch(`https://el-mawardy-store.vercel.app/product/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Don't throw error for no results, return empty array instead
      if (errorData.message && errorData.message.includes('Product not found')) {
        return {
          products: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: page > 1
          }
        };
      }
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to search products`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

// POST /order - create new order
export const createOrder = async (orderData) => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(orderData),
    mode: 'cors'
  });
  return handleResponse(response);
};

// POST /api/orders - create new order with custom pricing support
export const createOrderWithCustomPricing = async (orderData) => {
  const response = await fetch('https://el-mawardy-store.vercel.app/api/orders', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(orderData),
    mode: 'cors'
  });
  return handleResponse(response);
};

// PATCH /order/:id - update details
export const updateOrderDetails = async (id, data) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
    mode: 'cors'
  });
  return handleResponse(response);
};

// PATCH /order/:id/confirm-deposit
export const confirmDeposit = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}/confirm-deposit`, {
    method: 'PATCH',
    headers: getHeaders(),
    mode: 'cors'
  });
  return handleResponse(response);
};

// PATCH /order/:id/return
export const returnOrder = async (id, returnReason) => {
  const response = await fetch(`${BASE_URL}/${id}/return`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ returnReason }),
    mode: 'cors'
  });
  return handleResponse(response);
};

// PATCH /order/:id/exchange
export const exchangeOrderProducts = async (id, exchangeItems, exchangeReason) => {
  const response = await fetch(`${BASE_URL}/${id}/exchange`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ exchangeItems, exchangeReason }),
    mode: 'cors'
  });
  return handleResponse(response);
};

// DELETE /order/:id
export const deleteOrder = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    mode: 'cors'
  });
  return handleResponse(response);
};

// DELETE /order/:id?restore=true - delete order with stock restoration
export const deleteOrderWithRestore = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}?restore=true`, {
    method: 'DELETE',
    headers: getHeaders(),
    mode: 'cors'
  });
  return handleResponse(response);
};
