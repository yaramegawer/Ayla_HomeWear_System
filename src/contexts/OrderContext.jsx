import React, { createContext, useContext, useState, useCallback } from 'react';
import * as orderService from '../services/orderService';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      await orderService.updateOrderDetails(id, data);
      await fetchOrders();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmDeposit = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await orderService.confirmDeposit(id);
      await fetchOrders();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeOrder = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await orderService.deleteOrder(id);
      await fetchOrders();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const returnOrder = async (id, returnReason) => {
    setLoading(true);
    setError(null);
    try {
      await orderService.returnOrder(id, returnReason);
      await fetchOrders();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <OrderContext.Provider value={{
      orders,
      loading,
      error,
      fetchOrders,
      updateStatus,
      confirmDeposit,
      removeOrder,
      returnOrder,
      clearError,
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within an OrderProvider');
  return context;
};

export default OrderContext;
