import { API_URL } from "../config/api";

const BASE_URL = `${API_URL}/finance`;

const getHeaders = (json = true) => {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
};

export const getFinanceOverview = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const response = await fetch(`${BASE_URL}/overview?${params}`, {
    headers: getHeaders(),
    mode: "cors",
  });
  return handleResponse(response);
};

export const updateFinanceSettings = async ({ cashBaseline, capitalMoney }) => {
  const body = {};
  if (cashBaseline !== undefined) body.cashBaseline = Number(cashBaseline);
  if (capitalMoney !== undefined) body.capitalMoney = Number(capitalMoney);

  const response = await fetch(`${BASE_URL}/settings`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
    mode: "cors",
  });
  return handleResponse(response);
};

export const getInventoryPurchases = async (startDate, endDate, page = 1) => {
  const params = new URLSearchParams({ page, limit: 50 });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const response = await fetch(`${BASE_URL}/inventory?${params}`, {
    headers: getHeaders(),
    mode: "cors",
  });
  return handleResponse(response);
};

export const createInventoryPurchase = async (payload) => {
  const response = await fetch(`${BASE_URL}/inventory`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    mode: "cors",
  });
  return handleResponse(response);
};

export const updateInventoryPurchase = async (id, payload) => {
  const response = await fetch(`${BASE_URL}/inventory/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    mode: "cors",
  });
  return handleResponse(response);
};

export const deleteInventoryPurchase = async (id) => {
  const response = await fetch(`${BASE_URL}/inventory/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
    mode: "cors",
  });
  return handleResponse(response);
};
