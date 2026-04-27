import React, { createContext, useContext, useState, useCallback } from 'react';
import * as orderService from '../services/orderService';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [currentOrderItems, setCurrentOrderItems] = useState([]);
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

  const addOrderItem = (product) => {
    const newItem = {
      productId: product._id,
      quantity: 1,
      color: Array.isArray(product.colorStock) && product.colorStock.length > 0 ? product.colorStock[0].color : 'default',
      size: Array.isArray(product.size) && product.size.length > 0 ? product.size[0] : 'M',
      useCustomPrice: false,
      customPrice: null,
      customDiscount: 0,
      calculatedFinalPrice: 0,
      product: product
    };
    setCurrentOrderItems([...currentOrderItems, newItem]);
  };

  const removeOrderItem = (index) => {
    setCurrentOrderItems(currentOrderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index, updates) => {
    const updatedItems = [...currentOrderItems];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    setCurrentOrderItems(updatedItems);
  };

  const toggleCustomPrice = (index) => {
    const updatedItems = [...currentOrderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      useCustomPrice: !updatedItems[index].useCustomPrice
    };
    setCurrentOrderItems(updatedItems);
  };

  const updateCustomPrice = (index, price) => {
    const updatedItems = [...currentOrderItems];
    const item = updatedItems[index];
    const customDiscount = item.customDiscount || 0;
    const finalPrice = price - (price * customDiscount / 100);
    
    updatedItems[index] = {
      ...item,
      customPrice: price,
      calculatedFinalPrice: finalPrice
    };
    setCurrentOrderItems(updatedItems);
  };

  const updateCustomDiscount = (index, discount) => {
    const updatedItems = [...currentOrderItems];
    const item = updatedItems[index];
    const customPrice = item.customPrice || item.product.price;
    const finalPrice = customPrice - (customPrice * discount / 100);
    
    updatedItems[index] = {
      ...item,
      customDiscount: discount,
      calculatedFinalPrice: finalPrice
    };
    setCurrentOrderItems(updatedItems);
  };

  const calculateOrderTotals = () => {
    let itemsPrice = 0;
    let customItemsPrice = 0;
    let totalSavings = 0;

    currentOrderItems.forEach(item => {
      if (item.useCustomPrice && item.customPrice) {
        const originalPrice = item.product.price * item.quantity;
        const finalPrice = item.calculatedFinalPrice * item.quantity;
        customItemsPrice += finalPrice;
        totalSavings += (originalPrice - finalPrice);
      } else {
        itemsPrice += item.product.price * item.quantity;
      }
    });

    return {
      itemsPrice,
      customItemsPrice,
      totalPrice: itemsPrice + customItemsPrice,
      totalSavings,
      itemCount: currentOrderItems.length
    };
  };

  const createOrder = async (orderData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await orderService.createOrder(orderData);
      await fetchOrders();
      setCurrentOrderItems([]);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    orders,
    currentOrderItems,
    loading,
    error,
    fetchOrders,
    updateStatus,
    confirmDeposit,
    removeOrder,
    returnOrder,
    clearError,
    addOrderItem,
    removeOrderItem,
    updateOrderItem,
    toggleCustomPrice,
    updateCustomPrice,
    updateCustomDiscount,
    calculateOrderTotals,
    createOrder
  };

  return (
    <OrderContext.Provider value={value}>
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
