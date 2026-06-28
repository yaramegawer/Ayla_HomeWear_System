import React, { useState, useMemo, useEffect } from 'react';
import { useProduct } from '../../../contexts/ProductContext';
import ProductImage from '../../../components/ProductImage';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import { useProductCatalogSearch } from '../../../hooks/useProductCatalogSearch';
import {
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdImage
} from 'react-icons/md';

const ProductsManagement = () => {
  const {
    products,
    allProducts,
    loading,
    allProductsLoading,
    error,
    pagination,
    fetchProducts,
    loadAllProducts,
    searchAllProducts,
    addProduct,
    editProduct,
    updateProductImagesOnly,
    removeProduct,
    invalidateAllProducts,
    clearError
  } = useProduct();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeason, setFilterSeason] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'pajamas',
    season: 'summer',
    buyPrice: 0,
    price: 0,
    discount: 0,
    colorStock: [],   // [{ color: 'red', stock: 0 }, ...]
    size: [],
    description: '',
    defaultImage: null,
    subImages: [],
    visible: true
  });

  const [currentPage, setCurrentPage] = useState(1);

  const categoryParam = filterCategory === 'all' ? '' : filterCategory;
  const seasonParam = filterSeason === 'all' ? '' : filterSeason;

  useEffect(() => {
    loadAllProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    items: displayProducts,
    pagination: listPagination,
    loading: listLoading,
    searchingGlobally,
  } = useProductCatalogSearch({
    allProducts,
    products,
    pagination,
    loading,
    fetchProducts,
    searchAllProducts,
    query: debouncedSearch,
    page: currentPage,
    category: categoryParam,
    season: seasonParam,
    admin: true,
    localPageSize: 12,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterCategory, filterSeason]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Temporary string states for colors and sizes inputs
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');

  const categories = [
  'كاشات',
  'بيجامات',
  'شورتات',
  'بيج سايز',
  'فساتين',
  'قطن 100%',
  'لانجيري',
  'لانجيري مستورد',
  "ترنجات",
  "بيجامات 3 قطع"
];
  const seasons = ['summer', 'winter', 'spring', 'fall', 'all'];

  const totalPages = listPagination.totalPages || 1;
  const totalProducts = listPagination.totalProducts || 0;

  // Inventory statistics — uses full catalog when background load finishes
  const statsSource = allProducts.length > 0 ? allProducts : products;
  const inventoryStats = useMemo(() => {
    if (!statsSource || !Array.isArray(statsSource)) return {
      totalProducts: 0,
      totalStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      mostStockedProducts: [],
      categories: {}
    };

    let totalStock = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    const categoryStats = {};
    const productStockLevels = [];

    statsSource.forEach(product => {
      // Calculate total stock for this product
      let productStock = 0;
      
      if (Array.isArray(product.colorStock) && product.colorStock.length > 0) {
        // New schema: sum stock from colorStock
        productStock = product.colorStock.reduce((sum, cs) => sum + (parseInt(cs.stock) || 0), 0);
      } else {
        // Legacy schema: use single stock field
        productStock = parseInt(product.stock) || 0;
      }

      totalStock += productStock;
      productStockLevels.push({ product, stock: productStock });

      // Count low/out of stock products
      if (productStock === 0) {
        outOfStockProducts++;
      } else if (productStock <= 10) {
        lowStockProducts++;
      }

      // Category statistics
      const category = product.category || 'uncategorized';
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, stock: 0 };
      }
      categoryStats[category].count++;
      categoryStats[category].stock += productStock;
    });

    // Get most stocked products (top 5)
    const mostStockedProducts = productStockLevels
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5)
      .map(item => ({
        ...item.product,
        totalStock: item.stock
      }));

    return {
      totalProducts: allProducts.length > 0 ? statsSource.length : totalProducts,
      totalStock,
      lowStockProducts,
      outOfStockProducts,
      mostStockedProducts,
      categories: categoryStats
    };
  }, [statsSource, allProducts.length, totalProducts]);



  // Helper for image compression
  const compressImage = async (imageFile) => {
    const options = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      return await imageCompression(imageFile, options);
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageFile;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Debug: Check form field values
    console.log('Form field values:', {
      code: formData.code,
      name: formData.name,
      category: formData.category,
      season: formData.season,
      buyPrice: formData.buyPrice,
      price: formData.price,
      colorStock: formData.colorStock,
      size: formData.size
    });

    try {
      setIsSubmitting(true);
      // Validate required fields
      const errors = {};
      if (!formData.code.trim()) errors.code = 'Product code is required';
      if (!formData.name.trim()) errors.name = 'Product name is required';
      if (!formData.buyPrice || formData.buyPrice <= 0) errors.buyPrice = 'Buying price must be greater than 0';
      if (!formData.price || formData.price <= 0) errors.price = 'Price must be greater than 0';
      if (!formData.colorStock || formData.colorStock.length === 0) errors.colorStock = 'At least one color with stock is required';
      if (formData.colorStock && formData.colorStock.some(cs => !cs.color.trim())) errors.colorStock = 'All color entries must have a name';
      if (!formData.size || formData.size.length === 0) errors.size = 'At least one size is required';

      if (!editingProduct) {
        if (!formData.defaultImage) errors.defaultImage = 'Default image is required';
        if (!formData.subImages || formData.subImages.length === 0) errors.subImages = 'At least one additional image is required';
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setIsSubmitting(false);
        return;
      }
      setFormErrors({});
      if (editingProduct) {
        // Check if new images were selected for update
        console.log('Edit product - checking for new images:', {
          defaultImage: formData.defaultImage,
          subImages: formData.subImages,
          subImagesLength: formData.subImages ? formData.subImages.length : 0
        });
        
        // First, update text fields
        const productData = {
          name: formData.name,
          category: formData.category,
          season: formData.season,
          buyPrice: parseFloat(formData.buyPrice),
          price: parseFloat(formData.price),
          discount: parseInt(formData.discount) || 0,
          colorStock: formData.colorStock.map(cs => ({ color: cs.color, stock: parseInt(cs.stock) || 0 })),
          size: formData.size,
          description: formData.description,
          visible: formData.visible
        };

        await editProduct(editingProduct._id, productData);
        
        // Then, update images if new ones were selected
        if (formData.defaultImage || (formData.subImages && formData.subImages.length > 0)) {
          console.log('Updating product images...');
          
          // Create FormData for image upload
          const imageFormData = new FormData();
          
          // Compress and add new images
          const compressionTasks = [];
          if (formData.defaultImage) {
            compressionTasks.push(compressImage(formData.defaultImage).then(compressed => ({ type: 'default', file: compressed })));
          }
          for (let i = 0; i < formData.subImages.length; i++) {
            compressionTasks.push(compressImage(formData.subImages[i]).then(compressed => ({ type: 'sub', file: compressed })));
          }

          if (compressionTasks.length > 0) {
            console.log('Compressing new images for update...');
            const compressedResults = await Promise.all(compressionTasks);
            
            compressedResults.forEach(({ type, file }) => {
              if (type === 'default') {
                imageFormData.append('defaultImage', file);
              } else {
                imageFormData.append('subImage', file);
              }
            });
          }

          // Use the dedicated image update endpoint
          await updateProductImagesOnly(editingProduct._id, imageFormData);
          setSuccessMessage('Product text and images updated successfully!');
        } else {
          setSuccessMessage('Product updated successfully!');
        }
      } else {
        // Create new product with file upload
        const formDataToSend = new FormData();

        // Add text fields - matching backend schema exactly
        formDataToSend.append('code', formData.code);
        formDataToSend.append('name', formData.name);
        formDataToSend.append('category', formData.category);
        formDataToSend.append('season', formData.season);
        formDataToSend.append('buyPrice', parseFloat(formData.buyPrice));
        formDataToSend.append('price', parseFloat(formData.price));
        formDataToSend.append('visible', formData.visible);
        // discount is only set via the update form, not on create
        if (formData.description && formData.description.trim() !== '') {
          formDataToSend.append('description', formData.description.trim());
        }

        // Send colorStock using bracket notation so express parses it as an array of objects
        const colorStockToSend = formData.colorStock.length > 0
          ? formData.colorStock.map(cs => ({ color: cs.color, stock: parseInt(cs.stock) || 0 }))
          : [{ color: 'red', stock: 0 }];
        colorStockToSend.forEach((cs, i) => {
          formDataToSend.append(`colorStock[${i}][color]`, cs.color);
          formDataToSend.append(`colorStock[${i}][stock]`, cs.stock);
        });

        const sizesToSend = formData.size.length > 0 ? formData.size : ['M']; // Default size if empty
        sizesToSend.forEach((size) => {
          formDataToSend.append('size[]', size);
        });

        // Compress all images simultaneously!
        const compressionTasks = [];

        if (formData.defaultImage) {
          compressionTasks.push(compressImage(formData.defaultImage).then(compressed => ({ type: 'default', file: compressed })));
        }

        for (let i = 0; i < formData.subImages.length; i++) {
          compressionTasks.push(compressImage(formData.subImages[i]).then(compressed => ({ type: 'sub', file: compressed })));
        }

        console.log('Starting image compression on your computer...');
        const t0 = performance.now();
        const compressedResults = await Promise.all(compressionTasks);
        const t1 = performance.now();
        console.log(`🖥️ Local Image Compression Tool took: ${((t1 - t0) / 1000).toFixed(2)} seconds`);

        compressedResults.forEach(({ type, file }) => {
          if (type === 'default') {
            formDataToSend.append('defaultImage', file);
          } else {
            formDataToSend.append('subImage', file);
          }
        });

        console.log('Sending payload over the internet to Vercel/Cloudinary...');
        const t2 = performance.now();
        await addProduct(formDataToSend);
        const t3 = performance.now();
        console.log(`☁️ Vercel Backend (+ Cloudinary) took: ${((t3 - t2) / 1000).toFixed(2)} seconds`);

        setSuccessMessage('Product created successfully!');
      }

      resetForm();
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error saving product:', error);

      // Attempt to parse Joi validation error which looks like: '"fieldName" is not allowed...'
      const match = error.message && error.message.match(/^"([^"]+)"/);
      if (match) {
        const fieldName = match[1];
        setFormErrors({ [fieldName]: error.message.replace(/"/g, '') });
      } else {
        setFormErrors({ general: error.message || 'An error occurred' });
      }

      // Clear global error so it only shows up inside the form
      clearError();
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      category: 'pajamas',
      season: 'summer',
      buyPrice: 0,
      price: 0,
      discount: 0,
      colorStock: [],
      size: [],
      description: '',
      defaultImage: null,
      subImages: [],
      visible: true
    });
    setColorInput('');
    setSizeInput('');
    setEditingProduct(null);
    setShowForm(false);
    setFormErrors({});
  };

  // Edit product
  const handleEdit = (product) => {
    setEditingProduct(product);
    
    let existingColorStock = [];
    if (Array.isArray(product.colorStock) && product.colorStock.length > 0) {
      // Use new schema if present
      existingColorStock = product.colorStock.map(cs => ({ color: cs.color, stock: cs.stock || 0 }));
    } else {
      // Migrate old data: preserve the old stock value
      const totalStock = product.stock || 0;
      const oldColors = Array.isArray(product.color) && product.color.length > 0 ? product.color : (totalStock > 0 ? ['default'] : []);
      
      if (oldColors.length > 0) {
        const perColor = Math.floor(totalStock / oldColors.length);
        const remainder = totalStock % oldColors.length;
        existingColorStock = oldColors.map((c, i) => ({
          color: c,
          stock: perColor + (i === 0 ? remainder : 0)
        }));
      }
    }

    setFormData({
      code: product.code,
      name: product.name,
      category: product.category,
      season: product.season,
      buyPrice: product.buyPrice,
      price: product.price,
      discount: product.discount || 0,
      colorStock: existingColorStock,
      size: product.size,
      description: product.description,
      visible: product.visible ?? true
    });
    setColorInput(existingColorStock.map(cs => cs.color).join(', '));
    setSizeInput(Array.isArray(product.size) ? product.size.join(', ') : '');
    setShowForm(true);
  };

  // Quick toggle visibility
  const toggleVisibility = async (productId, newVisibility) => {
    try {
      await editProduct(productId, { visible: newVisibility });
      setSuccessMessage(`Product ${newVisibility ? 'shown' : 'hidden'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      // Error is already handled by the context
    }
  };

  // Delete product
  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await removeProduct(productId);
      } catch (error) {
        console.error('Error deleting product:', error);
        // Error is already handled by the context
      }
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  const getStockColor = (stock) => {
    if (stock > 20) return 'bg-green-100 text-green-800';
    if (stock > 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      {/* Error Message */}
      {error && !showForm && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-xs text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
          <p className="text-sm text-green-600 font-medium">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-xs text-green-600 hover:text-green-800"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Products Management</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
        >
          <MdAdd className="mr-2" /> Add Product
        </button>
      </div>

      {/* Inventory Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{inventoryStats.totalProducts}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <MdAdd className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">{inventoryStats.totalStock.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <MdSearch className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStockProducts}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <span className="text-yellow-600 font-bold">!</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{inventoryStats.outOfStockProducts}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <span className="text-red-600 font-bold">×</span>
            </div>
          </div>
        </div>
      </div>

      
      {/* Category Breakdown */}
      {Object.keys(inventoryStats.categories).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Stock by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(inventoryStats.categories).map(([category, stats]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{category}</p>
                  <p className="text-xs text-gray-500">{stats.count} products</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-600">{stats.stock} units</p>
                </div>
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
              onChange={handleSearchChange}
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
            value={filterSeason}
            onChange={(e) => setFilterSeason(e.target.value)}
          >
            <option value="all">All Seasons</option>
            {seasons.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {listLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayProducts.map(product => {
            return (
              <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {product.defaultImage && product.defaultImage.url ? (
                    <ProductImage
                      src={product.defaultImage.url}
                      alt={product.name || 'Product'}
                      className="h-full w-full object-cover"
                      width={400}
                      height={192}
                    />
                  ) : (
                    <MdImage className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name || 'Unnamed Product'}</h3>
                  <p className="text-sm text-gray-500 mb-2">{product.code || 'No Code'} · {product.category || 'No Category'} · {product.season || 'No Season'}</p>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{product.description || 'No description available'}</p>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price:</span>
                      {(product.discount || 0) > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 line-through">
                            {formatCurrency((product.price || 0) / (1 - product.discount / 100))}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(product.price || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatCurrency(product.price || 0)}</span>
                      )}
                    </div>
                    {(product.discount || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Discount:</span>
                        <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">-{product.discount}%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stock:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockColor(product.stock || 0)}`}>
                        {product.stock || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Visibility:</span>
                      <div className="flex items-center gap-2">
                        {product.visible !== false ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Visible</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">Hidden</span>
                        )}
                        <button
                          onClick={() => toggleVisibility(product._id, product.visible !== false)}
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                          title={product.visible !== false ? 'Hide product' : 'Show product'}
                        >
                          {product.visible !== false ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    {/* Per-color stock breakdown */}
                    {Array.isArray(product.colorStock) && product.colorStock.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {product.colorStock.map((cs, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 capitalize">{cs.color}</span>
                            <span className={`font-medium ${cs.stock > 0 ? 'text-green-700' : 'text-red-500'}`}>{cs.stock}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Edit"
                    >
                      <MdEdit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <MdDelete className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {displayProducts.length === 0 && !listLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found on this page matching your criteria.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-md px-6 py-4 mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
            <span className="ml-2 text-gray-400">({totalProducts} total products)</span>
            {allProductsLoading && <span className="ml-2 text-xs text-purple-500">Loading stats…</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className={`px-4 py-2 text-sm border border-gray-300 rounded-md font-medium ${currentPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className={`px-4 py-2 text-sm border border-gray-300 rounded-md font-medium ${currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {formErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Row 1: Code + Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className={`w-full px-3 py-2 border ${formErrors.code ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${editingProduct ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                    placeholder="e.g., PROD001"
                  />
                  {formErrors.code && <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>

                {/* Row 2: Category + Season */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 border ${formErrors.category ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Season *</label>
                  <select
                    required
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    className={`w-full px-3 py-2 border ${formErrors.season ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    {seasons.map(season => (
                      <option key={season} value={season}>{season}</option>
                    ))}
                  </select>
                  {formErrors.season && <p className="text-red-500 text-xs mt-1">{formErrors.season}</p>}
                </div>

                {/* Row 3: Buying Price + Selling Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buying Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border ${formErrors.buyPrice ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formErrors.buyPrice && <p className="text-red-500 text-xs mt-1">{formErrors.buyPrice}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border ${formErrors.price ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
                  {editingProduct && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount <span className="text-gray-400 font-normal">(% off selling price)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                      </div>
                      {formData.discount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Final price: {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(
                            formData.price * (1 - formData.discount / 100)
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 4: Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Image {!editingProduct && '*'}
                    {editingProduct && <span className="text-xs text-gray-400 ml-2">(Leave empty to keep current)</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                    const file = e.target.files[0];
                    console.log('Default image selected:', file);
                    setFormData({ ...formData, defaultImage: file });
                  }}
                    className={`w-full px-3 py-2 border ${formErrors.defaultImage ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formData.defaultImage && (
                    <p className="text-xs text-green-600 mt-1">
                      New image selected: {formData.defaultImage.name}
                    </p>
                  )}
                  {formErrors.defaultImage && <p className="text-red-500 text-xs mt-1">{formErrors.defaultImage}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Images {!editingProduct && '*'}
                    {editingProduct && <span className="text-xs text-gray-400 ml-2">(Leave empty to keep current)</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                    const files = e.target.files;
                    console.log('Sub images selected:', files, 'Length:', files.length);
                    setFormData({ ...formData, subImages: files });
                  }}
                    className={`w-full px-3 py-2 border ${formErrors.subImages ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formData.subImages && formData.subImages.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {formData.subImages.length} new image(s) selected
                    </p>
                  )}
                  {formErrors.subImages && <p className="text-red-500 text-xs mt-1">{formErrors.subImages}</p>}
                </div>
              </div>

              {/* Description — full width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="2"
                  placeholder="Product description..."
                />
              </div>

              {/* Visibility Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.visible}
                    onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Visible on Website</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">When checked, this product will be visible to customers on the website</p>
              </div>

              {/* Colors & Stock + Sizes — side by side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Colors & Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colors & Stock *</label>
                  <div className="text-xs text-gray-400 mb-2">Comma-separated colors, then set stock for each.</div>
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onBlur={() => {
                      const colors = colorInput.split(',').map(c => c.trim()).filter(c => c);
                      // Preserve existing stock values when possible
                      const existing = formData.colorStock || [];
                      const updated = colors.map(c => {
                        const found = existing.find(cs => cs.color.toLowerCase() === c.toLowerCase());
                        return { color: c, stock: found ? found.stock : 0 };
                      });
                      setFormData({ ...formData, colorStock: updated });
                    }}
                    className={`w-full px-3 py-2 border ${formErrors.colorStock ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="red, blue, green"
                  />
                  {formErrors.colorStock && <p className="text-red-500 text-xs mt-1">{formErrors.colorStock}</p>}

                {/* Per-color stock inputs - Styled like Sizes tags */}
                {formData.colorStock.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      {formData.colorStock.map((cs, idx) => (
                        <div key={idx} className="flex items-center text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full font-medium border border-purple-100">
                          <span className="capitalize mr-2">{cs.color}:</span>
                          <input
                            type="number"
                            min="0"
                            value={cs.stock}
                            onChange={(e) => {
                              const validStock = Math.max(0, parseInt(e.target.value) || 0);
                              const updated = [...formData.colorStock];
                              updated[idx] = { ...updated[idx], stock: validStock };
                              setFormData({ ...formData, colorStock: updated });
                            }}
                            className="w-12 bg-transparent text-purple-900 border-b border-purple-300 focus:outline-none focus:border-purple-600 text-center"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Total Stock Indicator */}
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                      Total Units: <span className="text-purple-700 font-bold">{formData.colorStock.reduce((s, cs) => s + (parseInt(cs.stock) || 0), 0)}</span>
                    </div>
                  </div>
                )}
                </div>

                {/* Sizes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma-separated) *</label>
                  <div className="text-xs text-gray-400 mb-2">e.g. S, M, L, XL</div>
                  <input
                    type="text"
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onBlur={() => {
                      const sizes = sizeInput.split(',').map(s => s.trim()).filter(s => s);
                      setFormData({ ...formData, size: sizes });
                    }}
                    className={`w-full px-3 py-2 border ${formErrors.size ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="S, M, L, XL"
                  />
                  {formErrors.size && <p className="text-red-500 text-xs mt-1">{formErrors.size}</p>}
                  {/* Show parsed sizes as tags */}
                  {formData.size.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.size.map((s, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>


              <div className="flex space-x-4 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 ${isSubmitting ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded-lg transition-colors font-medium`}
                >
                  {isSubmitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className={`flex-1 ${isSubmitting ? 'bg-gray-200 cursor-not-allowed text-gray-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} px-4 py-2 rounded-lg transition-colors font-medium`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsManagement;
