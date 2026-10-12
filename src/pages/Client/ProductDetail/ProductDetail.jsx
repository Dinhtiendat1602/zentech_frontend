import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCart } from '../../../context/useCart.js';
import { ROUTES } from '../../../constants/routes.js';
import { formatPrice, getProductImage } from '../../../data/products.js';
import Drawer from '../../../components/common/Drawer.jsx';
import styles from './ProductDetail.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

function ProductDetail() {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [isSpecDrawerOpen, setIsSpecDrawerOpen] = useState(false);
  const [specSearch, setSpecSearch] = useState('');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [addedRelId, setAddedRelId] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_URL}/products/${encodeURIComponent(productId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Không tìm thấy sản phẩm.');
        setProduct(result.data);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setProduct(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [productId]);

  // Fetch related products
  useEffect(() => {
    if (!product) return;
    const fetchRelated = async () => {
      try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) return;
        const result = await res.json();
        const allProducts = Array.isArray(result.data) ? result.data : [];

        // Loại bỏ sản phẩm đang xem
        const others = allProducts.filter((p) => p.id !== product.id && p.databaseId !== product.databaseId);

        // Sắp xếp ưu tiên:
        // 1. Cùng thương hiệu & cùng phân loại
        // 2. Cùng thương hiệu
        // 3. Cùng phân loại
        // 4. Các sản phẩm còn lại
        const sameBrandAndType = others.filter((p) => p.brand === product.brand && p.type === product.type);
        const sameBrand = others.filter((p) => p.brand === product.brand && p.type !== product.type);
        const sameType = others.filter((p) => p.brand !== product.brand && p.type === product.type);
        const remaining = others.filter((p) => p.brand !== product.brand && p.type !== product.type);

        const sorted = [...sameBrandAndType, ...sameBrand, ...sameType, ...remaining];
        setRelatedProducts(sorted.slice(0, 4));
      } catch {
        // im lặng nếu không tải được
      }
    };
    fetchRelated();
  }, [product]);

  // Fetch reviews for this product
  useEffect(() => {
    if (!product) return;
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_URL}/reviews?slug=${encodeURIComponent(product.slug || productId)}`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setReviews(result.data);
        }
      } catch (err) {
        // im lặng nếu không tải được reviews
      }
    };
    fetchReviews();
  }, [product, productId]);

  if (loading) return <div className={styles.page}>Đang tải sản phẩm...</div>;
  if (!product) return <Navigate to={ROUTES.products} replace />;

  const addToCart = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: getProductImage(product.image, 700) }, quantity);
    setAdded(true);
  };

  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
    : Number(product.rating || 5).toFixed(1);

  const productSpecs = product.specs || [];
  const filteredSpecs = specSearch.trim()
    ? productSpecs.filter((s) =>
        s.specName.toLowerCase().includes(specSearch.toLowerCase()) ||
        s.specValue.toLowerCase().includes(specSearch.toLowerCase())
      )
    : productSpecs;

  const standardInfo = [
    { label: 'Thương hiệu', value: product.brand || 'Khác' },
    { label: 'Phân loại', value: product.type || 'Thiết bị máy ảnh' },
    { label: 'Mã sản phẩm (SKU)', value: product.sku || product.id },
    { label: 'Tình trạng hàng', value: product.quantity > 0 ? `Còn hàng (${product.quantity} sản phẩm)` : 'Tạm hết hàng' },
    { label: 'Chính sách bảo hành', value: 'Bảo hành chính hãng 12 - 24 tháng toàn quốc' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}><Link to="/">Trang chủ</Link> / <Link to={ROUTES.products}>{product.brand} {product.type.toLowerCase()}</Link> / {product.name}</div>
      <div className={styles.product}>
        <div className={styles.gallery}><span className={styles.galleryTag}>{product.badge || 'CHÍNH HÃNG'}</span><img src={getProductImage(product.image)} alt={product.name} /></div>
        <section className={styles.details}><span className={styles.eyebrow}>{(product.brand || '').toUpperCase()} / {(product.type || '').toUpperCase()}</span><h1>{product.name}</h1><div className={styles.rating}>★★★★★ <small>{avgRating} · {reviews.length || product.reviews || 0} đánh giá</small></div><div className={styles.price}><strong>{formatPrice(product.price)}</strong>{product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}</div>
          {product.description ? (
            <div
              className={styles.description}
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className={styles.description}>
              {product.type === 'Máy ảnh'
                ? `${product.brand || ''} ${product.name} là lựa chọn dành cho người sáng tạo cần chất lượng hình ảnh cao, khả năng lấy nét tin cậy và hiệu năng linh hoạt cho cả ảnh lẫn video.`
                : `${product.name} mang đến dải tiêu cự và chất lượng quang học phù hợp cho hệ máy ${product.brand || ''}, từ chụp hàng ngày đến các dự án sáng tạo chuyên sâu.`}
            </p>
          )}

          {/* Banner kích hoạt Drawer Thông số kỹ thuật */}
          <div className={styles.specBanner}>
            <div className={styles.specBannerLeft}>
              <div className={styles.specIconBadge}>
                <i className="fa-solid fa-microchip" />
              </div>
              <div className={styles.specBannerText}>
                <strong>Thông số kỹ thuật</strong>
                <span>
                  {productSpecs.length > 0
                    ? `${productSpecs.length} thông số chi tiết cấu hình máy`
                    : 'Xem bảng thông số kỹ thuật chi tiết'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={styles.specOpenBtn}
              onClick={() => setIsSpecDrawerOpen(true)}
              id="view-specs-button"
            >
              Xem thông số <i className="fa-solid fa-arrow-right" />
            </button>
          </div>

          {/* Hiển thị 3-4 thông số nổi bật nhất dạng preview */}
          {productSpecs.length > 0 && (
            <div className={styles.keySpecsGrid}>
              {productSpecs.slice(0, 3).map((spec) => (
                <div key={spec.id || spec.specName} className={styles.keySpecItem}>
                  <span className={styles.keySpecName}>{spec.specName}</span>
                  <strong className={styles.keySpecValue} title={spec.specValue}>
                    {spec.specValue}
                  </strong>
                </div>
              ))}
            </div>
          )}

          <div className={styles.features}><span><i className="fa-solid fa-check" /> Sản phẩm {product.brand} chính hãng</span><span><i className="fa-solid fa-check" /> Bảo hành chính hãng toàn quốc</span><span><i className="fa-solid fa-check" /> Kiểm tra ngoại quan trước khi giao</span><span><i className="fa-solid fa-check" /> Hỗ trợ tư vấn tương thích ngàm</span></div>
          <div className={styles.purchase}><div className={styles.quantity}><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng">−</button><output>{quantity}</output><button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Tăng số lượng">+</button></div><button className={styles.add} type="button" onClick={addToCart}><i className="fa-solid fa-bag-shopping" /> THÊM VÀO GIỎ</button><Link className={styles.buy} to={ROUTES.cart}>XEM GIỎ HÀNG</Link></div>{added && <p className={styles.notice}>Đã thêm {quantity} sản phẩm vào giỏ hàng.</p>}
        </section>
      </div>

      {/* Drawer Thông số kỹ thuật trượt từ bên phải */}
      <Drawer
        isOpen={isSpecDrawerOpen}
        onClose={() => {
          setIsSpecDrawerOpen(false);
          setSpecSearch('');
        }}
        title="Thông số kỹ thuật"
        eyebrow={(product.brand || 'ZEN STORE').toUpperCase()}
        subtitle={product.name}
        footer={
          <>
            <button
              type="button"
              className={styles.drawerFooterCloseBtn}
              onClick={() => {
                setIsSpecDrawerOpen(false);
                setSpecSearch('');
              }}
            >
              Đóng
            </button>
            <button
              type="button"
              className={styles.drawerFooterAddBtn}
              onClick={() => {
                addToCart();
                setIsSpecDrawerOpen(false);
              }}
            >
              <i className="fa-solid fa-bag-shopping" /> Thêm vào giỏ hàng
            </button>
          </>
        }
      >
        {/* Tóm tắt sản phẩm trong Drawer */}
        <div className={styles.drawerProductCard}>
          <img
            className={styles.drawerProductThumb}
            src={getProductImage(product.image, 200)}
            alt={product.name}
          />
          <div className={styles.drawerProductInfo}>
            <span className={styles.drawerProductBrand}>{product.brand}</span>
            <h4 className={styles.drawerProductName}>{product.name}</h4>
            <div className={styles.drawerProductPrice}>
              <strong>{formatPrice(product.price)}</strong>
              {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
            </div>
          </div>
        </div>

        {/* Ô tìm kiếm thông số nhanh nếu có nhiều thông số */}
        {productSpecs.length >= 3 && (
          <div className={styles.drawerSearchBox}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              className={styles.drawerSearchInput}
              placeholder="Tìm thông số (cảm biến, ngàm, chống rung...)"
              value={specSearch}
              onChange={(e) => setSpecSearch(e.target.value)}
            />
          </div>
        )}

        {/* Bảng thông số kỹ thuật chi tiết */}
        <div className={styles.specSectionTitle}>
          <h3>
            <i className="fa-solid fa-sliders" /> Cấu hình chi tiết
          </h3>
          <span className={styles.specBadgeCount}>
            {filteredSpecs.length} / {productSpecs.length || 0} thông số
          </span>
        </div>

        {filteredSpecs.length > 0 ? (
          <div className={styles.specTable}>
            {filteredSpecs.map((spec, index) => (
              <div key={spec.id || `${spec.specName}-${index}`} className={styles.specTableRow}>
                <span className={styles.specTableLabel}>{spec.specName}</span>
                <span className={styles.specTableValue}>{spec.specValue}</span>
              </div>
            ))}
          </div>
        ) : productSpecs.length > 0 ? (
          <div className={styles.specEmpty}>
            <i className="fa-solid fa-magnifying-glass" />
            <p>Không tìm thấy thông số phù hợp với "{specSearch}"</p>
            <small>Vui lòng thử tìm từ khóa khác như "cảm biến", "ISO", "ngàm"...</small>
          </div>
        ) : (
          <div className={styles.specEmpty}>
            <i className="fa-solid fa-circle-info" />
            <p>Thông số kỹ thuật đang được cập nhật</p>
            <small>Sản phẩm chính hãng với đầy đủ phụ kiện theo tiêu chuẩn nhà sản xuất.</small>
          </div>
        )}

        {/* Bảng thông tin chung của sản phẩm */}
        <div className={styles.specSectionTitle} style={{ marginTop: 24 }}>
          <h3>
            <i className="fa-solid fa-circle-check" /> Thông tin chung & bảo hành
          </h3>
        </div>
        <div className={styles.specTable}>
          {standardInfo.map((item) => (
            <div key={item.label} className={styles.specTableRow}>
              <span className={styles.specTableLabel}>{item.label}</span>
              <span className={styles.specTableValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Phần Đánh Giá Từ Khách Hàng Đã Mua Hàng */}
      <section className={styles.reviewSection}>
        <div className={styles.reviewHeader}>
          <div>
            <span className={styles.eyebrow}>ĐÁNH GIÁ TỪ KHÁCH HÀNG</span>
            <h2>Phản hồi thực tế từ người mua</h2>
            <p>Chỉ những khách hàng đã mua và hoàn tất đơn hàng mới có thể gửi đánh giá cho sản phẩm này.</p>
          </div>
          {reviews.length > 0 && (
            <div className={styles.reviewScoreBox}>
              <div className={styles.reviewScoreNum}>{avgRating}</div>
              <div>
                <div className={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <i key={s} className={`fa-solid fa-star ${Math.round(avgRating) >= s ? styles.starFilled : styles.starEmpty}`} />
                  ))}
                </div>
                <small>{reviews.length} đánh giá xác thực</small>
              </div>
            </div>
          )}
        </div>

        {reviews.length > 0 ? (
          <div className={styles.reviewList}>
            {reviews.map((rev) => (
              <article key={rev.id} className={styles.reviewCard}>
                <div className={styles.reviewCardTop}>
                  <div className={styles.reviewUser}>
                    <span className={styles.reviewAvatar}>
                      {(rev.userName || 'K').slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{rev.userName || 'Khách hàng Zen Store'}</strong>
                      <span className={styles.verifiedBadge}>
                        <i className="fa-solid fa-circle-check" /> Đã mua hàng
                      </span>
                    </div>
                  </div>
                  <time className={styles.reviewDate}>
                    {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                  </time>
                </div>

                <div className={styles.reviewCardStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <i key={s} className={`fa-solid fa-star ${rev.rating >= s ? styles.starFilled : styles.starEmpty}`} />
                  ))}
                </div>

                {rev.comment && <p className={styles.reviewCardComment}>{rev.comment}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.noReviews}>
            <i className="fa-regular fa-comment-dots" />
            <p>Chưa có đánh giá nào cho sản phẩm này.</p>
            <small>Sau khi bạn đặt hàng và đơn hàng được giao thành công, hãy vào mục <b>Tài khoản &gt; Lịch sử đơn hàng</b> để viết đánh giá.</small>
          </div>
        )}
      </section>

      {/* Phần Sản Phẩm Liên Quan */}
      {relatedProducts.length > 0 && (
        <section className={styles.relatedSection}>
          <div className={styles.relatedHeader}>
            <div>
              <span className={styles.eyebrow}>GỢI Ý TƯƠNG THÍCH</span>
              <h2>Sản phẩm liên quan</h2>
              <p>Các thiết bị cùng thương hiệu {product.brand} hoặc phân loại {product.type?.toLowerCase()} có thể bạn quan tâm.</p>
            </div>
            <Link className={styles.relatedViewAll} to={`${ROUTES.products}?brand=${encodeURIComponent(product.brand)}`}>
              Xem thêm {product.brand} <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          <div className={styles.relatedGrid}>
            {relatedProducts.map((rel) => (
              <article key={rel.id} className={styles.relatedCard}>
                {rel.badge && <span className={styles.relatedBadge}>{rel.badge}</span>}
                <Link className={styles.relatedImage} to={`${ROUTES.products}/${rel.id}`}>
                  <img src={getProductImage(rel.image, 400)} alt={rel.name} loading="lazy" />
                </Link>
                <div className={styles.relatedInfo}>
                  <span className={styles.relatedCategory}>
                    {(rel.brand || 'CHÍNH HÃNG').toUpperCase()} / {(rel.type || 'MÁY ẢNH').toUpperCase()}
                  </span>
                  <h3>
                    <Link to={`${ROUTES.products}/${rel.id}`}>{rel.name}</Link>
                  </h3>
                  <div className={styles.relatedBottom}>
                    <div className={styles.relatedPrice}>
                      <strong>{formatPrice(rel.price)}</strong>
                      {rel.oldPrice && <del>{formatPrice(rel.oldPrice)}</del>}
                    </div>
                    <button
                      type="button"
                      className={`${styles.relatedAddBtn} ${addedRelId === rel.id ? styles.relatedAddBtnSuccess : ''}`}
                      onClick={() => {
                        addItem({ id: rel.id, name: rel.name, price: rel.price, image: getProductImage(rel.image, 240) }, 1);
                        setAddedRelId(rel.id);
                        setTimeout(() => setAddedRelId(''), 2000);
                      }}
                      aria-label={`Thêm ${rel.name} vào giỏ`}
                      title={addedRelId === rel.id ? "Đã thêm vào giỏ hàng" : "Thêm vào giỏ hàng"}
                    >
                      <i className={addedRelId === rel.id ? "fa-solid fa-check" : "fa-solid fa-plus"} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetail;
