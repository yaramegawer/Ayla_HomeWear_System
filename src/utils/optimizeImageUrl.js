/**
 * Adds Cloudinary transforms for smaller, modern-format thumbnails.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function optimizeImageUrl(url, { width = 400, height = 300 } = {}) {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    const transform = `w_${width},h_${height},c_fill,f_auto,q_auto`;
    if (url.includes('/upload/v')) {
      return url.replace(/\/upload\/v(\d+)\//, `/upload/${transform}/v$1/`);
    }
    return url.replace('/upload/', `/upload/${transform}/`);
  }

  return url;
}
