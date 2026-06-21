const BASE_URL = 'https://el-mawardy-store.vercel.app/product';

const PARALLEL_BATCH_SIZE = 6;

// Get all products with pagination and filtering
export const getAllProducts = async (page = 1, category = '', season = '', limit = '', admin = false) => {
  try {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (category) params.append('category', category);
    if (season) params.append('season', season);
    if (limit) params.append('limit', limit);
    if (admin) params.append('admin', 'true');

    const response = await fetch(`${BASE_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch products`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

/** Fetch every product page in parallel batches (~5s vs ~25s sequential). */
export const fetchAllProductsParallel = async (category = '', season = '', admin = false) => {
  const first = await getAllProducts(1, category, season, '', admin);
  const allProducts = [...(first.products || [])];
  const totalPages = first.pagination?.totalPages || 1;

  if (totalPages <= 1) {
    return { products: allProducts, pagination: first.pagination };
  }

  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  for (let i = 0; i < remainingPages.length; i += PARALLEL_BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + PARALLEL_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((page) => getAllProducts(page, category, season, '', admin))
    );
    results.forEach((response) => {
      if (response?.products?.length) {
        allProducts.push(...response.products);
      }
    });
  }

  return {
    products: allProducts,
    pagination: {
      ...(first.pagination || {}),
      totalProducts: allProducts.length,
    },
  };
};

// Get product by ID
export const getProductById = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Product not found`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

// Search product by code
export const searchProductByCode = async (code) => {
  try {
    const response = await fetch(`${BASE_URL}/search?code=${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Don't throw error for "Product not found" - return empty result instead
      if (errorData.message && errorData.message.includes('Product not found')) {
        return { product: null };
      }
      throw new Error(errorData.message || `HTTP ${response.status}: Product search failed`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

// General search products across all products
export const searchProducts = async (query, page = 1, category = '', season = '', admin = false) => {
  try {
    if (query && query.trim()) {
      // Check if query is a product code (alphanumeric with possible numbers) or general search
      if (/^[a-zA-Z0-9\-_]+$/.test(query.trim())) {
        // Use existing searchProductByCode for code search
        const response = await searchProductByCode(query.trim());
        // Format response to match expected structure
        return {
          products: response.product ? [response.product] : [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          }
        };
      } else {
        // Use getAllProducts with search parameter for general search
        const params = new URLSearchParams();
        params.append('search', query.trim());
        if (page) params.append('page', page);
        if (category) params.append('category', category);
        if (season) params.append('season', season);
        if (admin) params.append('admin', 'true');

        const response = await fetch(`${BASE_URL}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Don't throw error for no results, return empty array instead
          if (errorData.message && errorData.message.includes('Product not found')) {
            return {
              products: [],
              pagination: {
                currentPage: page,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: page > 1
              }
            };
          }
          throw new Error(errorData.message || `HTTP ${response.status}: Failed to search products`);
        }
        
        return await response.json();
      }
    } else {
      // No query, return all products
      return await getAllProducts(page, category, season, '', admin);
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

// Create new product (with file upload)
export const createProduct = async (formData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Backend error response:', data);
      throw new Error(data.message || `Failed to create product: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Update product
export const updateProduct = async (id, productData) => {
  try {
    const token = localStorage.getItem('token');
    
    // Check if productData is FormData (contains images) or regular JSON
    const isFormData = productData instanceof FormData;
    
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Only set Content-Type for JSON, let browser set it for FormData
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? productData : JSON.stringify(productData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update product');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Update product images only
export const updateProductImages = async (id, formData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${BASE_URL}/${id}/images`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update product images');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Delete product
export const deleteProduct = async (id) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete product');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};
