
export const CAMERA_BRANDS = ['Canon', 'Sony', 'Nikon', 'Fujifilm', 'Panasonic', 'Sigma'];

export const BRAND_IMAGES = {
  Canon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Canon_logo.svg/500px-Canon_logo.svg.png',
  Sony: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGeA3ENX4f_aa7tg77XSRVKwmDOgr9LNA8hyQZ2trr5Q&s=10',
  Nikon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRydxLJ9ix9OVdMIz_kASUu0OsNrsbJ0mxXU4SaGrpIHA&s=10',
  Fujifilm: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Fujifilm_logo.svg/500px-Fujifilm_logo.svg.png',
  Panasonic: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Panasonic_logo.svg/500px-Panasonic_logo.svg.png',
  Sigma: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/SIGMA_LOGO_CMYK_RZ2016.jpg/500px-SIGMA_LOGO_CMYK_RZ2016.jpg',
};
export const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';
export const getProductImage = (image, width = 700) => {
  if (!image) return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:') || image.startsWith('blob:')) return image;
  if (image.startsWith('/uploads/') || image.startsWith('uploads/')) {
    const cleanPath = image.startsWith('/') ? image : `/${image}`;
    const backendOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');
    return `${backendOrigin}${cleanPath}`;
  }
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=85`;
};