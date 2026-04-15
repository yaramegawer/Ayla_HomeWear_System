const BASE_URL = 'https://el-mawardy-store.vercel.app/purchase';

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

export const createPurchase = async (purchaseData) => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(purchaseData),
    mode: 'cors'
  });
  return handleResponse(response);
};

export const getAllPurchases = async (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key]) searchParams.append(key, params[key]);
  });
  
  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
    mode: 'cors'
  });
  return handleResponse(response);
};

export const deletePurchase = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    mode: 'cors'
  });
  return handleResponse(response);
};
