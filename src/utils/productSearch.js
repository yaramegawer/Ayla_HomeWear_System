/** Match product by name, code, or category (case-insensitive). */
export function matchProduct(product, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  if (!product || typeof product !== 'object') return false;
  return (
    (product.name || '').toLowerCase().includes(q) ||
    (product.code || '').toLowerCase().includes(q) ||
    (product.category || '').toLowerCase().includes(q)
  );
}

export function filterProducts(products, { query = '', category = '', season = '' } = {}) {
  if (!Array.isArray(products)) return [];
  return products.filter((product) => {
    if (!product || typeof product !== 'object') return false;
    if (category && product.category !== category) return false;
    if (season && product.season !== season) return false;
    return matchProduct(product, query);
  });
}

export function paginateList(items, page, perPage) {
  const totalProducts = items.length;
  const totalPages = Math.ceil(totalProducts / perPage) || 1;
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    pagination: {
      totalProducts,
      totalPages,
      currentPage: safePage,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}
