import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// Initial state
const initialState = {
  products: [
    {
      id: 1,
      name: 'Summer Pyjama Set',
      category: 'pajamas',
      season: 'summer',
      buyingPrice: 150,
      sellingPrice: 299,
      discount: 0,
      finalPrice: 299,
      stock: 45,
      image: 'https://via.placeholder.com/150x150?text=Pyjama+Set',
      description: 'Comfortable summer pajamas set'
    },
    {
      id: 2,
      name: 'Winter Lingerie Set',
      category: 'lingerie',
      season: 'winter',
      buyingPrice: 200,
      sellingPrice: 450,
      discount: 10,
      finalPrice: 405,
      stock: 20,
      image: 'https://via.placeholder.com/150x150?text=Lingerie+Set',
      description: 'Elegant winter lingerie collection'
    },
    {
      id: 3,
      name: 'Casual Night Dress',
      category: 'nightwear',
      season: 'all',
      buyingPrice: 120,
      sellingPrice: 250,
      discount: 0,
      finalPrice: 250,
      stock: 35,
      image: 'https://via.placeholder.com/150x150?text=Night+Dress',
      description: 'Comfortable casual night dress'
    }
  ],
  orders: [
    {
      id: 1,
      customerName: 'Sarah Ahmed',
      customerPhone: '+20 123 456 7890',
      customerEmail: 'sarah@email.com',
      customerAddress: '123 Main St, Cairo, Egypt',
      customerGovernment: 'Cairo',
      items: [
        {
          productId: 1,
          productName: 'Summer Pyjama Set',
          quantity: 2,
          price: 299,
          size: 'M',
          color: 'Pink'
        }
      ],
      itemsPrice: 598,
      shipping: 50,
      totalPrice: 648,
      deposit: 324,
      dueAmount: 324,
      discount: 0,
      finalPrice: 648,
      paymentStatus: 'completed',
      orderStatus: 'delivered',
      source: 'online',
      orderDate: new Date('2024-01-15'),
      notes: 'Gift wrapped requested'
    },
    {
      id: 2,
      customerName: 'Mariam Mohamed',
      customerPhone: '+20 987 654 3210',
      customerEmail: 'mariam@email.com',
      customerAddress: '456 Market St, Alexandria, Egypt',
      customerGovernment: 'Alexandria',
      items: [
        {
          productId: 2,
          productName: 'Winter Lingerie Set',
          quantity: 1,
          price: 405,
          size: 'L',
          color: 'Black'
        }
      ],
      itemsPrice: 405,
      shipping: 30,
      totalPrice: 435,
      deposit: 218,
      dueAmount: 217,
      discount: 0,
      finalPrice: 435,
      paymentStatus: 'deposit_paid',
      orderStatus: 'confirmed',
      source: 'store',
      orderDate: new Date('2024-01-20'),
      notes: 'Store pickup'
    }
  ],
  returns: [
    {
      id: 1,
      orderId: 1,
      returnAmount: 324,
      returnDate: new Date('2024-01-25'),
      reason: 'Size mismatch',
      itemsRestocked: true
    }
  ],
  coupons: [
    {
      id: 1,
      code: 'SUMMER20',
      discountType: 'percentage',
      discountValue: 20,
      expirationDate: new Date('2024-06-30'),
      usageLimit: 100,
      usedCount: 25,
      isActive: true
    }
  ],
  loading: false,
  error: null
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  ADD_PRODUCT: 'ADD_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  ADD_ORDER: 'ADD_ORDER',
  UPDATE_ORDER: 'UPDATE_ORDER',
  DELETE_ORDER: 'DELETE_ORDER',
  ADD_RETURN: 'ADD_RETURN',
  ADD_COUPON: 'ADD_COUPON',
  UPDATE_COUPON: 'UPDATE_COUPON',
  DELETE_COUPON: 'DELETE_COUPON',
  UPDATE_STOCK: 'UPDATE_STOCK'
};

// Reducer function
const adminReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case actionTypes.ADD_PRODUCT:
      return { ...state, products: [...state.products, action.payload] };
    case actionTypes.UPDATE_PRODUCT:
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.id ? action.payload : product
        )
      };
    case actionTypes.DELETE_PRODUCT:
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload)
      };
    case actionTypes.ADD_ORDER:
      return { ...state, orders: [...state.orders, action.payload] };
    case actionTypes.UPDATE_ORDER:
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id ? action.payload : order
        )
      };
    case actionTypes.DELETE_ORDER:
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload)
      };
    case actionTypes.ADD_RETURN:
      return { ...state, returns: [...state.returns, action.payload] };
    case actionTypes.ADD_COUPON:
      return { ...state, coupons: [...state.coupons, action.payload] };
    case actionTypes.UPDATE_COUPON:
      return {
        ...state,
        coupons: state.coupons.map(coupon =>
          coupon.id === action.payload.id ? action.payload : coupon
        )
      };
    case actionTypes.DELETE_COUPON:
      return {
        ...state,
        coupons: state.coupons.filter(coupon => coupon.id !== action.payload)
      };
    case actionTypes.UPDATE_STOCK:
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.productId
            ? { ...product, stock: action.payload.newStock }
            : product
        )
      };
    default:
      return state;
  }
};

// Create context
const AdminContext = createContext();

// Provider component
export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  // Actions
  const actions = {
    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: actionTypes.SET_ERROR, payload: error }),
    
    // Product actions
    addProduct: (product) => dispatch({ type: actionTypes.ADD_PRODUCT, payload: product }),
    updateProduct: (product) => dispatch({ type: actionTypes.UPDATE_PRODUCT, payload: product }),
    deleteProduct: (productId) => dispatch({ type: actionTypes.DELETE_PRODUCT, payload: productId }),
    
    // Order actions
    addOrder: (order) => dispatch({ type: actionTypes.ADD_ORDER, payload: order }),
    updateOrder: (order) => dispatch({ type: actionTypes.UPDATE_ORDER, payload: order }),
    deleteOrder: (orderId) => dispatch({ type: actionTypes.DELETE_ORDER, payload: orderId }),
    
    // Return actions
    addReturn: (returnData) => dispatch({ type: actionTypes.ADD_RETURN, payload: returnData }),
    
    // Coupon actions
    addCoupon: (coupon) => dispatch({ type: actionTypes.ADD_COUPON, payload: coupon }),
    updateCoupon: (coupon) => dispatch({ type: actionTypes.UPDATE_COUPON, payload: coupon }),
    deleteCoupon: (couponId) => dispatch({ type: actionTypes.DELETE_COUPON, payload: couponId }),
    
    // Stock actions
    updateStock: (productId, newStock) => 
      dispatch({ type: actionTypes.UPDATE_STOCK, payload: { productId, newStock } })
  };

  // Computed values
  const analytics = {
    totalRevenue: state.orders.reduce((sum, order) => sum + order.finalPrice, 0),
    netRevenue: state.orders.reduce((sum, order) => sum + order.finalPrice, 0) - 
                state.returns.reduce((sum, returnItem) => sum + returnItem.returnAmount, 0),
    totalProfit: state.orders.reduce((sum, order) => {
      const orderCost = order.items.reduce((itemSum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        return itemSum + (product ? product.buyingPrice * item.quantity : 0);
      }, 0);
      return sum + (order.finalPrice - orderCost);
    }, 0),
    totalOrders: state.orders.length,
    totalItemsSold: state.orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    averageOrderValue: state.orders.length > 0 
      ? state.orders.reduce((sum, order) => sum + order.finalPrice, 0) / state.orders.length 
      : 0,
    totalDeposits: state.orders.reduce((sum, order) => sum + order.deposit, 0),
    completedPayments: state.orders
      .filter(order => order.paymentStatus === 'completed')
      .reduce((sum, order) => sum + order.finalPrice, 0),
    totalDiscounts: state.orders.reduce((sum, order) => sum + order.discount, 0),
    profitMargin: state.orders.length > 0 ? 
      ((state.orders.reduce((sum, order) => {
        const orderCost = order.items.reduce((itemSum, item) => {
          const product = state.products.find(p => p.id === item.productId);
          return itemSum + (product ? product.buyingPrice * item.quantity : 0);
        }, 0);
        return sum + (order.finalPrice - orderCost);
      }, 0) / state.orders.reduce((sum, order) => sum + order.finalPrice, 0)) * 100) : 0,
    
    // Sales by category
    salesByCategory: state.products.reduce((acc, product) => {
      const categorySales = state.orders.reduce((sum, order) => {
        const categoryItems = order.items.filter(item => item.productId === product.id);
        return sum + categoryItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      }, 0);
      if (categorySales > 0) {
        acc[product.category] = (acc[product.category] || 0) + categorySales;
      }
      return acc;
    }, {}),
    
    // Top selling products
    topSellingProducts: state.products.map(product => {
      const quantitySold = state.orders.reduce((sum, order) => {
        const productItems = order.items.filter(item => item.productId === product.id);
        return sum + productItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);
      return {
        ...product,
        quantitySold,
        revenue: quantitySold * product.finalPrice
      };
    }).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5),
    
    // Orders by source
    ordersBySource: {
      online: state.orders.filter(order => order.source === 'online').length,
      store: state.orders.filter(order => order.source === 'store').length
    }
  };

  const value = {
    ...state,
    ...actions,
    analytics
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

// Hook to use the context
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export default AdminContext;
