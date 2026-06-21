import { optimizeImageUrl } from '../utils/optimizeImageUrl';

const ProductImage = ({
  src,
  alt = '',
  className = '',
  width = 400,
  height = 192,
  eager = false,
}) => {
  if (!src) return null;

  return (
    <img
      src={optimizeImageUrl(src, { width, height })}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  );
};

export default ProductImage;
