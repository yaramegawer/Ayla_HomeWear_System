import React, { useState, useMemo, useEffect } from 'react';
import { useProduct } from '../../../contexts/ProductContext';
import { useOrder } from '../../../contexts/OrderContext';
import { createOrder, updateOrderDetails, confirmDeposit } from '../../../services/orderService';
import { MdAdd, MdRemove, MdDelete, MdSearch, MdShoppingCart, MdStore, MdCheckCircle, MdPrint } from 'react-icons/md';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);

// Placeholder store customer — backend requires these fields
const STORE_CUSTOMER = {
  customerName: 'Store Customer',
  phone: '00000000000',
  email: 'store@store.com',
  address: 'In-Store',
  government: 'Cairo',
};

const CreateOrder = () => {
  const { products, fetchProducts, pagination } = useProduct();
  const { fetchOrders } = useOrder();

  const [orderItems, setOrderItems] = useState([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [payMethod, setPayMethod] = useState('vodafone_cash'); // duePaymentMethod only
  const [lastOrder, setLastOrder] = useState(null);
  const [cashTendered, setCashTendered] = useState('');

  useEffect(() => {
    fetchProducts(1, '', '', 'all');
    // eslint-disable-next-line
  }, []);

  // Filter products locally for search across all products!
  const displayProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    // Only return objects
    const validProducts = products.filter(p => p && typeof p === 'object');
    
    if (!search || !search.trim()) {
      return validProducts;
    }
    
    const query = search.trim().toLowerCase();
    return validProducts.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pCode = (p.code || '').toLowerCase();
      const pCategory = (p.category || '').toLowerCase();
      
      return pName.includes(query) || pCode.includes(query) || pCategory.includes(query);
    });
  }, [products, search]);

  // Client-side pagination for the product catalog
  const catalogPerPage = 10;
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogTotalPages = Math.ceil(displayProducts.length / catalogPerPage) || 1;
  const paginatedCatalog = displayProducts.slice(
    (catalogPage - 1) * catalogPerPage,
    catalogPage * catalogPerPage
  );

  // Reset catalog page when search changes
  useEffect(() => {
    setCatalogPage(1);
  }, [search]);

  // Totals
  const itemsPrice = orderItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const totalPrice = itemsPrice; // no shipping
  const changeAmount = cashTendered && Number(cashTendered) >= totalPrice ? Number(cashTendered) - totalPrice : 0;


  // ── Item management ──────────────────────────────────────────────────────────

  const addItem = (product) => {
    // default first size/color from product arrays if available
    const defaultSize = Array.isArray(product.size) && product.size.length ? product.size[0] : '';
    const defaultColor = Array.isArray(product.color) && product.color.length ? product.color[0] : '';

    const discount = product.discount || 0;
    const originalPrice = discount > 0 ? product.price / (1 - discount / 100) : product.price;

    setOrderItems(prev => [...prev, {
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
      availColors: Array.isArray(product.color) ? product.color : [],
    }]);
  };

  const updateItem = (index, field, value) => {
    setOrderItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const removeItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      setErrorMsg('Add at least one product.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      ...STORE_CUSTOMER,
      source: 'store',
      shippingCost: 0,
      depositPaymentMethod: 'vodafone_cash', // schema only allows vodafone_cash
      duePaymentMethod: payMethod,
      products: orderItems.map(it => ({
        productId: it.productId,
        quantity: it.quantity,
        color: it.color || undefined,
        size: it.size || undefined,
      })),
    };

    try {
      const res = await createOrder(payload);
      // In-store orders are immediately fulfilled — auto-mark as delivered
      const newId = res?.data?._id || res?.order?._id || res?._id;
      if (newId) {
        // In-store = immediately delivered + deposit received
        // Run sequentially so confirmDeposit doesn't overwrite status to 'confirmed'
        await confirmDeposit(newId);
        await updateOrderDetails(newId, { status: 'delivered' });
      }
      setLastOrder({
        id: newId || 'N/A',
        items: [...orderItems],
        totalPrice,
        cashTendered: cashTendered ? Number(cashTendered) : null,
        change: changeAmount,
        date: new Date().toLocaleString()
      });
      setOrderItems([]);
      setCashTendered('');
      setSuccessMsg('Order created, delivered & deposit confirmed!');
      fetchOrders();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-xl">
          <MdStore className="text-purple-600 h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">In-Store Order</h1>
          <p className="text-xs text-gray-500">Source: Store · Shipping: Free · Customer: Walk-in</p>
        </div>
      </div>

      {/* Feedback */}
      {successMsg && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <div className="flex items-center gap-2">
            <MdCheckCircle className="h-4 w-4 flex-shrink-0" />
            {successMsg}
          </div>
          <div className="flex items-center gap-3">
            {lastOrder && (
              <button onClick={() => window.print()} className="flex items-center gap-1 text-purple-700 font-bold hover:text-purple-900 bg-white px-3 py-1 rounded shadow-sm border border-purple-200 print:hidden transition-colors">
                <MdPrint className="h-4 w-4" /> Print Receipt
              </button>
            )}
            <button onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700 text-xs font-semibold">Dismiss</button>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex justify-between">
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 text-xs ml-4">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Product Catalog ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Search */}
          <div className="relative">
            <MdSearch className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name, code, category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paginatedCatalog.map(product => (
              <div
                key={product._id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    {product.defaultImage?.url ? (
                      <img src={product.defaultImage.url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">IMG</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.code} · {product.category}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5">
                        {(product.discount || 0) > 0 ? (
                          <>
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency((product.price || 0) / (1 - product.discount / 100))}
                            </span>
                            <span className="text-sm font-bold text-purple-700">{formatCurrency(product.price)}</span>
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1 py-0.5 rounded">-{product.discount}%</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-purple-700">{formatCurrency(product.price)}</span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(product.stock || 0) > 10 ? 'bg-green-100 text-green-700' :
                        (product.stock || 0) > 0 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                        {product.stock || 0} left
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => addItem(product)}
                  disabled={(product.stock || 0) === 0}
                  className={`mt-3 w-full flex items-center justify-center gap-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${(product.stock || 0) === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                >
                  <MdAdd className="h-4 w-4" />
                  {(product.stock || 0) === 0 ? 'Out of Stock' : 'Add to Order'}
                </button>
              </div>
            ))}

            {displayProducts.length === 0 && (
              <div className="col-span-2 text-center py-10 text-gray-400 text-sm">
                No products match your search.
              </div>
            )}
          </div>

          {/* Catalog Pagination */}
          {catalogTotalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">
                Page {catalogPage} of {catalogTotalPages} ({displayProducts.length} products)
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCatalogPage(p => Math.max(p - 1, 1))}
                  disabled={catalogPage <= 1}
                  className={`px-3 py-1 text-xs border rounded-lg font-medium ${catalogPage <= 1 ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  Prev
                </button>
                <button
                  onClick={() => setCatalogPage(p => Math.min(p + 1, catalogTotalPages))}
                  disabled={catalogPage >= catalogTotalPages}
                  className={`px-3 py-1 text-xs border rounded-lg font-medium ${catalogPage >= catalogTotalPages ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── Right: Cart & Summary ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Cart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MdShoppingCart className="text-purple-600" />
              Order Items
              {orderItems.length > 0 && (
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                  {orderItems.length}
                </span>
              )}
            </h2>

            {orderItems.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">No products added yet.</p>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div key={index} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.code}</p>
                      </div>
                      <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 ml-2">
                        <MdDelete className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Size */}
                    {item.availSizes.length > 0 && (
                      <div className="mb-2">
                        <label className="text-xs text-gray-500 block mb-1">Size</label>
                        <div className="flex flex-wrap gap-1">
                          {item.availSizes.map(s => (
                            <button
                              key={s}
                              onClick={() => updateItem(index, 'size', s)}
                              className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${item.size === s
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400'
                                }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Color */}
                    {item.availColors.length > 0 && (
                      <div className="mb-2">
                        <label className="text-xs text-gray-500 block mb-1">Color</label>
                        <div className="flex flex-wrap gap-1">
                          {item.availColors.map(c => (
                            <button
                              key={c}
                              onClick={() => updateItem(index, 'color', c)}
                              className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${item.color === c
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400'
                                }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity + line price */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => item.quantity > 1 ? updateItem(index, 'quantity', item.quantity - 1) : removeItem(index)}
                          className="px-2 py-1 hover:bg-gray-100"
                        ><MdRemove className="h-3 w-3" /></button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                          className="px-2 py-1 hover:bg-gray-100"
                        ><MdAdd className="h-3 w-3" /></button>
                      </div>
                      <div className="text-right">
                        {item.discount > 0 && (
                          <span className="text-xs text-gray-400 line-through block">
                            {formatCurrency(item.originalPrice * item.quantity)}
                          </span>
                        )}
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Due Payment method */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Due Payment Method</h3>
            <p className="text-xs text-gray-400 mb-2">How the customer will pay the remaining balance.</p>
            <div className="space-y-2">
              {[
                { value: 'vodafone_cash', label: 'Vodafone Cash' },
                { value: 'cash_on_delivery', label: 'Cash on Delivery' },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${payMethod === opt.value ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-gray-300'
                  }`}>
                  <input
                    type="radio"
                    name="paymethod"
                    value={opt.value}
                    checked={payMethod === opt.value}
                    onChange={() => setPayMethod(opt.value)}
                    className="text-purple-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Order Summary</h3>
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Items Price</span>
                <span>{formatCurrency(itemsPrice)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              
              <div className="pt-2 mt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cash Tendered (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">EGP</span>
                  <input 
                    type="number" 
                    min="0"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {cashTendered && Number(cashTendered) >= totalPrice && (
                <div className="flex justify-between text-gray-800 font-semibold bg-gray-50 p-2 rounded-lg mt-2">
                  <span>Change:</span>
                  <span className="text-green-600">{formatCurrency(changeAmount)}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || orderItems.length === 0}
              className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all ${submitting || orderItems.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 shadow-sm'
                }`}
            >
              <MdShoppingCart className="h-4 w-4" />
              {submitting ? 'Creating Order…' : 'Create Order'}
            </button>
          </div>

        </div>
      </div>

      {/* Printable Receipt */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-section, #receipt-section * {
              visibility: visible;
            }
            #receipt-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              color: #000;
              background: #fff;
            }
          }
        `}
      </style>
      {lastOrder && (
        <div id="receipt-section" className="hidden print:block w-full text-black bg-white font-mono text-sm max-w-[400px] mx-auto">
          <h2 className="text-center font-bold text-xl mb-4">Ayla HomeWear</h2>
          <p><strong>Date:</strong> {lastOrder.date}</p>
          <p><strong>Order ID:</strong> {lastOrder.id}</p>
          <hr className="my-2 border-black border-dashed" />
          <table className="w-full text-left table-auto">
            <thead>
              <tr>
                <th className="pb-2">Item</th>
                <th className="pb-2">Qty</th>
                <th className="text-right pb-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {lastOrder.items.map((it, i) => (
                <tr key={i}>
                  <td className="py-1">{it.name} {it.size ? `(${it.size})` : ''}</td>
                  <td className="py-1">{it.quantity}</td>
                  <td className="text-right py-1">{formatCurrency(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="my-2 border-black border-dashed" />
          <div className="flex justify-between font-bold text-lg mt-4">
            <span>Total:</span>
            <span>{formatCurrency(lastOrder.totalPrice)}</span>
          </div>
          {lastOrder.cashTendered !== null && lastOrder.cashTendered > 0 && (
            <>
              <div className="flex justify-between text-sm mt-1">
                <span>Cash:</span>
                <span>{formatCurrency(lastOrder.cashTendered)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Change:</span>
                <span>{formatCurrency(lastOrder.change)}</span>
              </div>
            </>
          )}

          <hr className="my-2 border-black border-dashed mt-4" />
          <div className="mt-4 text-[10px] leading-tight">
            <p className="font-bold mb-1 text-xs">Returns & Exchange Policy:</p>
            <ul className="list-disc pl-3 mb-2 space-y-1">
              <li>Exchanges are allowed within 14 days of purchase.</li>
              <li>Returns are allowed within 14 days of purchase.</li>
              <li>Items must be in their original condition and packaging with original tags attached.</li>
              <li>Original receipt must be presented.</li>
            </ul>
          </div>
          <p className="text-center mt-6 text-xs italic">Thank you for your purchase!</p>
        </div>
      )}
    </div>
  );
};

export default CreateOrder;
