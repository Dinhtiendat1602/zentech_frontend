import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
import styles from './StoreFooter.module.css';

function StoreFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <Link className={styles.brand} to={ROUTES.home}><span className={styles.brandName}>Zen TECH</span><span className={styles.brandTag}>CÔNG NGHỆ MỞ LỐI TƯƠNG LAI</span></Link>
          <p>Điểm đến đáng tin cậy cho máy ảnh và ống kính chính hãng. Chọn đúng thiết bị, kể câu chuyện bằng hình ảnh.</p>
          <div className={styles.socials}><a href="https://facebook.com" aria-label="Facebook"><i className="fa-brands fa-facebook-f" /></a><a href="https://instagram.com" aria-label="Instagram"><i className="fa-brands fa-instagram" /></a><a href="https://tiktok.com" aria-label="TikTok"><i className="fa-brands fa-tiktok" /></a><a href="https://youtube.com" aria-label="Youtube"><i className="fa-brands fa-youtube" /></a></div>
        </div>
        <div className={styles.footerColumn}><h2>CỬA HÀNG</h2><Link to={ROUTES.products}>Tất cả sản phẩm</Link><Link to={ROUTES.products}>Hàng mới về</Link><Link to={ROUTES.products}>Sản phẩm bán chạy</Link><Link to={`${ROUTES.home}#uu-dai`}>Ưu đãi hôm nay</Link><Link to={ROUTES.products}>Thương hiệu</Link></div>
        <div className={styles.footerColumn}><h2>DỊCH VỤ KHÁCH HÀNG</h2><Link to={ROUTES.account}>Liên hệ</Link><Link to={ROUTES.account}>Tra cứu đơn hàng</Link><Link to={ROUTES.account}>Đổi trả & hoàn tiền</Link><Link to={ROUTES.account}>Chính sách vận chuyển</Link><Link to={ROUTES.account}>Bảo hành</Link></div>
        <div className={styles.footerColumn}><h2>VỀ ZenTECH</h2><Link to={`${ROUTES.home}#cam-hung`}>Câu chuyện thương hiệu</Link><Link to={`${ROUTES.home}#cam-hung`}>Tin công nghệ</Link><Link to={ROUTES.account}>Cơ hội nghề nghiệp</Link><Link to={ROUTES.account}>Chính sách bảo mật</Link><Link to={ROUTES.account}>Điều khoản dịch vụ</Link></div>
        <div className={styles.newsletter}><h2>BẢN TIN CÔNG NGHỆ</h2><p>Nhận tin mới và ưu đãi dành riêng cho bạn.</p><form onSubmit={handleSubscribe}><label className={styles.srOnly} htmlFor="store-footer-email">Địa chỉ email</label><input id="store-footer-email" type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setSubscribed(false); }} placeholder="Email của bạn" /><button type="submit" aria-label="Đăng ký nhận bản tin"><i className="fa-solid fa-arrow-right" /></button></form>{subscribed && <small className={styles.successMessage} role="status">Cảm ơn bạn đã đăng ký!</small>}</div>
      </div>
      <div className={styles.footerBottom}><p>© 2026 ZenTech Market. Bảo lưu mọi quyền.</p><div className={styles.payment}><span>VISA</span><span>●●</span><span>PayPal</span><span>Apple Pay</span></div><Link to={ROUTES.account}>Chính sách & điều khoản</Link></div>
    </footer>
  );
}

export default StoreFooter;
