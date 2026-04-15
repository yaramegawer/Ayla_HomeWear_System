import React, { useMemo, useState } from 'react';
import { useProduct } from '../../../contexts/ProductContext';
import { MdLocalOffer, MdPercent, MdAttachMoney, MdSearch } from 'react-icons/md';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);

const DiscountsManagement = () => {
  const { products, loading } = useProduct();
  const [search, setSearch] = useState('');

  // Only products with a discount > 0
  const discountedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(p => (p.discount || 0) > 0);
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return discountedProducts.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [discountedProducts, search]);

  // Stats
  const totalSavings = discountedProducts.reduce((sum, p) => {
    const originalPrice = p.price / (1 - p.discount / 100);
    return sum + (originalPrice - p.price);
  }, 0);
  const avgDiscount = discountedProducts.length
    ? discountedProducts.reduce((s, p) => s + p.discount, 0) / discountedProducts.length
    : 0;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Discounts</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          All products currently on discount. To change a discount, edit the product.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-2 bg-purple-100 rounded-xl">
            <MdLocalOffer className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Products on Sale</p>
            <p className="text-2xl font-bold text-purple-700">{discountedProducts.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-2 bg-orange-100 rounded-xl">
            <MdPercent className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Average Discount</p>
            <p className="text-2xl font-bold text-orange-600">{avgDiscount.toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-2 bg-green-100 rounded-xl">
            <MdAttachMoney className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Customer Savings</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSavings)}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MdSearch className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search by name, code, category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-sm text-gray-400">Loading products…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Product', 'Code', 'Category', 'Original Price', 'Discount', 'Sale Price', 'Saving/unit'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-sm text-gray-400">
                      {discountedProducts.length === 0
                        ? 'No products currently have a discount. Edit a product to add one.'
                        : 'No products match your search.'}
                    </td>
                  </tr>
                ) : filtered.map(product => {
                  const originalPrice = product.price / (1 - product.discount / 100);
                  const saving = originalPrice - product.price;
                  return (
                    <tr key={product._id} className="hover:bg-gray-50">
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {product.defaultImage?.url
                              ? <img src={product.defaultImage.url} alt={product.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">IMG</div>
                            }
                          </div>
                          <span className="text-sm font-medium text-gray-900">{product.name}</span>
                        </div>
                      </td>
                      {/* Code */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{product.code}</td>
                      {/* Category */}
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">{product.category}</td>
                      {/* Original */}
                      <td className="px-4 py-3 text-sm text-gray-500 line-through">{formatCurrency(originalPrice)}</td>
                      {/* Discount badge */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                          -{product.discount}%
                        </span>
                      </td>
                      {/* Sale price */}
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(product.price)}</td>
                      {/* Saving */}
                      <td className="px-4 py-3 text-sm font-medium text-green-600">{formatCurrency(saving)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 mt-3 text-center">
        To add or change a product's discount, go to <strong>Products</strong> → Edit product.
      </p>
    </div>
  );
};

export default DiscountsManagement;
