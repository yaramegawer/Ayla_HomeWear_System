import React, { useState, useMemo, useEffect } from 'react';
import { useOrder } from '../../../contexts/OrderContext';
import { useProduct } from '../../../contexts/ProductContext';
import { createReturnRequest, createExchangeRequest } from '../../../services/orderService';
import {
  MdSearch,
  MdVisibility,
  MdCheckCircle,
  MdDelete,
  MdRefresh,
  MdEdit,
  MdArrowBack,
  MdSwapHoriz,
  MdKeyboardReturn,
} from 'react-icons/md';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);

const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-EG') : '—';

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_COLORS = {
  pending:          'bg-yellow-100 text-yellow-800',
  deposit_sent:     'bg-blue-100 text-blue-800',
  completed:        'bg-green-100 text-green-800',
  deposit_returned: 'bg-gray-100 text-gray-600',
};

const ITEMS_PER_PAGE = 10;

// Convert raw backend/Mongoose errors to user-friendly messages
const parseError = (message = '') => {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('validation failed')) {
    const fields = [];
    const regex = /Path `([^`]+)` is required/g;
    let m;
    while ((m = regex.exec(message)) !== null) {
      const field = m[1].replace(/([A-Z])/g, ' $1').replace(/\./g, ' → ').trim();
      fields.push(field.charAt(0).toUpperCase() + field.slice(1));
    }
    if (fields.length > 0) return `Missing required fields: ${fields.join(', ')}.`;
  }
  if (message.includes('is not allowed')) return `Field not allowed: ${message.replace(/"/g, '')}`;
  if (message.includes('HTTP 404')) return 'Order not found.';
  if (message.includes('HTTP 400')) return 'Invalid data. Please check your input.';
  if (message.includes('HTTP 500')) return 'Server error. Please try again later.';
  return message;
};

const OrdersManagement = () => {
  const { orders, loading, error, fetchOrders, updateStatus, confirmDeposit, removeOrder, clearError } = useOrder();
  const { products, allProducts, loadAllProducts } = useProduct();

  // Look up a product's code by its _id
  const getProductCode = (productId) => {
    const catalog = allProducts.length > 0 ? allProducts : products;
    if (!productId || !Array.isArray(catalog)) return '—';
    const id = productId?.toString?.();
    const found = catalog.find(p => p._id?.toString() === id);
    return found?.code || id?.slice(-6) || '—';
  };
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterSource, setFilterSource]   = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails]     = useState(false);
  const [actionOrder, setActionOrder]     = useState(null);  // order being edited in action modal
  const [actionStatus, setActionStatus]   = useState('');
  const [actionPaymentStatus, setActionPaymentStatus] = useState('');
  const [actionDeposit, setActionDeposit] = useState(false);
  const [actionNotes, setActionNotes]     = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage]     = useState(1);

  // Return/Exchange modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [exchangeQuantity, setExchangeQuantity] = useState(1);
  const [exchangeNewColor, setExchangeNewColor] = useState('');
  const [exchangeNewSize, setExchangeNewSize] = useState('');
  const [exchangeNewProductId, setExchangeNewProductId] = useState('');
  const [exchangeProductSearch, setExchangeProductSearch] = useState('');
  const [useManualColor, setUseManualColor] = useState(false);
  const [useManualSize, setUseManualSize] = useState(false);
  const [detailsTab, setDetailsTab] = useState('details'); // 'details' | 'returns'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    fetchOrders();
    loadAllProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPayment, filterSource]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(order => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        (order.customerName || '').toLowerCase().includes(search) ||
        (order.phone || '').includes(search) ||
        (order._id || '').includes(search);
      const matchesStatus  = filterStatus  === 'all' || order.status        === filterStatus;
      const matchesPayment = filterPayment === 'all' || order.paymentStatus  === filterPayment;
      const matchesSource  = filterSource  === 'all' || order.source         === filterSource;
      return matchesSearch && matchesStatus && matchesPayment && matchesSource;
    });
  }, [orders, searchTerm, filterStatus, filterPayment, filterSource]);

  const totalPages      = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleUpdateStatus = async (id, status) => {
    try { await updateStatus(id, status); }
    catch (e) { alert(parseError(e.message)); }
  };

  const handleConfirmDeposit = async (id) => {
    try { await confirmDeposit(id); }
    catch (e) { alert(parseError(e.message)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    try { await removeOrder(id); }
    catch (e) { alert(parseError(e.message)); }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const openActionModal = (order) => {
    setActionOrder(order);
    setActionStatus(order.status);
    setActionPaymentStatus(order.paymentStatus || 'pending');
    setActionDeposit(order.depositConfirmed);
    setActionNotes(order.notes || '');
  };

  const handleSaveActions = async () => {
    if (!actionOrder) return;
    setActionLoading(true);
    try {
      // Update fields if they changed (Note: Backend Joi validation strictly requires 'status' to always be present)
      const originalNotes = actionOrder.notes || '';
      const updatePayload = { status: actionStatus };

      if (actionNotes.trim() !== originalNotes.trim()) updatePayload.notes = actionNotes.trim();

      await updateStatus(actionOrder._id, updatePayload);
      // Confirm deposit if toggled on and not yet confirmed
      if (actionDeposit && !actionOrder.depositConfirmed) {
        await confirmDeposit(actionOrder._id);
      }
      setActionOrder(null);
    } catch (e) {
      alert(parseError(e.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Helper functions for return/exchange
  const isItemEligibleForReturn = (item) => {
    if (!selectedOrder || selectedOrder.status !== 'delivered') return false;
    const returnedQty = item.returnedQuantity || 0;
    const exchangedQty = item.exchangedQuantity || 0;
    const availableQty = item.quantity - returnedQty - exchangedQty;
    return availableQty > 0;
  };

  const isItemEligibleForExchange = (item) => {
    if (!selectedOrder || selectedOrder.status !== 'delivered') return false;
    const returnedQty = item.returnedQuantity || 0;
    const exchangedQty = item.exchangedQuantity || 0;
    const availableQty = item.quantity - returnedQty - exchangedQty;
    return availableQty > 0;
  };

  const getItemAvailableQuantity = (item) => {
    const returnedQty = item.returnedQuantity || 0;
    const exchangedQty = item.exchangedQuantity || 0;
    return item.quantity - returnedQty - exchangedQty;
  };

  const openReturnModal = (item) => {
    setSelectedItem(item);
    setReturnQuantity(1);
    setReturnReason('');
    setModalError('');
    setShowReturnModal(true);
  };

  const openExchangeModal = (item) => {
    setSelectedItem(item);
    setExchangeQuantity(1);
    setExchangeNewColor(item.color || '');
    setExchangeNewSize(item.size || '');
    setExchangeNewProductId(item.productId || '');
    setExchangeProductSearch('');
    setUseManualColor(false);
    setUseManualSize(false);
    setModalError('');
    setShowExchangeModal(true);
  };

  const handleCloseReturnModal = () => {
    setShowReturnModal(false);
    setSelectedItem(null);
    setReturnQuantity(1);
    setReturnReason('');
    setModalError('');
  };

  const handleCloseExchangeModal = () => {
    setShowExchangeModal(false);
    setSelectedItem(null);
    setExchangeQuantity(1);
    setExchangeNewColor('');
    setExchangeNewSize('');
    setExchangeNewProductId('');
    setExchangeProductSearch('');
    setUseManualColor(false);
    setUseManualSize(false);
    setModalError('');
  };

  const handleReturnSubmit = async () => {
    if (!selectedItem || !selectedOrder) return;
    
    const availableQty = getItemAvailableQuantity(selectedItem);
    if (returnQuantity > availableQty) {
      setModalError(`Cannot return more than ${availableQty} items`);
      return;
    }
    if (returnQuantity < 1) {
      setModalError('Return quantity must be at least 1');
      return;
    }
    if (!returnReason.trim()) {
      setModalError('Return reason is required');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      const requestBody = {
        returnItems: [{
          originalLineItemId: selectedItem._id,
          quantity: returnQuantity
        }],
        returnReason: returnReason.trim()
      };
      console.log('Submitting return for order:', selectedOrder._id);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      await createReturnRequest(selectedOrder._id, requestBody);
      
      // Refresh order data
      await fetchOrders();
      const updatedOrder = orders.find(o => o._id === selectedOrder._id);
      if (updatedOrder) setSelectedOrder(updatedOrder);
      
      handleCloseReturnModal();
      alert('Return request submitted successfully');
    } catch (e) {
      console.error('Return error:', e);
      setModalError(e.message || 'Failed to submit return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExchangeSubmit = async () => {
    if (!selectedItem || !selectedOrder) return;
    
    const availableQty = getItemAvailableQuantity(selectedItem);
    if (exchangeQuantity > availableQty) {
      setModalError(`Cannot exchange more than ${availableQty} items`);
      return;
    }
    if (exchangeQuantity < 1) {
      setModalError('Exchange quantity must be at least 1');
      return;
    }
    if (!exchangeNewProductId) {
      setModalError('Please select a replacement product');
      return;
    }
    if (!exchangeNewColor.trim()) {
      setModalError('Please select a replacement color');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      console.log('Submitting exchange for order:', selectedOrder._id);
      console.log('Exchange items:', [{
        originalLineItemId: selectedItem._id,
        newProductId: exchangeNewProductId,
        quantity: exchangeQuantity,
        newColor: exchangeNewColor.trim(),
        newSize: exchangeNewSize.trim() || undefined
      }]);
      await createExchangeRequest(selectedOrder._id, {
        exchangeItems: [{
          originalLineItemId: selectedItem._id,
          newProductId: exchangeNewProductId,
          quantity: exchangeQuantity,
          newColor: exchangeNewColor.trim(),
          newSize: exchangeNewSize.trim() || undefined
        }],
        exchangeReason: 'Customer requested exchange'
      });
      
      // Refresh order data
      await fetchOrders();
      const updatedOrder = orders.find(o => o._id === selectedOrder._id);
      if (updatedOrder) setSelectedOrder(updatedOrder);
      
      handleCloseExchangeModal();
      alert('Exchange request submitted successfully');
    } catch (e) {
      console.error('Exchange error:', e);
      setModalError(e.message || 'Failed to submit exchange request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available colors for a product
  const getProductColors = (productId) => {
    const catalog = allProducts.length > 0 ? allProducts : products;
    const product = catalog.find(p => p._id === productId);
    if (!product) {
      console.log('Product not found for ID:', productId);
      return [];
    }
    console.log('Product data for colors:', product);
    // Try different possible data structures for variants
    if (product.variants && Array.isArray(product.variants)) {
      const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];
      console.log('Colors from variants:', colors);
      return colors;
    }
    if (product.colors && Array.isArray(product.colors)) {
      console.log('Colors from colors array:', product.colors);
      return product.colors;
    }
    if (product.availableColors && Array.isArray(product.availableColors)) {
      console.log('Colors from availableColors:', product.availableColors);
      return product.availableColors;
    }
    if (Array.isArray(product.colorStock) && product.colorStock.length > 0) {
      const colors = product.colorStock.map(cs => cs.color).filter(Boolean);
      console.log('Colors from colorStock:', colors);
      return colors;
    }
    console.log('No colors found for product');
    return [];
  };

  // Get available sizes for a product and color
  const getProductSizes = (productId, color) => {
    const catalog = allProducts.length > 0 ? allProducts : products;
    const product = catalog.find(p => p._id === productId);
    if (!product) {
      console.log('Product not found for ID:', productId);
      return [];
    }
    console.log('Getting sizes for product:', productId, 'color:', color);
    // Try different possible data structures for variants
    if (product.variants && Array.isArray(product.variants)) {
      if (color) {
        const sizes = [...new Set(product.variants.filter(v => v.color === color).map(v => v.size).filter(Boolean))];
        console.log('Sizes from variants with color:', sizes);
        return sizes;
      }
      const sizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
      console.log('Sizes from variants:', sizes);
      return sizes;
    }
    if (product.sizes && Array.isArray(product.sizes)) {
      console.log('Sizes from sizes array:', product.sizes);
      return product.sizes;
    }
    if (product.availableSizes && Array.isArray(product.availableSizes)) {
      console.log('Sizes from availableSizes:', product.availableSizes);
      return product.availableSizes;
    }
    if (Array.isArray(product.size) && product.size.length > 0) {
      console.log('Sizes from size array:', product.size);
      return product.size;
    }
    console.log('No sizes found for product');
    return [];
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500">Manage and track all customer orders</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <MdRefresh className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
          <p className="text-sm text-red-600">{parseError(error)}</p>
          <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xs">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, ID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterPayment}
            onChange={e => setFilterPayment(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Payments</option>
            <option value="pending">Pending</option>
            <option value="deposit_sent">Deposit Sent</option>
            <option value="completed">Completed</option>
            <option value="deposit_returned">Deposit Returned</option>
          </select>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Sources</option>
            <option value="online">Online</option>
            <option value="store">Store</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading && (
          <div className="text-center py-10 text-sm text-gray-500">Loading orders…</div>
        )}
        {!loading && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Order ID', 'Customer', 'Items', 'Total', 'Deposit', 'Payment', 'Status', 'Source', 'Notes', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-sm text-gray-400">
                        No orders found.
                      </td>
                    </tr>
                  ) : paginatedOrders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      {/* Order ID */}
                      <td className="px-3 py-2 text-xs font-mono text-gray-600 whitespace-nowrap">
                        #{order._id?.slice(-6)}
                      </td>
                      {/* Customer */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                        <div className="text-xs text-gray-500">{order.phone}</div>
                      </td>
                      {/* Items count */}
                      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                        {order.itemsCount ?? order.products?.length ?? 0} pcs
                      </td>
                      {/* Total */}
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(order.totalPrice)}
                      </td>
                      {/* Deposit */}
                      <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {formatCurrency(order.depositAmount)}
                        {order.depositConfirmed && (
                          <span className="ml-1 text-xs text-green-600 font-medium">✓</span>
                        )}
                      </td>
                      {/* Payment status */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${PAYMENT_COLORS[order.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                          {(order.paymentStatus || '').replace('_', ' ')}
                        </span>
                      </td>
                      {/* Order status — badge only */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      {/* Source */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${order.source === 'online' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                          {order.source}
                        </span>
                      </td>
                      {/* Notes */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-xs text-gray-400 max-w-[120px] truncate block" title={order.notes}>
                          {order.notes || '—'}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(order.orderDate || order.createdAt)}
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetails(order)}
                            title="View Details"
                            className="p-1 text-purple-600 hover:text-purple-800 rounded"
                          >
                            <MdVisibility className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openActionModal(order)}
                            title="Edit Order"
                            className="p-1 text-blue-600 hover:text-blue-800 rounded"
                          >
                            <MdEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order._id)}
                            title="Delete Order"
                            className="p-1 text-red-500 hover:text-red-700 rounded"
                          >
                            <MdDelete className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded disabled:text-gray-300 hover:bg-gray-50"
                  >Previous</button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs border border-gray-300 rounded disabled:text-gray-300 hover:bg-gray-50"
                  >Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Order Action Modal */}
      {actionOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-base">Update Order</h2>
                  <p className="text-purple-200 text-xs mt-0.5">
                    {actionOrder.customerName} · #{actionOrder._id?.slice(-6)}
                  </p>
                </div>
                <button
                  onClick={() => setActionOrder(null)}
                  className="text-purple-200 hover:text-white text-2xl font-light leading-none transition-colors"
                >✕</button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">

              {/* Status Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 text-xs font-bold">1</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Order Status</p>
                </div>
                <p className="text-xs text-gray-500 mb-3 ml-8">
                  Choose the current stage of this order in your fulfillment pipeline.
                </p>

                <div className="grid grid-cols-1 gap-2 ml-8">
                  {[
                    { value: 'pending',   label: 'Pending',   desc: 'Order received, awaiting review',     bg: 'bg-yellow-50',  border: 'border-yellow-300', dot: 'bg-yellow-400', text: 'text-yellow-800' },
                    { value: 'confirmed', label: 'Confirmed', desc: 'Order reviewed and accepted',          bg: 'bg-blue-50',    border: 'border-blue-300',   dot: 'bg-blue-500',   text: 'text-blue-800'   },
                    { value: 'shipped',   label: 'Shipped',   desc: 'Package handed to delivery company',  bg: 'bg-purple-50',  border: 'border-purple-300', dot: 'bg-purple-500', text: 'text-purple-800' },
                    { value: 'delivered', label: 'Delivered', desc: 'Customer received the order',         bg: 'bg-green-50',   border: 'border-green-300',  dot: 'bg-green-500',  text: 'text-green-800'  },
                    { value: 'cancelled', label: 'Cancelled', desc: 'Order was cancelled',                 bg: 'bg-red-50',     border: 'border-red-300',    dot: 'bg-red-400',    text: 'text-red-800'    },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                        actionStatus === opt.value
                          ? `${opt.bg} ${opt.border}`
                          : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="order-status"
                        value={opt.value}
                        checked={actionStatus === opt.value}
                        onChange={() => setActionStatus(opt.value)}
                        className="sr-only"
                      />
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${actionStatus === opt.value ? opt.dot : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${actionStatus === opt.value ? opt.text : 'text-gray-700'}`}>
                          {opt.label}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </div>
                      {actionStatus === opt.value && (
                        <span className="text-purple-500 text-base">✓</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Order Notes</label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  placeholder="Internal notes for this order (optional)…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Deposit Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">2</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Deposit Confirmation</p>
                </div>

                {actionOrder.depositConfirmed ? (
                  <div className="ml-8 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <span className="text-green-500 text-lg">✓</span>
                    <div>
                      <p className="text-sm font-medium text-green-800">Deposit already confirmed</p>
                      <p className="text-xs text-green-600">{formatCurrency(actionOrder.depositAmount)} via {(actionOrder.depositPaymentMethod || '').replace('_', ' ')}</p>
                    </div>
                  </div>
                ) : (
                  <label className={`ml-8 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    actionDeposit ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={actionDeposit}
                      onChange={e => setActionDeposit(e.target.checked)}
                      className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                    />
                    <div>
                      <p className={`text-sm font-medium ${actionDeposit ? 'text-green-800' : 'text-gray-700'}`}>
                        Mark deposit as received
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatCurrency(actionOrder.depositAmount)} expected via {(actionOrder.depositPaymentMethod || '').replace('_', ' ')}
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1 shrink-0 mt-auto">
                <button
                  onClick={handleSaveActions}
                  disabled={actionLoading}
                  className={`flex-1 py-2.5 text-sm text-white rounded-xl font-semibold transition-all shadow-sm ${
                    actionLoading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                  }`}
                >
                  {actionLoading ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setActionOrder(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
                <p className="text-xs text-gray-400 font-mono">#{selectedOrder._id}</p>
              </div>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b shrink-0">
              <button
                onClick={() => setDetailsTab('details')}
                className={`px-6 py-3 text-sm font-medium ${detailsTab === 'details' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Order Details
              </button>
              <button
                onClick={() => setDetailsTab('returns')}
                className={`px-6 py-3 text-sm font-medium ${detailsTab === 'returns' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Returns & Exchanges
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {detailsTab === 'details' && (
                <div className="space-y-5">
              {/* Customer & Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Customer</p>
                  <p className="text-sm font-medium text-gray-900">{selectedOrder.customerName}</p>
                  <p className="text-xs text-gray-600">{selectedOrder.phone}</p>
                  <p className="text-xs text-gray-600">{selectedOrder.email}</p>
                  <p className="text-xs text-gray-600">{selectedOrder.address}, {selectedOrder.government}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Order Info</p>
                  <p className="text-xs text-gray-600"><span className="font-medium">Date:</span> {formatDate(selectedOrder.orderDate || selectedOrder.createdAt)}</p>
                  <p className="text-xs text-gray-600"><span className="font-medium">Source:</span> {selectedOrder.source}</p>
                  <p className="text-xs text-gray-600"><span className="font-medium">Status:</span> {selectedOrder.status}</p>
                  <p className="text-xs text-gray-600"><span className="font-medium">Payment:</span> {selectedOrder.paymentStatus?.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-600"><span className="font-medium">Deposit Confirmed:</span> {selectedOrder.depositConfirmed ? 'Yes ✓' : 'No'}</p>
                  {selectedOrder.notes && <p className="text-xs text-gray-600"><span className="font-medium">Notes:</span> {selectedOrder.notes}</p>}
                </div>
                
                {/* Payment Methods */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Payment Methods</p>
                  <p className="text-xs text-gray-600"><span className="font-medium">Deposit:</span> {(selectedOrder.depositPaymentMethod || '').replace('_', ' ') || '—'}</p>
                  <p className="text-xs text-gray-600"><span className="font-medium">Due:</span> {(selectedOrder.duePaymentMethod || '').replace('_', ' ') || '—'}</p>
                </div>
              </div>

              {/* Products */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Products</p>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Code', 'Color', 'Size', 'Qty', 'Status', 'Price', 'Line Total', 'Actions'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedOrder.products || []).map((item, i) => {
                        const discountPct = item.discountPercentage || 0;
                        const hasDiscount = discountPct > 0;
                        const sellingPrice = item.finalPrice || item.price;
                        const originalPrice = hasDiscount ? (item.price || sellingPrice) / (1 - discountPct / 100) : sellingPrice;
                        const returnedQty = item.returnedQuantity || 0;
                        const exchangedQty = item.exchangedQuantity || 0;
                        const availableQty = item.quantity - returnedQty - exchangedQty;
                        const canReturn = isItemEligibleForReturn(item);
                        const canExchange = isItemEligibleForExchange(item);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono font-medium text-purple-700">{getProductCode(item.productId)}</td>
                            <td className="px-3 py-2">{item.color || '—'}</td>
                            <td className="px-3 py-2">{item.size || '—'}</td>
                            <td className="px-3 py-2">
                              {item.quantity}
                              {(returnedQty > 0 || exchangedQty > 0) && (
                                <div className="text-[10px] text-gray-500">
                                  {returnedQty > 0 && <span className="text-orange-600">Returned: {returnedQty}</span>}
                                  {returnedQty > 0 && exchangedQty > 0 && <span> · </span>}
                                  {exchangedQty > 0 && <span className="text-blue-600">Exchanged: {exchangedQty}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${availableQty > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {availableQty > 0 ? `${availableQty} available` : 'Fully returned/exchanged'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {hasDiscount ? (
                                <div>
                                  <span className="text-gray-400 line-through block">{formatCurrency(originalPrice)}</span>
                                  <span className="font-medium">{formatCurrency(sellingPrice)}</span>
                                  <span className="ml-1 text-[10px] text-red-600 bg-red-50 px-1 py-0.5 rounded">-{discountPct}%</span>
                                </div>
                              ) : (
                                formatCurrency(sellingPrice)
                              )}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {hasDiscount ? (
                                <div>
                                  <span className="text-gray-400 line-through block">{formatCurrency(originalPrice * item.quantity)}</span>
                                  <span>{formatCurrency(sellingPrice * item.quantity)}</span>
                                </div>
                              ) : (
                                formatCurrency(sellingPrice * item.quantity)
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openReturnModal(item)}
                                  disabled={!canReturn}
                                  className={`p-1 rounded text-xs ${canReturn ? 'text-orange-600 hover:bg-orange-50' : 'text-gray-300 cursor-not-allowed'}`}
                                  title="Return Item"
                                >
                                  <MdKeyboardReturn className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openExchangeModal(item)}
                                  disabled={!canExchange}
                                  className={`p-1 rounded text-xs ${canExchange ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                                  title="Exchange Item"
                                >
                                  <MdSwapHoriz className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Price Summary */}
              <div className="border-t pt-4 space-y-2">
                {(() => {
                  // Calculate total original price from per-item discounts
                  const items = selectedOrder.products || [];
                  const totalOriginal = items.reduce((sum, it) => {
                    const pct = it.discountPercentage || 0;
                    const selling = it.finalPrice || it.price;
                    const orig = pct > 0 ? (it.price || selling) / (1 - pct / 100) : selling;
                    return sum + orig * it.quantity;
                  }, 0);
                  const totalSelling = items.reduce((sum, it) => sum + (it.finalPrice || it.price) * it.quantity, 0);
                  const hasAnyDiscount = items.some(it => (it.discountPercentage || 0) > 0);
                  return (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Price:</span>
                        <div className="text-right">
                          {hasAnyDiscount ? (
                            <>
                              <span className="text-xs text-gray-400 line-through mr-2">
                                {formatCurrency(totalOriginal)}
                              </span>
                              <span>{formatCurrency(totalSelling)}</span>
                            </>
                          ) : (
                            <span>{formatCurrency(selectedOrder.itemsPrice)}</span>
                          )}
                        </div>
                      </div>
                      {hasAnyDiscount && (
                        <div className="flex justify-between text-xs text-red-500">
                          <span>Discount:</span><span>-{formatCurrency(totalOriginal - totalSelling)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping:</span><span>{formatCurrency(selectedOrder.shippingCost)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-2">
                  <span>Total Price:</span><span>{formatCurrency(selectedOrder.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Deposit:</span>
                  <span>{formatCurrency(selectedOrder.depositAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Due:</span>
                  <span>{formatCurrency(selectedOrder.dueAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 border-t pt-2">
                  <span>Total Cost (buy price):</span><span>{formatCurrency(selectedOrder.totalCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-600 font-medium">
                  <span>Estimated Profit:</span><span>{formatCurrency(selectedOrder.estimatedProfit)}</span>
                </div>
                {(selectedOrder.status === 'delivered' || selectedOrder.realizedProfit !== undefined) && (
                  <div className="flex justify-between text-xs text-green-600 font-medium border-t border-gray-100 pt-1 mt-1">
                    <span>Realized Profit:</span><span>{formatCurrency(selectedOrder.realizedProfit)}</span>
                  </div>
                )}
              </div>

              {/* Return info if applicable */}
              {selectedOrder.isReturned && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Return Info</p>
                  <p className="text-xs text-red-600">Reason: {selectedOrder.returnReason || '—'}</p>
                  <p className="text-xs text-red-600">Amount: {formatCurrency(selectedOrder.returnAmount)}</p>
                  <p className="text-xs text-red-600">Date: {formatDate(selectedOrder.returnDate)}</p>
                  <p className="text-xs text-red-600">Refund Status: {selectedOrder.refundStatus}</p>
                </div>
              )}

              {/* Quick actions in modal */}
              <div className="flex gap-2 pt-2">
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => { handleUpdateStatus(selectedOrder._id, 'confirmed'); setShowDetails(false); }}
                    className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >Confirm Order</button>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <button
                    onClick={() => { handleUpdateStatus(selectedOrder._id, 'shipped'); setShowDetails(false); }}
                    className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >Mark as Shipped</button>
                )}
                {selectedOrder.status === 'shipped' && (
                  <button
                    onClick={() => { handleUpdateStatus(selectedOrder._id, 'delivered'); setShowDetails(false); }}
                    className="flex-1 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >Mark as Delivered</button>
                )}
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >Close</button>
              </div>
                </div>
              )}

              {/* Returns & Exchanges Tab */}
              {detailsTab === 'returns' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Return & Exchange Requests</p>
                    {(selectedOrder.returnRequests || []).length === 0 && (selectedOrder.exchangeRequests || []).length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <p className="text-sm text-gray-500">No return or exchange requests for this order</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Return Requests */}
                        {(selectedOrder.returnRequests || []).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Return Requests</p>
                            <div className="space-y-2">
                              {(selectedOrder.returnRequests || []).map((req, i) => (
                                <div key={i} className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{getProductCode(req.productId)}</p>
                                      <p className="text-xs text-gray-600">Quantity: {req.quantity}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {req.status || 'Pending'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-1">Reason: {req.returnReason}</p>
                                  <p className="text-xs text-gray-500">Refund: {formatCurrency(req.refundAmount)} · {formatDate(req.createdAt)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exchange Requests */}
                        {(selectedOrder.exchangeRequests || []).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Exchange Requests</p>
                            <div className="space-y-2">
                              {(selectedOrder.exchangeRequests || []).map((req, i) => (
                                <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{getProductCode(req.productId)}</p>
                                      <p className="text-xs text-gray-600">
                                        {req.originalColor} / {req.originalSize} → {req.newColor} / {req.newSize}
                                      </p>
                                      <p className="text-xs text-gray-600">Quantity: {req.quantity}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {req.status || 'Pending'}
                                    </span>
                                  </div>
                                  {req.priceDifference !== undefined && (
                                    <p className="text-xs font-medium mb-1">
                                      Price Difference: {req.priceDifference > 0 ? '+' : ''}{formatCurrency(req.priceDifference)}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">{formatDate(req.createdAt)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Item Modal */}
      {showReturnModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Return Item</h2>
                <p className="text-xs text-gray-400">{getProductCode(selectedItem.productId)}</p>
              </div>
              <button onClick={handleCloseReturnModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Product Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{getProductCode(selectedItem.productId)}</p>
                <p className="text-xs text-gray-600">Color: {selectedItem.color || '—'} · Size: {selectedItem.size || '—'}</p>
                <p className="text-xs text-gray-600">Purchased: {selectedItem.quantity} · Available: {getItemAvailableQuantity(selectedItem)}</p>
                <p className="text-xs text-gray-600">Price: {formatCurrency(selectedItem.finalPrice || selectedItem.price)}</p>
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Return Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReturnQuantity(Math.max(1, returnQuantity - 1))}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={getItemAvailableQuantity(selectedItem)}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Math.min(getItemAvailableQuantity(selectedItem), Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center px-2 py-1 border border-gray-300 rounded"
                  />
                  <button
                    onClick={() => setReturnQuantity(Math.min(getItemAvailableQuantity(selectedItem), returnQuantity + 1))}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Return Reason *</label>
                <textarea
                  rows={3}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Please provide a reason for the return..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              {/* Refund Preview */}
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-700 mb-1">Refund Preview</p>
                <p className="text-xs text-gray-600">Unit Price: {formatCurrency(selectedItem.finalPrice || selectedItem.price)}</p>
                <p className="text-xs text-gray-600">Quantity: {returnQuantity}</p>
                <p className="text-sm font-bold text-green-700">Refund Amount: {formatCurrency((selectedItem.finalPrice || selectedItem.price) * returnQuantity)}</p>
              </div>

              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-600">{modalError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleReturnSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 py-2 text-sm text-white rounded-lg font-medium ${isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Return'}
                </button>
                <button
                  onClick={handleCloseReturnModal}
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Item Modal */}
      {showExchangeModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Exchange Item</h2>
                <p className="text-xs text-gray-400">{getProductCode(selectedItem.productId)}</p>
              </div>
              <button onClick={handleCloseExchangeModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Original Product Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Original Item</p>
                <p className="text-sm font-medium text-gray-900">{getProductCode(selectedItem.productId)}</p>
                <p className="text-xs text-gray-600">Color: {selectedItem.color || '—'} · Size: {selectedItem.size || '—'}</p>
                <p className="text-xs text-gray-600">Purchased: {selectedItem.quantity} · Available: {getItemAvailableQuantity(selectedItem)}</p>
                <p className="text-xs text-gray-600">Price: {formatCurrency(selectedItem.finalPrice || selectedItem.price)}</p>
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Exchange Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExchangeQuantity(Math.max(1, exchangeQuantity - 1))}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={getItemAvailableQuantity(selectedItem)}
                    value={exchangeQuantity}
                    onChange={(e) => setExchangeQuantity(Math.min(getItemAvailableQuantity(selectedItem), Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center px-2 py-1 border border-gray-300 rounded"
                  />
                  <button
                    onClick={() => setExchangeQuantity(Math.min(getItemAvailableQuantity(selectedItem), exchangeQuantity + 1))}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Product Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Replacement Product *</label>
                <div className="relative">
                  <MdSearch className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by product code or name..."
                    value={exchangeProductSearch}
                    onChange={(e) => setExchangeProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                
                {/* Product List */}
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {(() => {
                    const filteredProducts = (allProducts || []).filter(p => {
                      const search = exchangeProductSearch.toLowerCase();
                      return (p.code || '').toLowerCase().includes(search) || 
                             (p.name || '').toLowerCase().includes(search);
                    });
                    
                    if (filteredProducts.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No products found
                        </div>
                      );
                    }
                    
                    return filteredProducts.map(p => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          setExchangeNewProductId(p._id);
                          setExchangeNewColor('');
                          setExchangeNewSize('');
                          setExchangeProductSearch(p.code || p.name);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 ${
                          exchangeNewProductId === p._id ? 'bg-purple-100 border-l-4 border-l-purple-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.code}</p>
                            <p className="text-xs text-gray-600">{p.name}</p>
                          </div>
                          {exchangeNewProductId === p._id && (
                            <MdCheckCircle className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Replacement Color */}
              {exchangeNewProductId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-700">Replacement Color *</label>
                    <button
                      type="button"
                      onClick={() => setUseManualColor(!useManualColor)}
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      {useManualColor ? 'Use dropdown' : 'Type manually'}
                    </button>
                  </div>
                  {useManualColor ? (
                    <input
                      type="text"
                      value={exchangeNewColor}
                      onChange={(e) => setExchangeNewColor(e.target.value)}
                      placeholder="Enter color name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  ) : (
                    <select
                      value={exchangeNewColor}
                      onChange={(e) => {
                        setExchangeNewColor(e.target.value);
                        setExchangeNewSize('');
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="">Select a color</option>
                      {getProductColors(exchangeNewProductId).map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  )}
                  {getProductColors(exchangeNewProductId).length === 0 && !useManualColor && (
                    <p className="text-xs text-gray-500 mt-1">No colors available - click "Type manually" to enter color</p>
                  )}
                </div>
              )}

              {/* Replacement Size */}
              {exchangeNewColor && exchangeNewProductId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-700">Replacement Size</label>
                    <button
                      type="button"
                      onClick={() => setUseManualSize(!useManualSize)}
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      {useManualSize ? 'Use dropdown' : 'Type manually'}
                    </button>
                  </div>
                  {useManualSize ? (
                    <input
                      type="text"
                      value={exchangeNewSize}
                      onChange={(e) => setExchangeNewSize(e.target.value)}
                      placeholder="Enter size (e.g., S, M, L, XL)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  ) : (
                    <select
                      value={exchangeNewSize}
                      onChange={(e) => setExchangeNewSize(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="">Select a size</option>
                      {getProductSizes(exchangeNewProductId, exchangeNewColor).map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  )}
                  {getProductSizes(exchangeNewProductId, exchangeNewColor).length === 0 && !useManualSize && (
                    <p className="text-xs text-gray-500 mt-1">No sizes available - click "Type manually" to enter size</p>
                  )}
                </div>
              )}

              {/* Exchange Summary */}
              {exchangeNewProductId && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Exchange Summary</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Original: {getProductCode(selectedItem.productId)} - {selectedItem.color || '—'} / {selectedItem.size || '—'}</p>
                    <p>New: {getProductCode(exchangeNewProductId)} - {exchangeNewColor || '—'} / {exchangeNewSize || '—'}</p>
                    <p>Quantity: {exchangeQuantity}</p>
                  </div>
                </div>
              )}

              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-600">{modalError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleExchangeSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 py-2 text-sm text-white rounded-lg font-medium ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Exchange'}
                </button>
                <button
                  onClick={handleCloseExchangeModal}
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
