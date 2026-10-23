import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../../context/useCart.js';
import { ROUTES } from '../../../constants/routes.js';
import { BRAND_IMAGES, CAMERA_BRANDS, formatPrice, getProductImage } from '../../../data/products.js';
import { getValidToken, logout } from '../../../utils/auth.js';
import { showToast } from '../../../context/ToastContext.jsx';
import styles from './Home.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

function Home() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [productsData, setProductsData] = useState([]);
  const [wishlist, setWishlist] = useState(() => new Set());
  const [openFaq, setOpenFaq] = useState('shipping');
  const [secondsLeft, setSecondsLeft] = useState(2 * 86400 + 14 * 3600 + 36 * 60 + 58);

  // Countdown timer for deals
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 2 * 86400 + 14 * 3600 + 36 * 60 + 58));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Fetch real products from backend database
  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) return;
        const json = await response.json();
        if (active && Array.isArray(json.data) && json.data.length > 0) {
          setProductsData(json.data);
        }
      } catch {
        // Fallback to static PRODUCTS
      }
    };
    fetchCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Load user wishlist if logged in
  useEffect(() => {
    const token = getValidToken();
    if (!token) return;
    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (response.status === 401) {
          logout({ expired: true, redirect: false });
          return;
        }
        if (!response.ok) return;
        const result = await response.json();
        setWishlist(new Set((result.data?.wishlist || []).map((item) => item.id)));
      })
      .catch(() => {});
  }, []);

  const toggleWishlist = async (product) => {
    const token = getValidToken();
    if (!token) {
      logout({ expired: true, redirect: true, navigate });
      return;
    }
    const isSaved = wishlist.has(product.id);
    try {
      const wishlistUrl = `${API_URL}/users/me/wishlist`;
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
      if (response.ok) {
        setWishlist((current) => {
          const updated = new Set(current);
          if (isSaved) updated.delete(product.id);
          else updated.add(product.id);
          return updated;
        });
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
      }
    } catch {
      // ignore
    }
  };

  const handleAddToCart = (product) => {
    addItem(
      {
        id: product.id,
        databaseId: product.databaseId,
        name: product.name,
        price: product.price,
        image: getProductImage(product.image, 240),
      },
      1
    );
  };

  const displayedProducts = useMemo(() => {
    // Chỉ hiển thị 6 sản phẩm nổi bật (1 hàng)
    const featured = productsData.filter((p) => p.isFeatured || p.badge);
    const nonFeatured = productsData.filter((p) => !p.isFeatured && !p.badge);
    return [...featured, ...nonFeatured].slice(0, 6);
  }, [productsData]);

  const heroProduct1 = productsData[0] || null;
  const heroProduct2 = productsData[1] || productsData[0] || null;
  const heroProduct3 = productsData[2] || productsData[0] || null;

  return (
    <div className={styles.page}>
      <main>
        {/* Hero Section */}
        <section className={styles.hero} id="home">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <i /> THẾ GIỚI NHIẾP ẢNH
            </span>
            <h1>
              GHI LẠI<br />
              ĐIỀU <em>BẠN THẤY</em>
            </h1>
            <p>Máy ảnh và ống kính chính hãng từ Canon, Sony, Nikon, Fujifilm, Panasonic và Sigma.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#san-pham">
                KHÁM PHÁ THIẾT BỊ <span className="fa-solid fa-arrow-right" />
              </a>
              <a className={styles.outlineButton} href="#danh-muc">
                CHỌN THƯƠNG HIỆU
              </a>
            </div>
            <div className={styles.heroNote}>
              <span className="fa-solid fa-circle-check" /> Sản phẩm chính hãng, bảo hành toàn quốc
            </div>
          </div>
          <div className={styles.heroVisual} aria-label="Bộ sưu tập máy ảnh và ống kính">
            <div className={styles.heroGlow} />
            <div className={styles.heroLaptop}>
              <img
                src={getProductImage(heroProduct1?.image || 'photo-1502920917128-1aa500764cbd', 1200)}
                alt={heroProduct1?.name || 'Máy ảnh chuyên nghiệp'}
                fetchPriority="high"
              />
            </div>
            <div className={styles.heroHeadphones}>
              <img
                src={getProductImage(heroProduct2?.image || 'photo-1516035069371-29a1b244cc32', 700)}
                alt={heroProduct2?.name || 'Ống kính chuyên nghiệp'}
                fetchPriority="high"
              />
            </div>
            <div className={styles.heroWatch}>
              <img
                src={getProductImage(heroProduct3?.image || 'photo-1502920917128-1aa500764cbd', 500)}
                alt={heroProduct3?.name || 'Thiết bị phụ trợ'}
              />
            </div>
            <span className={styles.heroOrbit} />
            <span className={styles.heroCaption}>
              CHÍNH HÃNG 100% <i /> CAMERA & LENS
            </span>
          </div>
          <div className={styles.trustBar}>
            <div>
              <span className="fa-solid fa-shield-halved" />
              <p>
                <b>100% chính hãng</b>
                <small>An tâm chọn lựa</small>
              </p>
            </div>
            <div>
              <span className="fa-regular fa-credit-card" />
              <p>
                <b>Thanh toán an toàn</b>
                <small>Bảo mật tuyệt đối</small>
              </p>
            </div>
            <div>
              <span className="fa-solid fa-rotate-left" />
              <p>
                <b>Đổi trả linh hoạt</b>
                <small>Trong vòng 7 ngày</small>
              </p>
            </div>
            <div>
              <span className="fa-solid fa-medal" />
              <p>
                <b>Bảo hành chính hãng</b>
                <small>Lên đến 24 tháng</small>
              </p>
            </div>
          </div>
        </section>

        {/* Brands Section */}
        <section className={styles.section} id="danh-muc">
          <div className={styles.sectionHeading}>
            <span />
            <div>
              <small>CANON · SONY · NIKON · FUJIFILM · PANASONIC · SIGMA</small>
              <h2>CHỌN THEO THƯƠNG HIỆU</h2>
            </div>
            <span />
          </div>
          <div className={styles.categoryGrid}>
            {CAMERA_BRANDS.map((brand) => (
              <Link className={styles.categoryCard} to={`${ROUTES.products}?brand=${encodeURIComponent(brand)}`} key={brand}>
                <div className={`${styles.categoryImage} ${brand === 'Sony' ? styles.brandDark : styles.brandLight}`}>
                  <img
                    src={BRAND_IMAGES[brand] || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcIR7NL-ZijXpu-pbuzJmpI8jgauJOk1Kq5M2LlF9dSg&s=10'}
                    alt={`Thương hiệu ${brand}`}
                    loading="lazy"
                  />
                  <span className="fa-solid fa-camera" />
                </div>
                <div className={styles.categoryText}>
                  <h3>{brand}</h3>
                  <p>Máy ảnh & ống kính</p>
                </div>
                <span className={`fa-solid fa-arrow-up-right-from-square ${styles.categoryArrow}`} />
              </Link>
            ))}
          </div>
        </section>

        {/* Products Section */}
        <section className={`${styles.section} ${styles.productsSection}`} id="san-pham">
          <div className={styles.sectionBar}>
            <div className={styles.sectionHeading}>
              <span />
              <div>
                <small>BỘ SƯU TẬP MỚI NHẤT</small>
                <h2>SẢN PHẨM NỔI BẬT</h2>
              </div>
              <span />
            </div>
            <Link className={styles.viewAll} to={ROUTES.products}>
              XEM TẤT CẢ ({productsData.length}) <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          <div className={styles.productGrid}>
            {displayedProducts.map((product) => {
              const isFavorite = wishlist.has(product.id);
              return (
                <article className={styles.productCard} key={product.id}>
                  {(product.badge || product.isFeatured) && (
                    <span className={styles.newBadge}>{product.badge || 'NỔI BẬT'}</span>
                  )}
                  <button
                    className={styles.favorite}
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    aria-label={`Yêu thích ${product.name}`}
                    style={isFavorite ? { color: '#ff4d4d', borderColor: '#ff4d4d' } : {}}
                  >
                    <i className={isFavorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
                  </button>
                  <Link className={styles.productImage} to={`${ROUTES.products}/${product.id}`}>
                    <img
                      src={getProductImage(product.image, 520)}
                      alt={product.name}
                      loading="lazy"
                    />
                  </Link>
                  <div className={styles.productInfo}>
                    <span className={styles.productCategory}>
                      {(product.brand || 'CHÍNH HÃNG').toUpperCase()} / {(product.type || 'MÁY ẢNH').toUpperCase()}
                    </span>
                    <h3>
                      <Link to={`${ROUTES.products}/${product.id}`}>{product.name}</Link>
                    </h3>
                    {product.description && (
                      <p className={styles.productDesc}>
                        {product.description.replace(/<[^>]*>/g, '').trim()}
                      </p>
                    )}
                    <div className={styles.rating}>
                      <span>★★★★★</span>
                      <small>({product.reviews ?? 0})</small>
                    </div>
                    <div className={styles.productBottom}>
                      <div>
                        <b>{formatPrice(product.price)}</b>
                        {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        aria-label={`Thêm ${product.name} vào giỏ`}
                        title="Thêm vào giỏ hàng"
                      >
                        <i className="fa-solid fa-plus" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Innovation Section */}
        <section className={styles.innovation} id="cam-hung">
          <div className={styles.innovationTitle}>
            <span />
            <div>
              <small>ĐIỀU LÀM NÊN KHÁC BIỆT</small>
              <h2>CÔNG NGHỆ TRUYỀN CẢM HỨNG</h2>
            </div>
            <span />
          </div>
          <div className={styles.innovationGrid}>
            <article>
              <i className="fa-solid fa-microchip" />
              <div>
                <h3>Công nghệ tiên tiến</h3>
                <p>Cảm biến thế hệ mới, bộ xử lý hình ảnh vượt trội mang đến độ nét chân thực.</p>
              </div>
            </article>
            <article>
              <i className="fa-regular fa-gem" />
              <div>
                <h3>Chất lượng tuyển chọn</h3>
                <p>Mỗi thiết bị đều được kiểm định kỹ lưỡng, đảm bảo nguồn gốc và chất lượng cao nhất.</p>
              </div>
            </article>
            <article>
              <i className="fa-solid fa-bolt" />
              <div>
                <h3>Lấy nét thần tốc</h3>
                <p>Khả năng tracking nhận diện mắt, khuôn mặt theo thời gian thực chính xác tuyệt đối.</p>
              </div>
            </article>
            <article>
              <i className="fa-solid fa-cube" />
              <div>
                <h3>Thiết kế công thái học</h3>
                <p>Báng cầm đầm tay, kháng thời tiết bền bỉ đồng hành cùng bạn trong mọi chuyến đi.</p>
              </div>
            </article>
          </div>
        </section>

        {/* Deal Section */}
        <section className={styles.deal} id="uu-dai">
          <div className={styles.dealCopy}>
            <span className={styles.eyebrow}>
              <i /> ƯU ĐÃI CÓ THỜI HẠN
            </span>
            <h2>
              ỐNG KÍNH<br />
              CHO MỌI GÓC NHÌN
            </h2>
            <p>Khám phá ống kính chính hãng cho hệ máy Canon, Sony, Nikon, Fujifilm, Panasonic và Sigma.</p>
            <div className={styles.countdown}>
              <div className={styles.timeBox}>
                <b>{String(Math.floor(secondsLeft / 86400)).padStart(2, '0')}</b>
                <small>NGÀY</small>
              </div>
              <div className={styles.timeBox}>
                <b>{String(Math.floor((secondsLeft % 86400) / 3600)).padStart(2, '0')}</b>
                <small>GIỜ</small>
              </div>
              <div className={styles.timeBox}>
                <b>{String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0')}</b>
                <small>PHÚT</small>
              </div>
              <div className={styles.timeBox}>
                <b>{String(secondsLeft % 60).padStart(2, '0')}</b>
                <small>GIÂY</small>
              </div>
            </div>
            <a href="#san-pham" className={styles.primaryButton}>
              SĂN ƯU ĐÃI <span className="fa-solid fa-arrow-right" />
            </a>
          </div>
          <div className={styles.dealVisual}>
            <div className={styles.dealRing} />
            <img
              className={styles.dealHeadphones}
              src={getProductImage(productsData[1]?.image || 'photo-1516035069371-29a1b244cc32', 700)}
              alt="Ống kính chuyên nghiệp"
              loading="lazy"
            />
            <img
              className={styles.dealWatch}
              src={getProductImage(productsData[2]?.image || 'photo-1502920917128-1aa500764cbd', 420)}
              alt="Máy ảnh chuyên nghiệp"
              loading="lazy"
            />
            <img
              className={styles.dealSpeaker}
              src={getProductImage(productsData[3]?.image || 'photo-1516035069371-29a1b244cc32', 500)}
              alt="Ống kính cao cấp"
              loading="lazy"
            />
            <div className={styles.discount}>
              <small>ỐNG KÍNH</small>
              <b>6 HÃNG</b>
              <small>CHÍNH HÃNG</small>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className={styles.reviews}>
          <div className={styles.sectionHeading}>
            <span />
            <div>
              <small>TRẢI NGHIỆM THẬT</small>
              <h2>KHÁCH HÀNG NÓI GÌ?</h2>
            </div>
            <span />
          </div>
          <div className={styles.reviewGrid}>
            <article>
              <div className={styles.quoteMark}>“</div>
              <p>Máy ảnh chính hãng, tư vấn đúng nhu cầu chụp và giao hàng rất cẩn thận.</p>
              <div className={styles.reviewStars}>★★★★★</div>
              <div className={styles.reviewer}>
                <img src="https://i.pravatar.cc/80?img=47" alt="" loading="lazy" />
                <span>
                  <b>Minh Anh</b>
                  <small>Khách hàng đã xác thực</small>
                </span>
              </div>
            </article>
            <article>
              <div className={styles.quoteMark}>“</div>
              <p>Ống kính lấy nét nhanh, ảnh sắc nét. Nhân viên tư vấn ngàm tương thích rất kỹ.</p>
              <div className={styles.reviewStars}>★★★★★</div>
              <div className={styles.reviewer}>
                <img src="https://i.pravatar.cc/80?img=12" alt="" loading="lazy" />
                <span>
                  <b>Quốc Huy</b>
                  <small>Khách hàng đã xác thực</small>
                </span>
              </div>
            </article>
            <article>
              <div className={styles.quoteMark}>“</div>
              <p>Hỗ trợ sau mua tận tình, chính sách bảo hành rõ ràng. Chắc chắn sẽ quay lại!</p>
              <div className={styles.reviewStars}>★★★★★</div>
              <div className={styles.reviewer}>
                <img src="https://i.pravatar.cc/80?img=44" alt="" loading="lazy" />
                <span>
                  <b>Thu Hà</b>
                  <small>Khách hàng đã xác thực</small>
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* FAQs and Support Section */}
        <section className={styles.helpSection} id="hoi-dap">
          <div className={styles.faq}>
            <span className={styles.eyebrow}>
              <i /> HỖ TRỢ BẠN TỐT HƠN
            </span>
            <h2>CÂU HỎI THƯỜNG GẶP</h2>
            <div className={styles.faqList}>
              <article className={styles.faqItem}>
                <button
                  type="button"
                  aria-expanded={openFaq === 'shipping'}
                  onClick={() => setOpenFaq(openFaq === 'shipping' ? '' : 'shipping')}
                >
                  <span>Cửa hàng có giao hàng toàn quốc không?</span>
                  <i className={`fa-solid ${openFaq === 'shipping' ? 'fa-minus' : 'fa-plus'}`} />
                </button>
                {openFaq === 'shipping' && (
                  <p>Có. Zen Store giao hàng đến tất cả tỉnh thành; đơn từ 2.000.000đ được miễn phí vận chuyển.</p>
                )}
              </article>
              <article className={styles.faqItem}>
                <button
                  type="button"
                  aria-expanded={openFaq === 'returns'}
                  onClick={() => setOpenFaq(openFaq === 'returns' ? '' : 'returns')}
                >
                  <span>Tôi có thể đổi trả sản phẩm trong bao lâu?</span>
                  <i className={`fa-solid ${openFaq === 'returns' ? 'fa-minus' : 'fa-plus'}`} />
                </button>
                {openFaq === 'returns' && (
                  <p>Bạn có thể đổi trả trong vòng 7 ngày nếu sản phẩm còn nguyên vẹn và đầy đủ phụ kiện.</p>
                )}
              </article>
              <article className={styles.faqItem}>
                <button
                  type="button"
                  aria-expanded={openFaq === 'tracking'}
                  onClick={() => setOpenFaq(openFaq === 'tracking' ? '' : 'tracking')}
                >
                  <span>Làm thế nào để theo dõi đơn hàng?</span>
                  <i className={`fa-solid ${openFaq === 'tracking' ? 'fa-minus' : 'fa-plus'}`} />
                </button>
                {openFaq === 'tracking' && (
                  <p>Mã vận đơn sẽ được gửi qua SMS và email ngay sau khi đơn hàng được bàn giao cho đơn vị vận chuyển.</p>
                )}
              </article>
              <article className={styles.faqItem}>
                <button
                  type="button"
                  aria-expanded={openFaq === 'payment'}
                  onClick={() => setOpenFaq(openFaq === 'payment' ? '' : 'payment')}
                >
                  <span>Zen Store chấp nhận những phương thức thanh toán nào?</span>
                  <i className={`fa-solid ${openFaq === 'payment' ? 'fa-minus' : 'fa-plus'}`} />
                </button>
                {openFaq === 'payment' && (
                  <p>Bạn có thể thanh toán bằng thẻ, chuyển khoản ngân hàng hoặc tiền mặt khi nhận hàng (COD).</p>
                )}
              </article>
              <article className={styles.faqItem}>
                <button
                  type="button"
                  aria-expanded={openFaq === 'warranty'}
                  onClick={() => setOpenFaq(openFaq === 'warranty' ? '' : 'warranty')}
                >
                  <span>Sản phẩm được bảo hành trong bao lâu?</span>
                  <i className={`fa-solid ${openFaq === 'warranty' ? 'fa-minus' : 'fa-plus'}`} />
                </button>
                {openFaq === 'warranty' && (
                  <p>Sản phẩm chính hãng được bảo hành từ 12 đến 24 tháng theo chính sách của từng thương hiệu.</p>
                )}
              </article>
            </div>
          </div>
          <div className={styles.contact} id="ho-tro">
            <span className={styles.eyebrow}>
              <i /> ZEN STORE LUÔN Ở ĐÂY
            </span>
            <h2>BẠN CẦN CHÚNG TÔI GIÚP GÌ?</h2>
            <p>Đội ngũ tư vấn sẵn sàng hỗ trợ bạn chọn đúng sản phẩm và giải đáp mọi thắc mắc.</p>
            <div className={styles.contactGrid}>
              <a href="mailto:dinhtiendat1602@gmail.com">
                <i className="fa-regular fa-comments" />
                <b>Trò chuyện</b>
                <small>Phản hồi tức thì</small>
              </a>
              <a href="mailto:dinhtiendat1602@gmail.com">
                <i className="fa-regular fa-envelope" />
                <b>Gửi email</b>
                <small>dinhtiendat1602@gmail.com</small>
              </a>
              <a href="tel:0942981363">
                <i className="fa-solid fa-phone" />
                <b>Gọi cho chúng tôi</b>
                <small>0942 981 363</small>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;