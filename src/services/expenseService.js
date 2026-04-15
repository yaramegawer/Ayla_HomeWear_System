const BASE_URL = 'https://el-mawardy-store.vercel.app/expense';

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

export const createExpense = async (expenseData) => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(expenseData),
    mode: 'cors'
  });
  return handleResponse(response);
};

export const getAllExpenses = async (params = {}) => {
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

export const updateExpense = async (id, expenseData) => {
  console.log('=== UPDATE EXPENSE DEBUG ===');
  console.log('URL:', `${BASE_URL}/${id}`);
  console.log('Method: PATCH');
  console.log('Headers:', getHeaders());
  console.log('Body being sent:', JSON.stringify(expenseData, null, 2));
  console.log('Body type:', typeof JSON.stringify(expenseData));
  console.log('========================');
  
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(expenseData),
    mode: 'cors'
  });
  return handleResponse(response);
};

export const deleteExpense = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    mode: 'cors'
  });
  return handleResponse(response);
};
