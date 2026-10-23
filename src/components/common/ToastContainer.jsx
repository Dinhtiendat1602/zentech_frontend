import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
import { formatPrice } from '../../data/products.js';
import styles from './ToastContainer.module.css';

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className={styles.toastViewport}
      aria-live="polite"
      role="region"
      aria-label="Thông báo hệ thống"
    >
      {toasts.map((toast) => {
        const isCart = toast.type === 'cart';
        const isWishlistAdd = toast.type === 'wishlist-add';
        const isWishlistRemove = toast.type === 'wishlist-remove';
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        let iconClass = 'fa-solid fa-bell';
        let iconTypeClass = styles.toastIconInfo;
        let defaultTitle = 'Thông báo';

        if (isCart) {
          iconClass = 'fa-solid fa-bag-shopping';
          iconTypeClass = styles.toastIconCart;
          defaultTitle = 'ĐÃ THÊM VÀO GIỎ HÀNG';
        } else if (isWishlistAdd) {
          iconClass = 'fa-solid fa-heart';
          iconTypeClass = styles.toastIconWishlistAdd;
          defaultTitle = 'ĐÃ LƯU YÊU THÍCH';
        } else if (isWishlistRemove) {
          iconClass = 'fa-regular fa-heart';
          iconTypeClass = styles.toastIconWishlistRemove;
          defaultTitle = 'ĐÃ BỎ YÊU THÍCH';
        } else if (isSuccess) {
          iconClass = 'fa-solid fa-circle-check';
          iconTypeClass = styles.toastIconSuccess;
          defaultTitle = 'THÀNH CÔNG';
        } else if (isError) {
          iconClass = 'fa-solid fa-circle-exclamation';
          iconTypeClass = styles.toastIconError;
          defaultTitle = 'LỖI';
        }

        const title = toast.title || defaultTitle;
        const product = toast.product;

        return (
          <aside
            key={toast.id}
            className={`${styles.toastCard} ${toast.leaving ? styles.toastCardLeaving : ''}`}
            role="status"
          >
            <div className={styles.toastBody}>
              <div className={`${styles.toastIcon} ${iconTypeClass}`}>
                <i className={iconClass} />
              </div>

              <div className={styles.toastContent}>
                <strong className={styles.toastTitle}>{title}</strong>

                {product ? (
                  <div className={styles.toastProductRow}>
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name || ''}
                        className={styles.toastProductImage}
                        loading="lazy"
                      />
                    )}
                    <div className={styles.toastProductMeta}>
                      <span className={styles.toastProductName} title={product.name}>
                        {product.name}
                      </span>
                      <span className={styles.toastProductExtra}>
                        {toast.quantity ? `Số lượng: ${toast.quantity}` : null}
                        {toast.quantity && product.price ? ' · ' : null}
                        {product.price ? formatPrice(product.price) : null}
                      </span>
                    </div>
                  </div>
                ) : toast.message ? (
                  <p className={styles.toastDesc}>{toast.message}</p>
                ) : null}
              </div>

              <button
                type="button"
                className={styles.toastClose}
                onClick={() => onDismiss?.(toast.id)}
                aria-label="Đóng thông báo"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Action buttons */}
            {isCart && (
              <div className={styles.toastActionRow}>
                <Link
                  to={ROUTES.cart}
                  className={styles.toastActionLink}
                  onClick={() => onDismiss?.(toast.id)}
                >
                  Xem giỏ hàng <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>
            )}

            {isWishlistAdd && (
              <div className={styles.toastActionRow}>
                <Link
                  to={ROUTES.account}
                  className={styles.toastActionLink}
                  onClick={() => onDismiss?.(toast.id)}
                >
                  Xem danh sách yêu thích <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>
            )}

            {/* Countdown animation bar */}
            {toast.duration > 0 && (
              <div className={styles.toastProgress}>
                <div
                  className={`${styles.toastProgressBar} ${
                    isWishlistAdd ? styles.toastProgressBarWishlist : ''
                  }`}
                  style={{ animationDuration: `${toast.duration}ms` }}
                />
              </div>
            )}
          </aside>
        );
      })}
    </div>
  );
}
