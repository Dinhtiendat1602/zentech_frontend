import { Link } from 'react-router-dom';
import { useCart } from '../../../context/useCart.js';
import { ROUTES } from '../../../constants/routes.js';
import styles from './Cart.module.css';

const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

function Cart() {
  const { items, subtotal, setQuantity, removeItem } = useCart();

  return (
    <div className={styles.page}>
      <header className={styles.heading}><span className={styles.eyebrow}>GIỎ HÀNG CỦA BẠN</span><h1>Kiểm tra lựa chọn</h1><p>Sản phẩm bạn chọn sẽ được giữ trong giỏ hàng trên thiết bị này.</p></header>
      {!items.length ? <div className={styles.empty}><i className="fa-solid fa-bag-shopping" /><h2>Giỏ hàng đang trống</h2><p>Khám phá máy ảnh và ống kính từ các thương hiệu hàng đầu.</p><Link to={ROUTES.products}>TIẾP TỤC MUA SẮM <i className="fa-solid fa-arrow-right" /></Link></div> : <div className={styles.layout}>
        <div className={styles.items}>{items.map((item) => <article className={styles.item} key={item.id}><div className={styles.image}><img src={item.image} alt={item.name} /></div><div className={styles.info}><small>NOVA TECH / CHÍNH HÃNG</small><h2>{item.name}</h2><p>Đơn giá: {formatPrice(item.price)}</p></div><div className={styles.actions}><strong>{formatPrice(item.price * item.quantity)}</strong><div className={styles.quantity}><button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label={`Giảm số lượng ${item.name}`}>−</button><output>{item.quantity}</output><button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label={`Tăng số lượng ${item.name}`}>+</button></div><button className={styles.remove} type="button" onClick={() => removeItem(item.id)}>Xóa sản phẩm</button></div></article>)}</div>
        <aside className={styles.summary}><h2>Tóm tắt đơn hàng</h2><div className={styles.line}><span>Tạm tính</span><span>{formatPrice(subtotal)}</span></div><div className={styles.line}><span>Vận chuyển</span><span>{subtotal >= 2000000 ? 'Miễn phí' : '30.000đ'}</span></div><div className={styles.total}><span>Tổng cộng</span><strong>{formatPrice(subtotal + (subtotal >= 2000000 ? 0 : 30000))}</strong></div><Link className={styles.checkout} to={ROUTES.checkout}>TIẾN HÀNH THANH TOÁN <i className="fa-solid fa-arrow-right" /></Link><Link className={styles.continue} to={ROUTES.products}>Tiếp tục mua sắm</Link></aside>
      </div>}
    </div>
  );
}

export default Cart;
