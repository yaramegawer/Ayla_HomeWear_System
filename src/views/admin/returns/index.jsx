import React, { useState, useMemo, useEffect } from 'react';
import { useOrder } from '../../../contexts/OrderContext';
import { useProduct } from '../../../contexts/ProductContext';
import { returnOrder, exchangeOrderProducts } from '../../../services/orderService';
import { searchProducts } from '../../../services/productService';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import { filterProducts } from '../../../utils/productSearch';
import {
  MdSearch, MdRefresh, MdSwapHoriz, MdClose, MdAdd, MdRemove, MdStore, MdCheckCircle
} from 'react-icons/md';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-EG') : '—';

// ── small status badge ────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:   'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped:   'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    returned:  'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const ReturnsManagement = () => {
  const { orders, loading, fetchOrders } = useOrder();
  const { products, allProducts, loadAllProducts } = useProduct();

  React.useEffect(() => {
    loadAllProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tab, setTab]         = useState('returns'); // 'returns' | 'exchanges'
  const [search, setSearch]   = useState('');

  const [returnPage, setReturnPage] = useState(1);
  const [exchangePage, setExchangePage] = useState(1);
  const PAGE_SIZE = 10;

  React.useEffect(() => {
    setReturnPage(1);
    setExchangePage(1);
  }, [search]);

  // ── Return modal ────────────────────────────────────────────────────────────
  const [showReturn, setShowReturn]     = useState(false);
  const [returnOrder_, setReturnOrder_] = useState(null);
  const [returnOrderInput, setReturnOrderInput] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError]   = useState('');

  // ── Exchange modal ──────────────────────────────────────────────────────────
  const [showExchange, setShowExchange]     = useState(false);
  const [exchangeOrder, setExchangeOrder]   = useState(null);
  const [exchangeOrderInput, setExchangeOrderInput] = useState('');
  const [exchangeReason, setExchangeReason] = useState('');
  const [exchangeMap, setExchangeMap]       = useState({}); // { [originalItemId]: { productId, color, size } }
  const [selectingReplacementFor, setSelectingReplacementFor] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeError, setExchangeError]   = useState('');
  const [productSearch, setProductSearch]   = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch);
  const [exchangeSearchResults, setExchangeSearchResults] = useState([]);
  const [exchangeSearchLoading, setExchangeSearchLoading] = useState(false);

  // Global product search for exchange picker (all pages, not just current)
  useEffect(() => {
    const query = debouncedProductSearch.trim();
    if (!query) {
      setExchangeSearchResults([]);
      return;
    }

    if (allProducts.length > 0) {
      setExchangeSearchResults(filterProducts(allProducts, { query }).slice(0, 50));
      return;
    }

    let cancelled = false;
    (async () => {
      setExchangeSearchLoading(true);
      try {
        const response = await searchProducts(query, 1, '', '', true);
        if (!cancelled) {
          setExchangeSearchResults(response.products || []);
        }
      } catch {
        if (!cancelled) setExchangeSearchResults([]);
      } finally {
        if (!cancelled) setExchangeSearchLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedProductSearch, allProducts]);

  const filteredProducts = useMemo(() => {
    if (!debouncedProductSearch.trim()) return [];
    return exchangeSearchResults;
  }, [debouncedProductSearch, exchangeSearchResults]);
  const [selectedColors, setSelectedColors] = useState({}); // { [originalItemId]: color }
  const [selectedSizes, setSelectedSizes]   = useState({}); // { [originalItemId]: size }

  // ── Derived lists from real order data ─────────────────────────────────────
  const returnedOrders = useMemo(() =>
    (orders || []).filter(o => o.isReturned || o.status === 'returned' || o.returnReason)
  , [orders]);

  const exchangedOrders = useMemo(() =>
    (orders || []).filter(o => o.isExchanged || (Array.isArray(o.exchangedProducts) && o.exchangedProducts.length > 0))
  , [orders]);

  // Orders eligible for return/exchange (delivered + in-store only, and not already returned/exchanged)
  const eligibleOrders = useMemo(() =>
    (orders || []).filter(o => 
      o.status === 'delivered' && 
      o.source === 'store' &&
      !o.returnReason &&
      !(Array.isArray(o.exchangedProducts) && o.exchangedProducts.length > 0) &&
      !o.isExchanged
    )
  , [orders]);

  // Search filter for the table
  const filteredReturns = useMemo(() => {
    const q = search.toLowerCase();
    return returnedOrders.filter(o =>
      (o.customerName || '').toLowerCase().includes(q) ||
      (o._id || '').toLowerCase().includes(q) ||
      (o.phone || '').includes(q)
    );
  }, [returnedOrders, search]);

  const filteredExchanges = useMemo(() => {
    const q = search.toLowerCase();
    return exchangedOrders.filter(o =>
      (o.customerName || '').toLowerCase().includes(q) ||
      (o._id || '').toLowerCase().includes(q)
    );
  }, [exchangedOrders, search]);

  const paginatedReturns = filteredReturns.slice((returnPage - 1) * PAGE_SIZE, returnPage * PAGE_SIZE);
  const returnTotalPages = Math.ceil(filteredReturns.length / PAGE_SIZE) || 1;

  const paginatedExchanges = filteredExchanges.slice((exchangePage - 1) * PAGE_SIZE, exchangePage * PAGE_SIZE);
  const exchangeTotalPages = Math.ceil(filteredExchanges.length / PAGE_SIZE) || 1;

  // Filtered products for exchange picker — handled above via debouncedProductSearch

  // ── Open modals ─────────────────────────────────────────────────────────────
  const openReturn = (order) => {
    setReturnOrder_(order);
    setReturnReason('');
    setReturnError('');
    setShowReturn(true);
  };

  const openExchange = (order) => {
    setExchangeOrder(order);
    setExchangeReason('');
    setExchangeMap({});
    setSelectedColors({});
    setSelectedSizes({});
    setSelectingReplacementFor(null);
    setExchangeError('');
    setProductSearch('');
    setShowExchange(true);
  };

  // ── Submit return ────────────────────────────────────────────────────────────
  const handleReturnSubmit = async () => {
    setReturnLoading(true);
    setReturnError('');
    try {
      await returnOrder(returnOrder_._id, returnReason.trim() || 'No reason provided');
      setShowReturn(false);
      fetchOrders();
    } catch (e) {
      setReturnError(e.message || 'Failed to process return.');
    } finally {
      setReturnLoading(false);
    }
  };

  const findProduct = (productId) => {
    if (!productId) return null;
    const id = productId.toString();
    const pools = [exchangeSearchResults, allProducts, products];
    for (const pool of pools) {
      if (!Array.isArray(pool)) continue;
      const found = pool.find((p) => p._id?.toString() === id || p.id?.toString() === id);
      if (found) return found;
    }
    return null;
  };

  const getProductCode = (productId) => {
    const product = findProduct(productId);
    return product ? product.code : 'No Code';
  };

  // Get available colors for a product
  const getProductColors = (productId) => {
    const product = findProduct(productId);
    if (!product) return [];
    if (Array.isArray(product.colorStock) && product.colorStock.length > 0) {
      return product.colorStock.map((cs) => cs.color).filter(Boolean);
    }
    if (!product.variants) return [];
    return [...new Set(product.variants.map((v) => v.color))];
  };

  // Get available sizes for a product and color
  const getProductSizes = (productId, color) => {
    const product = findProduct(productId);
    if (!product) return [];
    if (Array.isArray(product.size) && product.size.length > 0) {
      return product.size;
    }
    if (!product.variants || !color) return [];
    return [...new Set(product.variants.filter((v) => v.color === color).map((v) => v.size))];
  };

  // ── Submit exchange ──────────────────────────────────────────────────────────
  const handleExchangeSubmit = async () => {

    // We only send the ones that have a replacement selected with color and size
    const payloadItems = Object.entries(exchangeMap).map(([originalLineItemId, replacement]) => {
      const originalItem = (exchangeOrder.products || []).find(p => p._id === originalLineItemId);
      return {
        originalLineItemId,
        newProductId: replacement.productId,
        newColor: replacement.color,
        newSize: replacement.size,
        quantity: originalItem ? originalItem.quantity : 1
      };
    });

    if (payloadItems.length === 0) { setExchangeError('Add at least one replacement product to exchange.'); return; }

    // Validate that all replacements have color and size
    const incompleteReplacements = payloadItems.filter(item => !item.newColor || !item.newSize);
    if (incompleteReplacements.length > 0) {
      setExchangeError('Please select both color and size for all replacement products.');
      return;
    }

    setExchangeLoading(true);
    setExchangeError('');
    try {
      await exchangeOrderProducts(exchangeOrder._id, payloadItems, exchangeReason.trim());
      setShowExchange(false);
      fetchOrders();
    } catch (e) {
      setExchangeError(e.message || 'Failed to process exchange.');
    } finally {
      setExchangeLoading(false);
    }
  };

  const getExchangeTotals = () => {
    let originalTotal = 0;
    let newTotal = 0;
    Object.entries(exchangeMap).forEach(([origId, replacement]) => {
      const orig = (exchangeOrder?.products || []).find(p => p._id === origId);
      const rep = findProduct(replacement.productId);
      if (orig && rep) {
        originalTotal += (orig.finalPrice || orig.price || 0) * orig.quantity;
        newTotal += (rep.price || 0) * orig.quantity;
      }
    });
    return { originalTotal, newTotal, diffAmount: newTotal - originalTotal };
  };
  const { originalTotal, newTotal, diffAmount } = getExchangeTotals();

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Returns & Exchanges</h1>
          <p className="text-xs text-gray-500 mt-0.5">Process returns and exchanges on delivered orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowReturn(true); setReturnOrder_(null); setReturnOrderInput(''); setReturnError(''); setReturnReason(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-medium"
          >
            <MdRefresh className="h-4 w-4" /> Process Return
          </button>
          <button
            onClick={() => { setShowExchange(true); setExchangeOrder(null); setExchangeOrderInput(''); setExchangeError(''); setExchangeMap({}); setSelectedColors({}); setSelectedSizes({}); setExchangeReason(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium"
          >
            <MdSwapHoriz className="h-4 w-4" /> Create Exchange
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Returned Orders',  value: returnedOrders.length,  color: 'text-purple-700', bg: 'bg-purple-100' },
          { label: 'Exchanged Orders', value: exchangedOrders.length, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Eligible (Delivered)', value: eligibleOrders.length, color: 'text-purple-800', bg: 'bg-purple-200' },
          { label: 'Total Orders', value: (orders || []).length, color: 'text-purple-900', bg: 'bg-purple-50/50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {[['returns', 'Returns'], ['exchanges', 'Exchanges']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MdSearch className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search by customer name, order ID, phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* ── Returns Table ──────────────────────────────────────────────── */}
      {tab === 'returns' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center py-10 text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Order ID', 'Customer', 'Phone', 'Return Reason', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedReturns.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                      {returnedOrders.length === 0 ? 'No returned orders yet.' : 'No results match your search.'}
                    </td></tr>
                  ) : paginatedReturns.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">#{order._id?.slice(-6)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{order.customerName}</td>
                      <td className="px-4 py-3 text-gray-500">{order.phone}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{order.returnReason || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Returns Pagination */}
              {filteredReturns.length > PAGE_SIZE && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Showing {(returnPage - 1) * PAGE_SIZE + 1} to {Math.min(returnPage * PAGE_SIZE, filteredReturns.length)} of {filteredReturns.length} entries</span>
                  <div className="flex gap-1">
                    <button onClick={() => setReturnPage(p => Math.max(1, p - 1))} disabled={returnPage === 1} className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                    <button onClick={() => setReturnPage(p => Math.min(returnTotalPages, p + 1))} disabled={returnPage === returnTotalPages} className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Exchanges Table ────────────────────────────────────────────── */}
      {tab === 'exchanges' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center py-10 text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Order ID', 'Customer', 'Phone', 'Exchange Reason', 'Exchange Details', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedExchanges.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                      {exchangedOrders.length === 0 ? 'No exchanges processed yet.' : 'No results match your search.'}
                    </td></tr>
                  ) : paginatedExchanges.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">#{order._id?.slice(-6)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{order.customerName}</td>
                      <td className="px-4 py-3 text-gray-500">{order.phone}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={order.exchangeReason}>
                        {order.exchangeReason || '—'}
                      </td>
                      <td className="px-4 py-3 min-w-[260px]">
                        <div className="space-y-1.5 shadow-sm max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                          {(order.exchangedProducts || []).map((exc, i) => {
                            const origProd = findProduct(exc.originalProductId);
                            const newProd = findProduct(exc.newProductId);
                            const adj = exc.priceAdjustment || 0;
                            return (
                              <div key={i} className={`text-[11px] border p-1.5 rounded-md flex flex-col gap-1 ${adj > 0 ? 'bg-orange-50/50 border-orange-100' : adj < 0 ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-500 line-through truncate w-24" title={origProd?.name}>{origProd?.name || 'Item'}</span>
                                  <span className="text-gray-400 shrink-0">→</span>
                                  <span className="font-semibold text-gray-800 truncate w-24 text-right" title={newProd?.name}>{newProd?.name || 'Item'}</span>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-gray-500 font-medium">{exc.quantity}x</span>
                                  <span className={`font-semibold ${adj > 0 ? "text-orange-600" : adj < 0 ? "text-green-600" : "text-gray-400"}`}>
                                    {adj > 0 ? '+' : ''}{formatCurrency(adj)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Exchanges Pagination */}
              {filteredExchanges.length > PAGE_SIZE && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Showing {(exchangePage - 1) * PAGE_SIZE + 1} to {Math.min(exchangePage * PAGE_SIZE, filteredExchanges.length)} of {filteredExchanges.length} entries</span>
                  <div className="flex gap-1">
                    <button onClick={() => setExchangePage(p => Math.max(1, p - 1))} disabled={exchangePage === 1} className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                    <button onClick={() => setExchangePage(p => Math.min(exchangeTotalPages, p + 1))} disabled={exchangePage === exchangeTotalPages} className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RETURN MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold">Process Return</h2>
                <p className="text-purple-200 text-xs mt-0.5">Select a delivered order to mark as returned</p>
              </div>
              <button onClick={() => setShowReturn(false)} className="text-purple-300 hover:text-white text-2xl font-light">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Order input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Order ID *</label>
                <input
                  type="text"
                  value={returnOrderInput}
                  onChange={e => {
                    const val = e.target.value;
                    setReturnOrderInput(val);
                    const cleanVal = val.trim().toLowerCase();
                    const found = eligibleOrders.find(o => o._id.toLowerCase() === cleanVal || o._id.toLowerCase().endsWith(cleanVal));
                    setReturnOrder_(cleanVal.length >= 5 && found ? found : null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Enter full Order ID or last 5+ characters..."
                />
                {!returnOrder_ && returnOrderInput.trim().length > 0 && (
                  <p className="text-xs text-red-500 mt-1">No eligible delivered order found for this ID.</p>
                )}
              </div>

              {/* Order summary */}
              {returnOrder_ && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm">
                  <p className="font-medium text-gray-900">{returnOrder_.customerName}</p>
                  <p className="text-gray-500 text-xs">{returnOrder_.phone} · {returnOrder_.address}</p>
                  <p className="text-gray-700 mt-1 text-xs">
                    {returnOrder_.products?.length || 0} item(s) · {formatCurrency(returnOrder_.itemsPrice)}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Return Reason</label>
                <textarea
                  rows={3}
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="e.g. Wrong size, defective product (optional)…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              {returnError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{returnError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleReturnSubmit}
                  disabled={returnLoading || !returnOrder_}
                  className={`flex-1 py-2.5 text-sm text-white rounded-xl font-semibold transition-all ${returnLoading || !returnOrder_ ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  {returnLoading ? 'Processing…' : 'Confirm Return'}
                </button>
                <button
                  onClick={() => setShowReturn(false)}
                  disabled={returnLoading}
                  className="flex-1 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          EXCHANGE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showExchange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div>
                <h2 className="text-white font-bold">Create Exchange</h2>
                <p className="text-purple-200 text-xs mt-0.5">Swap products on a delivered order</p>
              </div>
              <button onClick={() => setShowExchange(false)} className="text-purple-200 hover:text-white text-2xl font-light">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Order input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Order ID *</label>
                <input
                  type="text"
                  value={exchangeOrderInput}
                  onChange={e => {
                    const val = e.target.value;
                    setExchangeOrderInput(val);
                    const cleanVal = val.trim().toLowerCase();
                    const found = eligibleOrders.find(o => o._id.toLowerCase() === cleanVal || o._id.toLowerCase().endsWith(cleanVal));
                    if (!found || exchangeOrder?._id !== found._id) {
                      setExchangeOrder(cleanVal.length >= 5 && found ? found : null);
                      setExchangeMap({});
                      setSelectingReplacementFor(null);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Enter full Order ID or last 5+ characters..."
                />
                {!exchangeOrder && exchangeOrderInput.trim().length > 0 && (
                  <p className="text-xs text-red-500 mt-1">No eligible delivered order found for this ID.</p>
                )}
              </div>

              {/* Original products selection */}
              {exchangeOrder && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Original Order Items</p>
                  <div className="space-y-3">
                    {(exchangeOrder.products || []).map((item, i) => {
                      const replacement = exchangeMap[item._id];
                      const replacedProduct = replacement ? findProduct(replacement.productId) : null;
                      const isSelecting = selectingReplacementFor === item._id;

                      return (
                        <div key={i} className={`border rounded-xl p-3 ${replacement ? 'border-purple-300 bg-purple-50' : 'border-gray-200'}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 pr-2">
                                <span className="font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded text-xs mr-1">{getProductCode(item.productId)}</span>
                                {item.color} / {item.size} × {item.quantity}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{formatCurrency(item.finalPrice * item.quantity)}</p>
                            </div>

                            {!replacement && !isSelecting && (
                              <button type="button" onClick={() => setSelectingReplacementFor(item._id)} className="text-xs bg-white border border-gray-300 px-2 py-1.5 flex items-center gap-1 rounded shadow-sm hover:bg-gray-50 font-medium">
                                <MdSwapHoriz className="h-4 w-4 text-purple-600" /> Replace Item
                              </button>
                            )}

                            {replacement && (
                              <button type="button" onClick={() => {
                                const newMap = {...exchangeMap};
                                delete newMap[item._id];
                                setExchangeMap(newMap);
                                const newColors = {...selectedColors};
                                delete newColors[item._id];
                                setSelectedColors(newColors);
                                const newSizes = {...selectedSizes};
                                delete newSizes[item._id];
                                setSelectedSizes(newSizes);
                              }} className="text-xs text-red-500 hover:underline mt-1">
                                Clear Replacement
                              </button>
                            )}
                          </div>

                          {replacement && replacedProduct && (
                            <div className="mt-3 pt-3 border-t border-purple-200/60 text-sm text-purple-800 flex items-start gap-2">
                              <MdCheckCircle className="h-4 w-4 mt-0.5" />
                              <div className="leading-tight">
                                <span className="text-xs text-purple-600 uppercase font-bold tracking-wider block mb-0.5">Replaced With</span>
                                <span className="font-bold">{replacedProduct.code}</span> - {replacedProduct.name}
                                <span className="text-xs text-gray-600 ml-2">({replacement.color} / {replacement.size})</span>
                              </div>
                            </div>
                          )}

                          {isSelecting && (
                            <div className="mt-3 bg-white border border-purple-100 shadow-sm rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs font-semibold text-gray-700">Select replacement product:</p>
                                <button type="button" onClick={() => setSelectingReplacementFor(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 rounded-full p-0.5"><MdClose className="h-4 w-4"/></button>
                              </div>
                              <div className="relative mb-2">
                                <MdSearch className="absolute left-2.5 top-2 text-gray-400 h-4 w-4" />
                                <input
                                  type="text"
                                  placeholder="Search products by code/name…"
                                  value={productSearch}
                                  onChange={e => setProductSearch(e.target.value)}
                                  className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:border-purple-400 focus:outline-none"
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {exchangeSearchLoading && (
                                  <p className="text-xs text-gray-400 text-center py-4">Searching all products…</p>
                                )}
                                {!exchangeSearchLoading && filteredProducts.map(p => (
                                  <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => {
                                      setExchangeMap(prev => ({...prev, [item._id]: { productId: p._id, color: '', size: '' }}));
                                      setSelectedColors(prev => ({...prev, [item._id]: ''}));
                                      setSelectedSizes(prev => ({...prev, [item._id]: ''}));
                                      setProductSearch('');
                                    }}
                                    className="w-full text-left p-2 hover:bg-purple-50 rounded border border-transparent hover:border-purple-200 flex justify-between items-center text-xs transition-colors"
                                  >
                                    <span className="truncate pr-2">
                                      <strong className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded">{p.code}</strong> {p.name}
                                    </span>
                                    <span className="text-gray-500 font-medium shrink-0">{formatCurrency(p.price)}</span>
                                  </button>
                                ))}
                                {!exchangeSearchLoading && filteredProducts.length === 0 && debouncedProductSearch.trim() && (
                                  <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded">No products found for "{productSearch}".</p>
                                )}
                                {!debouncedProductSearch.trim() && (
                                  <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded">Type a product name or code to search the full catalog.</p>
                                )}
                              </div>

                              {/* Color and Size Selection */}
                              {replacement && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Color *</label>
                                    <select
                                      value={selectedColors[item._id] || ''}
                                      onChange={(e) => {
                                        setSelectedColors(prev => ({...prev, [item._id]: e.target.value}));
                                        setSelectedSizes(prev => ({...prev, [item._id]: ''}));
                                        setExchangeMap(prev => ({...prev, [item._id]: { ...prev[item._id], color: e.target.value, size: '' }}));
                                      }}
                                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    >
                                      <option value="">Select a color</option>
                                      {getProductColors(replacement.productId).map((color) => (
                                        <option key={color} value={color}>{color}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {selectedColors[item._id] && (
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Select Size *</label>
                                      <select
                                        value={selectedSizes[item._id] || ''}
                                        onChange={(e) => {
                                          setSelectedSizes(prev => ({...prev, [item._id]: e.target.value}));
                                          setExchangeMap(prev => ({...prev, [item._id]: { ...prev[item._id], size: e.target.value }}));
                                        }}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                                      >
                                        <option value="">Select a size</option>
                                        {getProductSizes(replacement.productId, selectedColors[item._id]).map((size) => (
                                          <option key={size} value={size}>{size}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {selectedColors[item._id] && selectedSizes[item._id] && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectingReplacementFor(null)}
                                      className="w-full mt-2 px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
                                    >
                                      Confirm Selection
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Exchange Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Exchange Reason</label>
                <textarea
                  rows={2}
                  value={exchangeReason}
                  onChange={e => setExchangeReason(e.target.value)}
                  placeholder="e.g. Customer wants different size…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              {/* Financial Difference */}
              {Object.keys(exchangeMap).length > 0 && (
                <div className={`p-4 rounded-xl border ${diffAmount === 0 ? 'bg-gray-50 border-gray-200' : diffAmount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold">Exchange Difference</p>
                    <div className="text-xs flex gap-2 font-medium">
                      <span className="text-gray-500">New Items: {formatCurrency(newTotal)}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-500">Original Items: {formatCurrency(originalTotal)}</span>
                    </div>
                  </div>
                  
                  {diffAmount === 0 ? (
                    <p className="text-sm text-gray-600">Even exchange. No amount due or to be refunded.</p>
                  ) : diffAmount > 0 ? (
                    <p className="text-sm text-orange-700">Customer must pay an additional <strong className="text-lg">{formatCurrency(diffAmount)}</strong></p>
                  ) : (
                    <p className="text-sm text-green-700">Refund customer <strong className="text-lg">{formatCurrency(Math.abs(diffAmount))}</strong></p>
                  )}
                </div>
              )}

              {exchangeError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{exchangeError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleExchangeSubmit}
                  disabled={exchangeLoading || !exchangeOrder}
                  className={`flex-1 py-2.5 text-sm text-white rounded-xl font-semibold transition-all ${exchangeLoading || !exchangeOrder ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  {exchangeLoading ? 'Processing…' : 'Confirm Exchange'}
                </button>
                <button
                  onClick={() => setShowExchange(false)}
                  disabled={exchangeLoading}
                  className="flex-1 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
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

export default ReturnsManagement;
