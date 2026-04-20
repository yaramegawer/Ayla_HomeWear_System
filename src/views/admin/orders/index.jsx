import React, { useState, useMemo, useEffect } from 'react';
import { useOrder } from '../../../contexts/OrderContext';
import { useProduct } from '../../../contexts/ProductContext';
import {
  MdSearch,
  MdVisibility,
  MdCheckCircle,
  MdDelete,
  MdRefresh,
  MdEdit,
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
  const { products } = useProduct();

  // Look up a product's code by its _id
  const getProductCode = (productId) => {
    if (!productId || !Array.isArray(products)) return '—';
    const id = productId?.toString?.();
    const found = products.find(p => p._id?.toString() === id);
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

  useEffect(() => {
    fetchOrders();
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
                <p className="text-xs text-gray-400 font-mono">#{selectedOrder._id}</p>
              </div>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Customer & Order Info */}
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Products */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Products</p>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Code', 'Color', 'Size', 'Qty', 'Price', 'Line Total'].map(h => (
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
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono font-medium text-purple-700">{getProductCode(item.productId)}</td>
                            <td className="px-3 py-2">{item.color || '—'}</td>
                            <td className="px-3 py-2">{item.size || '—'}</td>
                            <td className="px-3 py-2">{item.quantity}</td>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
