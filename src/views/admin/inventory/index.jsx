import React, { useState, useMemo, useEffect } from 'react';
import { useProduct } from '../../../contexts/ProductContext';
import {
  MdSearch,
  MdWarning,
  MdTrendingUp,
  MdTrendingDown,
  MdAdd,
  MdRemove,
  MdUpdate
} from 'react-icons/md';
import Chart from 'react-apexcharts';

const InventoryManagement = () => {
  const { products, editProduct, fetchProducts } = useProduct();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdateValue, setStockUpdateValue] = useState(0);
  const [updateType, setUpdateType] = useState('add');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Handle page change removed to fix warning

  useEffect(() => {
    fetchProducts(1, '', '', 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStock]);

  // Categories
  const categories = ['pajamas', 'lingerie', 'nightwear', 'robes'];

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products.filter(product => {
      if (!product || typeof product !== 'object') return false;

      const productName = (product.name || '').toLowerCase();
      const productCategory = (product.category || '').toLowerCase();
      const productStock = product.stock || 0;

      const matchesSearch =
        productName.includes(searchTerm.toLowerCase()) ||
        productCategory.includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;

      let matchesStock = true;
      if (filterStock === 'low') {
        matchesStock = productStock <= 10;
      } else if (filterStock === 'out') {
        matchesStock = productStock === 0;
      } else if (filterStock === 'normal') {
        matchesStock = productStock > 10;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, filterCategory, filterStock]);

  // Calculate stats from loaded products
  const stockStats = useMemo(() => {
    if (!products || !Array.isArray(products)) return { totalProducts: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
    
    const validProducts = products.filter(p => p && typeof p === 'object');
    const totalProducts = validProducts.length;
    const lowStock = validProducts.filter(p => (p.stock || 0) <= 10 && (p.stock || 0) > 0).length;
    const outOfStock = validProducts.filter(p => (p.stock || 0) === 0).length;
    const totalValue = validProducts.reduce((sum, p) => sum + ((p.buyPrice || 0) * (p.stock || 0)), 0);

    return { totalProducts, lowStock, outOfStock, totalValue };
  }, [products]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Category distribution chart using local products data
  const categoryDistributionData = useMemo(() => {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return { series: [], options: { chart: { type: 'donut', height: 350 }, labels: [], title: { text: 'Stock by Category' } } };
    }

    const breakdown = {};
    products.forEach(p => {
      if (p && p.stock > 0) {
        const cat = p.category || 'uncategorized';
        breakdown[cat] = (breakdown[cat] || 0) + p.stock;
      }
    });

    return {
      series: Object.values(breakdown),
      options: {
        chart: {
          type: 'donut',
          height: 350
        },
        labels: Object.keys(breakdown).map(k => k.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())),
        colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        title: {
          text: 'Stock by Category',
          style: { fontSize: '16px', fontWeight: 'bold' }
        }
      }
    };
  }, [products]);

  // Handle stock update — now works with colorStock array
  const handleStockUpdate = async () => {
    if (!selectedProduct || stockUpdateValue === '') return;

    // Build updated colorStock array
    const existingCS = Array.isArray(selectedProduct.colorStock) && selectedProduct.colorStock.length > 0
      ? selectedProduct.colorStock
      : (Array.isArray(selectedProduct.color) ? selectedProduct.color.map(c => ({ color: c, stock: 0 })) : []);

    let updatedCS;
    const delta = parseInt(stockUpdateValue || 0);

    if (updateType === 'add') {
      // Distribute the added stock evenly across colors, remainder to first
      const perColor = Math.floor(delta / (existingCS.length || 1));
      const remainder = delta % (existingCS.length || 1);
      updatedCS = existingCS.map((cs, i) => ({
        color: cs.color,
        stock: (cs.stock || 0) + perColor + (i === 0 ? remainder : 0)
      }));
    } else if (updateType === 'remove') {
      // Remove proportionally, but don't go below 0
      const currentTotal = existingCS.reduce((s, cs) => s + (cs.stock || 0), 0);
      const removeTotal = Math.min(delta, currentTotal);
      updatedCS = existingCS.map(cs => {
        const proportion = currentTotal > 0 ? (cs.stock || 0) / currentTotal : 0;
        return { color: cs.color, stock: Math.max(0, Math.round((cs.stock || 0) - removeTotal * proportion)) };
      });
    } else {
      // Set: distribute the new total evenly
      const perColor = Math.floor(delta / (existingCS.length || 1));
      const remainder = delta % (existingCS.length || 1);
      updatedCS = existingCS.map((cs, i) => ({
        color: cs.color,
        stock: perColor + (i === 0 ? remainder : 0)
      }));
    }

    try {
      const updatedData = {
        name: selectedProduct.name,
        price: selectedProduct.price,
        buyPrice: selectedProduct.buyPrice,
        description: selectedProduct.description,
        colorStock: updatedCS,
        category: selectedProduct.category,
        season: selectedProduct.season,
        size: selectedProduct.size,
        discount: selectedProduct.discount
      };

      await editProduct(selectedProduct._id, updatedData);

      setShowStockUpdate(false);
      setSelectedProduct(null);
      setStockUpdateValue(0);
    } catch (err) {
      console.error('Error updating stock', err);
      alert(err.message || 'Error updating stock');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { color: 'bg-red-100 text-red-800', text: 'Out of Stock' };
    if (stock <= 10) return { color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' };
    return { color: 'bg-green-100 text-green-800', text: 'In Stock' };
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventory Management</h1>
        <p className="text-gray-600">Monitor and manage your product inventory levels</p>
      </div>

      {/* Stock Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stockStats.totalProducts}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <MdTrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-600">{stockStats.lowStock}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <MdWarning className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <MdTrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stockStats.totalValue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <MdTrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="mb-8 flex justify-center">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-2xl">
          <Chart options={categoryDistributionData.options} series={categoryDistributionData.series} type="donut" height={350} />
        </div>
      </div>

      {/* Low Stock Alerts */}
      {stockStats.lowStock > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <MdWarning className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-yellow-800">Low Stock Alert</h3>
          </div>
          <p className="text-yellow-700 mt-2">
            You have {stockStats.lowStock} products with low stock levels. Consider restocking soon.
          </p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {(products && Array.isArray(products) ? products : [])
              .filter(p => p && p.stock <= 10 && p.stock > 0)
              .slice(0, 6)
              .map(product => (
                <div key={product._id} className="bg-white rounded p-2 flex justify-between items-center">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-sm text-yellow-600 font-bold">{product.stock} left</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
          >
            <option value="all">All Stock Levels</option>
            <option value="normal">In Stock (&gt;10)</option>
            <option value="low">Low Stock (≤10)</option>
            <option value="out">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map(product => {
                const stockStatus = getStockStatus(product.stock || 0);
                const totalValue = (product.buyPrice || 0) * (product.stock || 0);

                return (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center mr-3 overflow-hidden">
                          {product.defaultImage && product.defaultImage.url ? (
                            <img src={product.defaultImage.url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-500">IMG</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.season}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(product.discount || 0) > 0 ? (
                        <div>
                          <span className="text-xs text-gray-400 line-through block">
                            {formatCurrency((product.price || 0) / (1 - product.discount / 100))}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(product.price || 0)}</span>
                          <span className="ml-1 text-[10px] font-semibold text-red-600 bg-red-50 px-1 py-0.5 rounded">-{product.discount}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">{formatCurrency(product.price || 0)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.stock}</div>
                      {/* Per-color breakdown */}
                      {Array.isArray(product.colorStock) && product.colorStock.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {product.colorStock.map((cs, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs">
                              <span className="text-gray-400 capitalize">{cs.color}:</span>
                              <span className={cs.stock > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>{cs.stock}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.buyPrice || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of <span className="font-medium">{filteredProducts.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stock Update Modal */}
      {showStockUpdate && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Update Stock</h3>
            <p className="text-gray-600 mb-4">
              Product: <span className="font-medium">{selectedProduct.name}</span>
            </p>
            <p className="text-gray-600 mb-4">
              Current Stock: <span className="font-medium">{selectedProduct.stock}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Update Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="add"
                      checked={updateType === 'add'}
                      onChange={(e) => setUpdateType(e.target.value)}
                      className="mr-2"
                    />
                    <MdAdd className="mr-1" /> Add Stock
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="remove"
                      checked={updateType === 'remove'}
                      onChange={(e) => setUpdateType(e.target.value)}
                      className="mr-2"
                    />
                    <MdRemove className="mr-1" /> Remove Stock
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="set"
                      checked={updateType === 'set'}
                      onChange={(e) => setUpdateType(e.target.value)}
                      className="mr-2"
                    />
                    <MdUpdate className="mr-1" /> Set Stock
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {updateType === 'set' ? 'New Stock Quantity' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockUpdateValue}
                  onChange={(e) => setStockUpdateValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">
                  {updateType === 'add' && `New stock will be: ${(selectedProduct.stock || 0) + parseInt(stockUpdateValue || 0)}`}
                  {updateType === 'remove' && `New stock will be: ${Math.max(0, (selectedProduct.stock || 0) - parseInt(stockUpdateValue || 0))}`}
                  {updateType === 'set' && `Stock will be set to: ${parseInt(stockUpdateValue || 0)}`}
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleStockUpdate}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Update Stock
                </button>
                <button
                  onClick={() => {
                    setShowStockUpdate(false);
                    setSelectedProduct(null);
                    setStockUpdateValue(0);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
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

export default InventoryManagement;
