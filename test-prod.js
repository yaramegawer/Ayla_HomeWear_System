// using native fetch

async function check() {
  const res1 = await fetch('https://el-mawardy-store.vercel.app/product?search=pajama');
  const d1 = await res1.json();
  console.log("search=pajama items:", d1.products ? d1.products.length : "none");
  console.log("pagination:", d1.pagination);
  
  const res2 = await fetch('https://el-mawardy-store.vercel.app/product/search?code=PROD');
  const d2 = await res2.json();
  console.log("search?code=PROD items:", d2.products ? d2.products.length : (d2.product ? 1 : "none"));
}
check();
