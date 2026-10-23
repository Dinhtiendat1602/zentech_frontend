import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../../context/useCart.js';
import { ROUTES } from '../../../constants/routes.js';
import { CAMERA_BRANDS, formatPrice, getProductImage } from '../../../data/products.js';
import { getValidToken, logout } from '../../../utils/auth.js';
import { showToast } from '../../../context/ToastContext.jsx';
import styles from './ProductList.module.css';

function ProductList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [type, setType] = useState(() => searchParams.get('type') || 'Tất cả');
  const [brand, setBrand] = useState(() => searchParams.get('brand') || 'Tất cả hãng');
  const [sort, setSort] = useState('featured');
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiNotice, setApiNotice] = useState(false);
  const [wishlist, setWishlist] = useState(() => new Set());
  const [wishlistBusy, setWishlistBusy] = useState('');
  const [wishlistMessage, setWishlistMessage] = useState('');

  // Sync state when URL params change (e.g. from Home search or Brand links)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery !== null) setQuery(urlQuery);
    const urlBrand = searchParams.get('brand');
    if (urlBrand !== null) setBrand(urlBrand);
    const urlType = searchParams.get('type');
    if (urlType !== null) setType(urlType);
  }, [searchParams]);

  // Fetch products from backend API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api').replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/products`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (Array.isArray(json.data) && json.data.length > 0) setProductsData(json.data);
      } catch {
        setApiNotice(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const token = getValidToken();
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (response.status === 401) {
        logout({ expired: true, redirect: false });
        return;
      }
      if (!response.ok) return;
      const result = await response.json();
      setWishlist(new Set((result.data?.wishlist || []).map((item) => item.id)));
    }).catch(() => {});
  }, []);

  const toggleWishlist = async (product) => {
    const token = getValidToken();
    if (!token) {
      logout({ expired: true, redirect: true, navigate });
      return;
    }
    setWishlistBusy(product.id);
    setWishlistMessage('');
    const isSaved = wishlist.has(product.id);
    try {
      const wishlistUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/users/me/wishlist`;
      const response = await fetch(isSaved ? `${wishlistUrl}/${encodeURIComponent(product.id)}` : wishlistUrl, {
        method: isSaved ? 'DELETE' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isSaved ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(!isSaved ? { body: JSON.stringify({ slug: product.id }) } : {}),
      });
      if (response.status === 401) {
        logout({ expired: true, redirect: true, navigate });
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Không thể cập nhật danh sách yêu thích.');
      setWishlist((current) => {
        const updated = new Set(current);
        if (isSaved) updated.delete(product.id);
        else updated.add(product.id);
        return updated;
      });
      setWishlistMessage(isSaved ? 'Đã xóa khỏi danh sách yêu thích.' : 'Đã thêm vào danh sách yêu thích.');
      showToast({
        type: isSaved ? 'wishlist-remove' : 'wishlist-add',
        title: isSaved ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích',
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          image: getProductImage(product.image, 240),
        },
      });
    } catch (requestError) {
      setWishlistMessage(requestError.message);
      showToast({
        type: 'error',
        title: 'Lỗi',
        message: requestError.message,
      });
    } finally {
      setWishlistBusy('');
    }
  };

  const PRODUCTS_PER_ROW = 4;
  const ROWS_TO_LOAD = 4;
  const STEP = PRODUCTS_PER_ROW * ROWS_TO_LOAD; // 16 sản phẩm (4 hàng)

  const [visibleCount, setVisibleCount] = useState(STEP);

  const products = useMemo(() => {
    const source = productsData;
    const keyword = query.trim().toLowerCase();
    const filtered = source.filter((product) => (type === 'Tất cả' || product.type === type)
      && (brand === 'Tất cả hãng' || product.brand === brand)
      && (!keyword || `${product.name} ${product.brand} ${product.sku} ${product.description || ''}`.toLowerCase().includes(keyword)));
    if (sort === 'price-asc') return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [productsData, type, brand, query, sort]);

  // Reset về 4 hàng khi người dùng thay đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setVisibleCount(STEP);
  }, [query, type, brand, sort]);

  const displayedProducts = useMemo(() => {
    return products.slice(0, visibleCount);
  }, [products, visibleCount]);

  if (loading) return <div className={styles.page}>Đang tải sản phẩm...</div>;
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}><Link to="/">Trang chủ</Link> / Sản phẩm</div>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>NOVA TECH / CAMERA STORE</span>
          <h1>Máy ảnh &amp; ống kính</h1>
        </div>
        <p>Thiết bị nhiếp ảnh chính hãng từ 6 thương hiệu hàng đầu.</p>
      </header>
      <div className={styles.tools}>
        <div className={styles.filters}>
          <button className={`${styles.filter} ${type === 'Tất cả' ? styles.filterActive : ''}`} type="button" onClick={() => setType('Tất cả')}>Tất cả ({productsData.length})</button>
          <button className={`${styles.filter} ${type === 'Máy ảnh' ? styles.filterActive : ''}`} type="button" onClick={() => setType('Máy ảnh')}>Máy ảnh</button>
          <button className={`${styles.filter} ${type === 'Ống kính' ? styles.filterActive : ''}`} type="button" onClick={() => setType('Ống kính')}>Ống kính</button>
          <select className={styles.select} aria-label="Lọc theo hãng" value={brand} onChange={(e) => {
            const newBrand = e.target.value;
            setBrand(newBrand);
            const nextParams = new URLSearchParams(searchParams);
            if (newBrand && newBrand !== 'Tất cả hãng') nextParams.set('brand', newBrand);
            else nextParams.delete('brand');
            setSearchParams(nextParams, { replace: true });
          }}>
            <option>Tất cả hãng</option>
            {CAMERA_BRANDS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className={styles.controls}>
          <input className={styles.search} value={query} onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            const nextParams = new URLSearchParams(searchParams);
            if (val.trim()) nextParams.set('q', val);
            else nextParams.delete('q');
            setSearchParams(nextParams, { replace: true });
          }} placeholder="Tìm máy ảnh, ống kính, hãng..." aria-label="Tìm sản phẩm" />
          <label className={styles.sort}>Sắp xếp 
            <select aria-label="Sắp xếp sản phẩm" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Nổi bật</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
            </select>
          </label>
        </div>
      </div>
      <p className={styles.resultCount}>Hiển thị {Math.min(displayedProducts.length, products.length)} / {products.length} sản phẩm</p>
      {apiNotice && <p className={styles.apiNotice} role="status">Đang hiển thị danh mục sản phẩm mẫu trong lúc kết nối dữ liệu cửa hàng.</p>}
      {wishlistMessage && <p className={styles.apiNotice} role="status">{wishlistMessage}</p>}
      <div className={styles.grid}>
        {displayedProducts.map((product) => (
          <article className={styles.card} key={product.id}>
            {product.badge && <span className={styles.badge}>{product.badge}</span>}
            <button className={`${styles.favorite} ${wishlist.has(product.id) ? styles.favoriteSaved : ''}`} type="button" disabled={wishlistBusy === product.id} onClick={() => toggleWishlist(product)} aria-label={`${wishlist.has(product.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'} ${product.name}`} title={wishlist.has(product.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}><i className={`${wishlist.has(product.id) ? 'fa-solid' : 'fa-regular'} fa-heart`} /></button>
            <Link className={styles.image} to={`${ROUTES.products}/${product.id}`}>
              <img src={getProductImage(product.image)} alt={`${product.brand} ${product.name}`} loading="lazy" />
            </Link>
            <div className={styles.info}>
              <span className={styles.kind}>{product.brand.toUpperCase()} / {product.type.toUpperCase()}</span>
              <h2><Link to={`${ROUTES.products}/${product.id}`}>{product.name}</Link></h2>
              {product.description && (
                <p className={styles.desc}>
                  {product.description.replace(/<[^>]*>/g, '').trim()}
                </p>
              )}
              <div className={styles.rating}>★★★★★ <small>{product.rating} · {product.reviews} đánh giá</small></div>
              <div className={styles.bottom}>
                <div>
                  <strong>{formatPrice(product.price)}</strong>
                  {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
                </div>
                <button className={styles.add} type="button" onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: getProductImage(product.image, 240) }, 1)} aria-label={`Thêm ${product.name} vào giỏ`}>
                  <i className="fa-solid fa-plus" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {visibleCount < products.length && (
        <div className={styles.loadMoreWrapper}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            onClick={() => setVisibleCount((prev) => prev + STEP)}
          >
            <span>Hiển thị thêm</span>
            <i className="fa-solid fa-chevron-down" />
          </button>
        </div>
      )}
      {!products.length && <p className={styles.empty}>Không tìm thấy sản phẩm phù hợp.</p>}
    </div>
  );
}

export default ProductList;
