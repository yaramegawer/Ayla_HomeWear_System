import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  getAllProducts,
  getProductById,
  searchProductByCode,
  searchProducts,
  createProduct,
  updateProduct,
  updateProductImages,
  deleteProduct,
  fetchAllProductsParallel,
} from '../services/productService';

const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allProductsLoading, setAllProductsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    totalProducts: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const pageFetchRef = useRef(null);
  const allFetchRef = useRef(null);

  /** Fetch a single API page — ~1.5s for 20 products (fast initial render). */
  const fetchProducts = useCallback(async (page = 1, category = '', season = '', admin = false) => {
    const key = `${page}-${category}-${season}-${admin}`;
    if (pageFetchRef.current?.key === key) {
      return pageFetchRef.current.promise;
    }

    const promise = (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAllProducts(page, category, season, '', admin);
        setProducts(response?.products || []);
        setPagination(response?.pagination || {
          totalProducts: 0,
          totalPages: 1,
          currentPage: page,
          hasNextPage: false,
          hasPrevPage: page > 1,
        });
        return response;
      } catch (err) {
        console.error('Error in fetchProducts:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
        pageFetchRef.current = null;
      }
    })();

    pageFetchRef.current = { key, promise };
    return promise;
  }, []);

  /** Fetch full catalog in parallel — for stats, inventory filters, create-order search. */
  const loadAllProducts = useCallback(async (admin = true, force = false) => {
    if (!force && allProducts.length > 0) {
      return allProducts;
    }
    if (allFetchRef.current) {
      return allFetchRef.current;
    }

    const promise = (async () => {
      setAllProductsLoading(true);
      setError(null);
      try {
        const response = await fetchAllProductsParallel('', '', admin);
        setAllProducts(response.products || []);
        return response.products || [];
      } catch (err) {
        console.error('Error loading all products:', err);
        setError(err.message);
        throw err;
      } finally {
        setAllProductsLoading(false);
        allFetchRef.current = null;
      }
    })();

    allFetchRef.current = promise;
    return promise;
  }, [allProducts.length]);

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

  const searchAllProducts = useCallback(async (query, page = 1, category = '', season = '', admin = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchProducts(query, page, category, season, admin);
      setProducts(response.products || []);
      setPagination(response.pagination || {
        totalProducts: response.products?.length || 0,
        totalPages: 1,
        currentPage: page,
        hasNextPage: false,
        hasPrevPage: page > 1,
      });
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateAllProducts = useCallback(() => {
    setAllProducts([]);
    allFetchRef.current = null;
  }, []);

  const addProduct = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createProduct(formData);
      if (response?.product) {
        setProducts((prev) => [response.product, ...prev]);
        setAllProducts((prev) => [response.product, ...prev]);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const editProduct = useCallback(async (id, productData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await updateProduct(id, productData);
      if (response?.product) {
        const merge = (prev) => prev.map((p) => (p._id === id ? { ...p, ...response.product } : p));
        setProducts(merge);
        setAllProducts(merge);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProductImagesOnly = useCallback(async (id, formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await updateProductImages(id, formData);
      if (response?.product) {
        const merge = (prev) => prev.map((p) => (p._id === id ? { ...p, ...response.product } : p));
        setProducts(merge);
        setAllProducts(merge);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeProduct = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await deleteProduct(id);
      const filter = (prev) => prev.filter((p) => p._id !== id);
      setProducts(filter);
      setAllProducts(filter);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = () => setError(null);

  const value = {
    products,
    allProducts,
    loading,
    allProductsLoading,
    error,
    pagination,
    fetchProducts,
    loadAllProducts,
    getProduct,
    searchProduct,
    searchAllProducts,
    addProduct,
    editProduct,
    updateProductImagesOnly,
    removeProduct,
    invalidateAllProducts,
    clearError,
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
