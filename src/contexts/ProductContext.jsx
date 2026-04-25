import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAllProducts,
  getProductById,
  searchProductByCode,
  searchProducts,
  createProduct,
  updateProduct,
  updateProductImages,
  deleteProduct
} from '../services/productService';

const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    totalProducts: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Fetch all products
  const fetchProducts = async (page = 1, category = '', season = '', limit = '') => {
    setLoading(true);
    setError(null);
    
    try {
      if (limit === 'all' || limit === 1000 || limit === '1000') {
        let allProds = [];
        let currentPage = 1;
        let totalPages = 1;
        let firstPag = null;
        
        do {
          console.log(`Fetching page ${currentPage} of ${totalPages}`);
          const response = await getAllProducts(currentPage, category, season, '');
          
          if (!response || !response.products || !Array.isArray(response.products)) {
            console.error('Invalid products response:', response);
            break;
          }
          
          allProds = [...allProds, ...response.products];
          totalPages = (response.pagination && response.pagination.totalPages) ? response.pagination.totalPages : 1;
          if (currentPage === 1) firstPag = response.pagination;
          
          currentPage++;
          
          // Safety break to prevent infinite loops (max 50 pages)
          if (currentPage > 50) break;
          
        } while (currentPage <= totalPages);
        
        console.log(`Total products fetched: ${allProds.length}`);
        
        setProducts(allProds);
        setPagination({
          ...(firstPag || {}),
          totalProducts: allProds.length,
          totalPages: Math.ceil(allProds.length / 10) || 1,
          currentPage: 1,
          hasNextPage: allProds.length > 10,
          hasPrevPage: false
        });
      } else {
        const response = await getAllProducts(page, category, season, limit);
        setProducts(response?.products || []);
        setPagination(response?.pagination || { totalProducts: 0, totalPages: 1, currentPage: 1 });
      }
    } catch (err) {
      console.error('Error in fetchProducts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get single product
  const getProduct = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getProductById(id);
      return response.product;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Search product by code
  const searchProduct = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await searchProductByCode(code);
      return response.product;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Search products across all products
  const searchAllProducts = async (query, page = 1, category = '', season = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await searchProducts(query, page, category, season);
      setProducts(response.products);
      setPagination(response.pagination);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create new product
  const addProduct = async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
      await createProduct(formData);
      // Refresh products list
      await fetchProducts(pagination.currentPage);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const editProduct = async (id, productData) => {
    setLoading(true);
    setError(null);
    
    try {
      await updateProduct(id, productData);
      // Refresh products list
      await fetchProducts(pagination.currentPage);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product images only
  const updateProductImagesOnly = async (id, formData) => {
    setLoading(true);
    setError(null);
    
    try {
      await updateProductImages(id, formData);
      // Refresh products list
      await fetchProducts(pagination.currentPage);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const removeProduct = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      await deleteProduct(id);
      // Refresh products list
      await fetchProducts(pagination.currentPage);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, []);

  const value = {
    products,
    loading,
    error,
    pagination,
    fetchProducts,
    getProduct,
    searchProduct,
    searchAllProducts,
    addProduct,
    editProduct,
    updateProductImagesOnly,
    removeProduct,
    clearError
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};
