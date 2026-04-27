import React, { useState, useEffect } from 'react';
import { useProduct } from '../../contexts/ProductContext';
import { useOrder } from '../../contexts/OrderContext';
import {
  MdAdd,
  MdRemove,
  MdEdit,
  MdSearch,
  MdDollarSign
} from 'react-icons/md';

const CreateOrder = () => {
  const { products, loading: productsLoading } = useProduct();
  const { 
    currentOrderItems, 
    addOrderItem, 
    removeOrderItem, 
    updateOrderItem,
    toggleCustomPrice,
    updateCustomPrice,
    updateCustomDiscount,
    calculateOrderTotals,
    createOrder,
    loading: orderLoading,
    error 
  } = useOrder();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerData, setCustomerData] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    government: '',
    shippingCost: 0
  });

  // Filter products for display
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  // Calculate order totals
  const orderTotals = calculateOrderTotals();

  const handleAddProduct = (product) => {
    addOrderItem(product);
  };

  const handleRemoveProduct = (index) => {
    removeOrderItem(index);
  };

  const handleToggleCustomPrice = (index) => {
    toggleCustomPrice(index);
  };

  const handleCustomPriceChange = (index, price) => {
    updateCustomPrice(index, parseFloat(price) || 0);
  };

  const handleCustomDiscountChange = (index, discount) => {
    updateCustomDiscount(index, Math.min(100, Math.max(0, parseInt(discount) || 0)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentOrderItems.length === 0) {
      alert('Please add at least one product to the order');
      return;
    }

    if (!customerData.customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    try {
      const orderData = {
        products: currentOrderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          customPrice: item.useCustomPrice ? item.customPrice : null,
          customDiscount: item.useCustomPrice ? item.customDiscount : null
        })),
        customerName: customerData.customerName,
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address,
        government: customerData.government,
        shippingCost: customerData.shippingCost
      };

      await createOrder(orderData);
      
      // Reset form
      setCustomerData({
        customerName: '',
        phone: '',
        email: '',
        address: '',
        government: '',
        shippingCost: 0
      });
      setShowCustomerForm(false);
      
      alert('Order created successfully!');
    } catch (error) {
      console.error('Order creation error:', error);
      alert(`Failed to create order: ${error.message}`);
    }
  };

  if (productsLoading || orderLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Order</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Products</h2>
          
          {/* Search and Filter */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <MdSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Product List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts.map(product => (
              <div key={product._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.code}</p>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                  <button
                    onClick={() => handleAddProduct(product)}
                    className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
                  >
                    <MdAdd className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Product Image */}
                {product.defaultImage?.url && (
                  <img 
                    src={product.defaultImage.url} 
                    alt={product.name}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                
                <div className="text-sm text-gray-600">
                  <p>Default Price: <span className="font-medium">{product.price} EGP</span></p>
                  <p>Stock: {product.stock || 0} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          
          {currentOrderItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No products added to order</p>
          ) : (
            <div className="space-y-4">
              {currentOrderItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                      <p className="text-sm text-gray-500">
                        {item.color} • {item.size} • Qty: {item.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <MdRemove className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Custom Pricing Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.useCustomPrice}
                        onChange={() => handleToggleCustomPrice(index)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Custom Price</span>
                    </label>
                    
                    {item.useCustomPrice && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        Custom Pricing Active
                      </span>
                    )}
                  </div>

                  {/* Price Display */}
                  <div className="space-y-2">
                    {!item.useCustomPrice ? (
                      <div className="text-sm text-gray-600">
                        <p>Standard Price: <span className="font-medium">{item.product.price} EGP</span></p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">Custom Price:</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.customPrice || ''}
                            onChange={(e) => handleCustomPriceChange(index, e.target.value)}
                            className="w-32 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">Discount (%):</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.customDiscount || ''}
                            onChange={(e) => handleCustomDiscountChange(index, e.target.value)}
                            className="w-20 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Final Price Calculation */}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Final Price:</span>
                      <span className="text-lg font-bold text-green-600">
                        {item.useCustomPrice && item.customPrice 
                          ? (item.customPrice - (item.customPrice * (item.customDiscount || 0) / 100))
                          : item.product.price
                        } EGP
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Items ({orderTotals.itemCount}):</span>
                <span className="font-medium">{orderTotals.itemsPrice.toFixed(2)} EGP</span>
              </div>
              
              {orderTotals.customItemsPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Custom Items:</span>
                  <span className="font-medium text-purple-600">{orderTotals.customItemsPrice.toFixed(2)} EGP</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total Savings:</span>
                <span className="font-medium text-green-600">-{orderTotals.totalSavings.toFixed(2)} EGP</span>
              </div>
              
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total:</span>
                <span className="text-purple-600">{orderTotals.totalPrice.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information Form */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerData.customerName}
                  onChange={(e) => setCustomerData({...customerData, customerName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={customerData.address}
                  onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Government</label>
                <input
                  type="text"
                  value={customerData.government}
                  onChange={(e) => setCustomerData({...customerData, government: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customerData.shippingCost}
                  onChange={(e) => setCustomerData({...customerData, shippingCost: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCustomerForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrder;
