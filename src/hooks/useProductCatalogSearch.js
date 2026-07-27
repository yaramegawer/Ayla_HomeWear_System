import { useEffect, useMemo } from 'react';



import { filterProducts, paginateList } from '../utils/productSearch';







/**



 * Global catalog search without loading every page up front:



 * - No query → one paginated API request (fast first paint)



 * - Query + full catalog cached → instant local filter across all products



 * - Query + catalog not ready yet → server search API (all pages on backend)



 */



export function useProductCatalogSearch({



  allProducts,



  products,



  pagination,



  loading,



  fetchProducts,



  searchAllProducts,



  query,



  page,



  category = '',



  season = '',



  admin = true,



  localPageSize = 12,



}) {



  const trimmedQuery = query.trim();



  const isSearching = trimmedQuery.length > 0;



  const canSearchLocally = isSearching && allProducts.length > 0;







  useEffect(() => {



    if (canSearchLocally) return;



    if (isSearching) {



      searchAllProducts(trimmedQuery, page, category, season, admin);



    } else {



      fetchProducts(page, category, season, admin);



    }



  }, [



    trimmedQuery,



    page,



    category,



    season,



    admin,



    canSearchLocally,



    isSearching,



    fetchProducts,



    searchAllProducts,



  ]);







  return useMemo(() => {



    if (canSearchLocally) {



      // Guard: deduplicate allProducts by _id before filtering
      const seen = new Set();
      const uniqueAll = allProducts.filter((p) => {
        if (!p?._id || seen.has(p._id)) return false;
        seen.add(p._id);
        return true;
      });

      const filtered = filterProducts(uniqueAll, {



        query: trimmedQuery,



        category: category || undefined,



        season: season || undefined,



      });



      // When searching, show all matching results without pagination

      const { items, pagination: localPagination } = paginateList(filtered, page, isSearching ? filtered.length : localPageSize);



      return {



        items,



        pagination: localPagination,



        loading: false,



        searchingGlobally: true,



      };



    }







    // When not searching locally, use paginated API data



    // Keep showing current products while loading to prevent flicker



    return {



      items: products,



      pagination,



      loading: loading && products.length === 0, // Only show loading if no products exist yet



      searchingGlobally: isSearching,



    };



  }, [



    canSearchLocally,



    allProducts,



    products,



    pagination,



    loading,



    trimmedQuery,



    category,



    season,



    page,



    localPageSize,



    isSearching,



  ]);



}



