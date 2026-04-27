import React, { createContext, useContext, useState, useCallback } from 'react';
import * as orderService from '../services/orderService';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

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

  // Custom pricing functions
  const addOrderItem = (product) => {
    // Build per-color stock map from colorStock array
    const colorStockMap = {};
    if (Array.isArray(product.colorStock) && product.colorStock.length > 0) {
      product.colorStock.forEach(cs => { colorStockMap[cs.color] = cs.stock || 0; });
    }
    const availColors = Array.isArray(product.colorStock) && product.colorStock.length > 0
      ? product.colorStock.map(cs => cs.color)
      : (Array.isArray(product.color) && product.color.length ? product.color : []);
    const defaultColor = availColors.length ? availColors[0] : '';
    const defaultSize = Array.isArray(product.size) && product.size.length ? product.size[0] : '';

    const discount = product.discount || 0;
    const originalPrice = discount > 0 ? product.price / (1 - discount / 100) : product.price;

    const newItem = {
      _productRef: product,           // keep full product for display
      productId: product._id,
      name: product.name,
      code: product.code,
      price: product.price,     // selling price (already discounted)
      originalPrice,                   // pre-discount price
      discount,                        // discount percentage
      quantity: 1,
      size: defaultSize,
      color: defaultColor,
      availSizes: Array.isArray(product.size) ? product.size : [],
      availColors,
      colorStockMap,   // { red: 6, blue: 4 }
      useCustomPrice: false,
      customPrice: null,
      customDiscount: 0,
      calculatedFinalPrice: product.price || 0
    };
    setOrderItems(prev => [...prev, newItem]);
  };

  const removeOrderItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index, updates) => {
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const toggleCustomPrice = (index) => {
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, useCustomPrice: !item.useCustomPrice } : item
    ));
  };

  const updateCustomPrice = (index, customPrice) => {
    setOrderItems(prev => prev.map((item, i) => {
      if (i === index) {
        const finalPrice = calculateFinalPrice(customPrice, item.customDiscount);
        return { ...item, customPrice, calculatedFinalPrice: finalPrice };
      }
      return item;
    }));
  };

  const updateCustomDiscount = (index, customDiscount) => {
    setOrderItems(prev => prev.map((item, i) => {
      if (i === index) {
        const finalPrice = calculateFinalPrice(item.customPrice || item.originalPrice, customDiscount);
        return { ...item, customDiscount, calculatedFinalPrice: finalPrice };
      }
      return item;
    }));
  };

  const calculateFinalPrice = (price, discount) => {
    const discountAmount = (price * discount) / 100;
    return price - discountAmount;
  };

  const calculateOrderTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.calculatedFinalPrice, 0);
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, totalQuantity, itemCount: orderItems.length };
  };

  const createOrder = async (orderData) => {
    setLoading(true);
    setError(null);
    try {
      await orderService.createOrderWithCustomPricing(orderData);
      await fetchOrders();
      setOrderItems([]);
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
      orderItems,
      setOrderItems,
      fetchOrders,
      updateStatus,
      confirmDeposit,
      removeOrder,
      returnOrder,
      addOrderItem,
      removeOrderItem,
      updateOrderItem,
      toggleCustomPrice,
      updateCustomPrice,
      updateCustomDiscount,
      calculateOrderTotals,
      createOrder,
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
