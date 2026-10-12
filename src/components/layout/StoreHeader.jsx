import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/useCart.js';
import { useTheme } from '../../context/useTheme.js';
import { ROUTES } from '../../constants/routes.js';
import { formatPrice, getProductImage } from '../../data/products.js';
import { getCurrentUser } from '../../utils/auth.js';
import styles from './StoreHeader.module.css';

function StoreHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('novatech-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('novatech-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const accountRoute = currentUser?.role === 'admin' ? ROUTES.admin : ROUTES.account;
  const closeMenu = () => setMenuOpen(false);

  // Close preview dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch quick suggestions with debounce
  useEffect(() => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api').replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/products?q=${encodeURIComponent(keyword)}`);
        if (!response.ok) return;
        const result = await response.json();
        if (Array.isArray(result.data)) {
          setSuggestions(result.data.slice(0, 5));
        }
      } catch {
        // silent error for suggestions
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (event) => {
    event?.preventDefault();
    const keyword = searchQuery.trim();
    setShowDropdown(false);
    closeMenu();
    if (keyword) {
      navigate(`${ROUTES.products}?q=${encodeURIComponent(keyword)}`);
    } else {
      navigate(ROUTES.products);
    }
  };

  const handleSelectProduct = (productId) => {
    setShowDropdown(false);
    closeMenu();
    navigate(`/san-pham/${productId}`);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <Link className={styles.brand} to={ROUTES.home} onClick={closeMenu} aria-label="ZenTech - trang chủ">
          <span className={styles.brandName}>ZenTech</span>
          <span className={styles.brandTag}>CÔNG NGHỆ MỞ LỐI TƯƠNG LAI</span>
        </Link>
        <div className={styles.searchContainer} ref={searchContainerRef}>
          <form className={styles.searchBox} onSubmit={handleSearchSubmit} role="search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowDropdown(false);
              }}
              placeholder="Tìm kiếm máy ảnh, ống kính..."
              aria-label="Tìm kiếm sản phẩm"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                aria-label="Xóa từ khóa"
              >
                <span className="fa-solid fa-xmark" />
              </button>
            )}
            <button type="submit" className={styles.searchBtn} aria-label="Tìm kiếm" title="Tìm kiếm">
              <span className="fa-solid fa-magnifying-glass" />
            </button>
          </form>

          {showDropdown && searchQuery.trim().length > 0 && (
            <div className={styles.searchDropdown}>
              {suggestions.length > 0 ? (
                <>
                  <div className={styles.dropdownHeader}>Gợi ý sản phẩm ({suggestions.length})</div>
                  <div className={styles.dropdownList}>
                    {suggestions.map((item) => (
                      <div
                        key={item.id}
                        className={styles.dropdownItem}
                        onClick={() => handleSelectProduct(item.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <img
                          src={getProductImage(item.image, 100)}
                          alt={item.name}
                          className={styles.dropdownThumb}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className={styles.dropdownInfo}>
                          <span className={styles.dropdownName}>{item.name}</span>
                          <div className={styles.dropdownMeta}>
                            <span className={styles.dropdownPrice}>{formatPrice(item.price)}</span>
                            {item.brand && <span className={styles.dropdownBrand}>{item.brand}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.dropdownViewAll}
                    onClick={handleSearchSubmit}
                  >
                    <span>Xem tất cả kết quả cho "<b>{searchQuery.trim()}</b>"</span>
                    <span className="fa-solid fa-arrow-right" />
                  </button>
                </>
              ) : (
                <div className={styles.dropdownEmpty}>
                  Không tìm thấy sản phẩm nào khớp với "<b>{searchQuery.trim()}</b>"
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
          <div className={styles.serviceLink}><span className="fa-solid fa-truck-fast" /><span><b>Giao hàng miễn phí</b><small>Đơn hàng trên 2 triệu</small></span></div>
          <div className={styles.serviceLink}><span className="fa-solid fa-headset" /><span><b>Chăm sóc tận tâm</b><small>Hỗ trợ mỗi ngày</small></span></div>
          <Link className={styles.iconLink} to={accountRoute} onClick={closeMenu} aria-label="Tài khoản"><span className="fa-regular fa-user" /><small>{accountRoute === ROUTES.admin ? 'Quản trị' : 'Tài khoản'}</small></Link>
          <Link className={styles.iconLink} to={ROUTES.cart} onClick={closeMenu} aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}><span className="fa-solid fa-bag-shopping" /><small>Giỏ hàng <b>{itemCount}</b></small></Link>
          <button className={styles.themeToggle} type="button" onClick={toggleTheme} aria-label={`Chuyển sang giao diện ${theme === 'dark' ? 'sáng' : 'tối'}`} title={`Giao diện ${theme === 'dark' ? 'sáng' : 'tối'}`}><span className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} /></button>
        </div>
        <button className={styles.menuToggle} type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="store-navigation">
          <span className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`} />
        </button>
      </div>
      <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} id="store-navigation" aria-label="Điều hướng chính">
        <NavLink to={ROUTES.home} end onClick={closeMenu}>Trang chủ</NavLink>
        <NavLink to={ROUTES.products} onClick={closeMenu}>Danh mục <span className="fa-solid fa-chevron-down" /></NavLink>
        <NavLink to={ROUTES.products} onClick={closeMenu}>Hàng mới</NavLink>
        <NavLink to={ROUTES.products} onClick={closeMenu}>Bán chạy</NavLink>
        <Link to={`${ROUTES.home}#uu-dai`} onClick={closeMenu}>Ưu đãi</Link>
        <Link to={`${ROUTES.home}#cam-hung`} onClick={closeMenu}>Công nghệ</Link>
        <Link to={`${ROUTES.home}#hoi-dap`} onClick={closeMenu}>Góc tư vấn</Link>
        <Link to={ROUTES.account} onClick={closeMenu}>Liên hệ</Link>
      </nav>
    </header>
  );
}

export default StoreHeader;
