import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useCart } from '../../../context/useCart.js';
import { ROUTES } from '../../../constants/routes.js';
import { getValidToken, logout } from '../../../utils/auth.js';
import styles from './CheckOut.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

const BANK_INFO = {
  bankId: 'VPB',
  bin: '970432',
  bankName: 'VPBank (Ngân hàng TMCP Việt Nam Thịnh Vượng)',
  accountNo: '0942981363',
  accountName: 'ZEN STORE VIETNAM',
};

// 34 Tỉnh/Thành phố Việt Nam sau sáp nhập 07/2025 (Chuẩn API v2)
const FALLBACK_PROVINCES_V2 = [
  { code: 1, name: 'Thành phố Hà Nội' },
  { code: 79, name: 'Thành phố Hồ Chí Minh' },
  { code: 48, name: 'Thành phố Đà Nẵng' },
  { code: 31, name: 'Thành phố Hải Phòng' },
  { code: 92, name: 'Thành phố Cần Thơ' },
  { code: 46, name: 'Thành phố Huế' },
  { code: 22, name: 'Thành phố Quảng Ninh' },
  { code: 24, name: 'Thành phố Bắc Ninh' },
  { code: 75, name: 'Thành phố Đồng Nai' },
  { code: 38, name: 'Tỉnh Thanh Hóa' },
  { code: 40, name: 'Tỉnh Nghệ An' },
  { code: 42, name: 'Tỉnh Hà Tĩnh' },
  { code: 44, name: 'Tỉnh Quảng Trị' },
  { code: 51, name: 'Tỉnh Quảng Ngãi' },
  { code: 52, name: 'Tỉnh Gia Lai' },
  { code: 56, name: 'Tỉnh Khánh Hòa' },
  { code: 66, name: 'Tỉnh Đắk Lắk' },
  { code: 68, name: 'Tỉnh Lâm Đồng' },
  { code: 80, name: 'Tỉnh Tây Ninh' },
  { code: 82, name: 'Tỉnh Đồng Tháp' },
  { code: 86, name: 'Tỉnh Vĩnh Long' },
  { code: 91, name: 'Tỉnh An Giang' },
  { code: 96, name: 'Tỉnh Cà Mau' },
  { code: 4, name: 'Tỉnh Cao Bằng' },
  { code: 8, name: 'Tỉnh Tuyên Quang' },
  { code: 11, name: 'Tỉnh Điện Biên' },
  { code: 12, name: 'Tỉnh Lai Châu' },
  { code: 14, name: 'Tỉnh Sơn La' },
  { code: 15, name: 'Tỉnh Lào Cai' },
  { code: 19, name: 'Tỉnh Thái Nguyên' },
  { code: 20, name: 'Tỉnh Lạng Sơn' },
  { code: 25, name: 'Tỉnh Phú Thọ' },
  { code: 33, name: 'Tỉnh Hưng Yên' },
  { code: 37, name: 'Tỉnh Ninh Bình' },
];

function CheckOut() {
  const { items, subtotal, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('qr');
  const [copiedField, setCopiedField] = useState('');

  // Thông tin khách hàng (tự động điền nếu đã đăng nhập)
  const [customerName, setCustomerName] = useState(() => {
    try {
      const u = JSON.parse(window.localStorage.getItem('novatech-user') || '{}');
      return u.full_name || u.fullName || '';
    } catch {
      return '';
    }
  });
  const [customerEmail, setCustomerEmail] = useState(() => {
    try {
      const u = JSON.parse(window.localStorage.getItem('novatech-user') || '{}');
      return u.email || '';
    } catch {
      return '';
    }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      const u = JSON.parse(window.localStorage.getItem('novatech-user') || '{}');
      return u.phone || '';
    } catch {
      return '';
    }
  });

  // Quản lý địa chỉ theo API v2: Tỉnh/Thành phố -> Xã/Phường/Thị trấn
  const [provinces, setProvinces] = useState(FALLBACK_PROVINCES_V2);
  const [wards, setWards] = useState([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Tải danh mục 34 tỉnh/thành phố chuẩn từ API v2
  useEffect(() => {
    let active = true;
    setLoadingProvinces(true);
    fetch('https://provinces.open-api.vn/api/v2/?depth=1')
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data) && data.length) {
          setProvinces(data);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });
    return () => { active = false; };
  }, []);

  // Khi người dùng chọn Tỉnh / Thành phố: Tự động tải Xã/Phường/Thị trấn của tỉnh/thành đó (API v2)
  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    setSelectedProvinceCode(code);
    setSelectedWardCode('');
    setWards([]);

    if (!code) return;

    setLoadingWards(true);
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/v2/p/${code}?depth=2`);
      const data = await res.json();
      if (data && Array.isArray(data.wards)) {
        setWards(data.wards);
      }
    } catch (err) {
      console.error('Không thể tải danh sách xã/phường:', err);
    } finally {
      setLoadingWards(false);
    }
  };

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  if (!items.length && !submitted) return <Navigate to={ROUTES.cart} replace />;

  const shippingFee = subtotal >= 2000000 ? 0 : 30000;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleCopy = (text, fieldName) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      window.setTimeout(() => setCopiedField(''), 2000);
    } catch {
      // ignore
    }
  };

  const handleApplyCoupon = async (e) => {
    e?.preventDefault?.();
    const cleanCode = couponCode.trim();

    if (!cleanCode) {
      setCouponError('Vui lòng nhập mã giảm giá.');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const response = await fetch(`${API_URL}/promotions/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          orderAmount: subtotal,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setAppliedCoupon(null);
        setCouponError(result.message || 'Mã giảm giá không hợp lệ.');
      } else {
        setAppliedCoupon(result.data);
        setCouponError('');
      }
    } catch {
      setAppliedCoupon(null);
      setCouponError('Không thể kết nối đến máy chủ để kiểm tra mã. Vui lòng thử lại sau.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const finalCustomerName = String(form.get('name') || customerName || '').trim();
    const phone = String(form.get('phone') || customerPhone || '').trim();
    const finalCustomerEmail = String(form.get('email') || customerEmail || '').trim();
    const note = String(form.get('note') || '').trim();

    const provinceObj = provinces.find((p) => String(p.code) === String(selectedProvinceCode));
    const wardObj = wards.find((w) => String(w.code) === String(selectedWardCode));

    const provinceName = provinceObj ? provinceObj.name : '';
    const wardName = wardObj ? wardObj.name : '';

    const fullAddress = [
      streetAddress.trim(),
      wardName,
      provinceName,
    ].filter(Boolean).join(', ');

    const orderPayload = {
      customerName: finalCustomerName,
      customerPhone: phone,
      customerEmail: finalCustomerEmail,
      customerAddress: fullAddress,
      city: provinceName,
      ward: wardName,
      note,
      totalAmount: subtotal,
      shippingFee,
      discountAmount,
      finalAmount: finalTotal,
      promotionId: appliedCoupon?.id || null,
      promotionCode: appliedCoupon?.code || null,
      paymentMethod: paymentMethod === 'qr' ? 'bank' : 'cod',
      items: items.map((item) => ({
        id: item.databaseId || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    };

    const token = getValidToken();

    try {
      const response = await fetch(`${API_URL}/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderPayload),
      });

      if (response.status === 401) {
        logout({ expired: true, redirect: false });
      }

      const result = await response.json();

      if (response.ok && result.success) {
        setOrderResult(result.data);
        clearCart();
        setSubmitted(true);
      } else {
        alert(result?.message || 'Đặt hàng không thành công. Vui lòng kiểm tra lại thông tin!');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Không thể kết nối đến máy chủ. Vui lòng thử lại sau!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>BƯỚC CUỐI CÙNG</span>
        <h1>Thanh toán</h1>
        <p>Điền thông tin nhận hàng và áp dụng mã ưu đãi để hoàn tất đơn hàng.</p>
      </header>

      {submitted ? (
        <div className={styles.done}>
          <i className="fa-regular fa-circle-check" />
          <h2>Đặt hàng thành công!</h2>
          {orderResult?.orderCode && (
            <div>
              <span className={styles.orderCodeBadge}>Mã đơn hàng: {orderResult.orderCode}</span>
            </div>
          )}
          <p>
            Cảm ơn quý khách <strong>{orderResult?.customerName || ''}</strong> đã mua sắm tại Zen Store.
            Chúng tôi đã tiếp nhận đơn hàng trị giá{' '}
            <strong style={{ color: '#a8f000' }}>{formatPrice(orderResult?.finalAmount ?? finalTotal)}</strong>{' '}
            và sẽ liên hệ sớm nhất để giao hàng.
          </p>

          {(orderResult?.paymentMethod === 'bank' || orderResult?.paymentMethod === 'banking_qr' || paymentMethod === 'qr') && (
            <div className={styles.doneQrCard}>
              <h3><i className="fa-solid fa-qrcode" /> Thông tin quét mã chuyển khoản</h3>
              <p>Quý khách vui lòng quét mã bên dưới hoặc chuyển khoản theo đúng nội dung:</p>
              <div className={styles.doneQrBody}>
                <img
                  src={`https://api.vietqr.io/image/${BANK_INFO.bin}-${BANK_INFO.accountNo}-compact2.png?amount=${orderResult?.finalAmount ?? finalTotal}&addInfo=${encodeURIComponent(orderResult?.orderCode || 'ZENSTORE')}&accountName=${encodeURIComponent(BANK_INFO.accountName)}`}
                  alt="QR thanh toán"
                  className={styles.doneQrImg}
                />
                <div className={styles.doneQrInfo}>
                  <div><span>Ngân hàng:</span> <strong>{BANK_INFO.bankName}</strong></div>
                  <div><span>Số tài khoản:</span> <strong>{BANK_INFO.accountNo}</strong></div>
                  <div><span>Chủ tài khoản:</span> <strong>{BANK_INFO.accountName}</strong></div>
                  <div><span>Số tiền:</span> <strong style={{ color: '#a8f000' }}>{formatPrice(orderResult?.finalAmount ?? finalTotal)}</strong></div>
                  <div><span>Nội dung:</span> <strong className={styles.transferMemo}>{orderResult?.orderCode || 'ZENSTORE'}</strong></div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <Link to={ROUTES.account}>Xem lịch sử đơn hàng</Link>
            <Link to={ROUTES.products} style={{ background: 'transparent', border: '1px solid #3d4a3b', color: '#c8ee8b' }}>Tiếp tục mua sắm</Link>
          </div>
        </div>
      ) : (
        <div className={styles.layout}>
          <form className={styles.form} onSubmit={submitOrder}>
            <h2>Thông tin giao hàng</h2>
            <div className={styles.field}>
              <label htmlFor="full-name">
                Họ và tên <span style={{ color: '#a8f000' }}>*</span>
              </label>
              <input
                id="full-name"
                name="name"
                autoComplete="name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nguyễn Minh Anh"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="phone">
                Số điện thoại <span style={{ color: '#a8f000' }}>*</span>
              </label>
              <input
                id="phone"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09xx xxx xxx"
              />
            </div>

            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="email">
                Email nhận hóa đơn &amp; thông tin đơn hàng <span style={{ color: '#a8f000' }}>*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="ban@example.com"
              />
            </div>

            {/* Địa chỉ hành chính API v2 (Sau sáp nhập 07/2025): Tỉnh/Thành phố -> Xã/Phường/Thị trấn */}
            <div className={styles.field}>
              <label htmlFor="city">
                Tỉnh / Thành phố <span style={{ color: '#a8f000' }}>*</span>
                {loadingProvinces && <small className={styles.loadingBadge}>Đang tải...</small>}
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="city"
                  name="cityCode"
                  required
                  value={selectedProvinceCode}
                  onChange={handleProvinceChange}
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {provinces.map((prov) => (
                    <option key={prov.code} value={prov.code}>
                      {prov.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="ward">
                Xã / Phường / Thị trấn <span style={{ color: '#a8f000' }}>*</span>
                {loadingWards && <small className={styles.loadingBadge}>Đang tải...</small>}
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="ward"
                  name="wardCode"
                  required
                  disabled={!selectedProvinceCode || loadingWards}
                  value={selectedWardCode}
                  onChange={(e) => setSelectedWardCode(e.target.value)}
                >
                  <option value="">
                    {!selectedProvinceCode
                      ? '-- Chọn Tỉnh/Thành trước --'
                      : loadingWards
                      ? 'Đang tải danh sách xã/phường...'
                      : `-- Chọn Xã / Phường / Thị trấn (${wards.length}) --`}
                  </option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="address">
                Địa chỉ chi tiết (Số nhà, tên đường, ngõ ngách, tòa nhà...) <span style={{ color: '#a8f000' }}>*</span>
              </label>
              <input
                id="address"
                name="address"
                autoComplete="street-address"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Ví dụ: Số 24 ngõ 180, Đường Cầu Giấy"
              />
            </div>

            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="note">Ghi chú giao hàng</label>
              <textarea id="note" name="note" placeholder="Hướng dẫn giao hàng (không bắt buộc)" />
            </div>

            {/* Phương thức thanh toán */}
            <div className={styles.paymentSection}>
              <h3>Phương thức thanh toán</h3>
              <div className={styles.paymentOptions}>
                <label className={`${styles.paymentOption} ${paymentMethod === 'qr' ? styles.paymentOptionActive : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethodRadio"
                    value="qr"
                    checked={paymentMethod === 'qr'}
                    onChange={() => setPaymentMethod('qr')}
                  />
                  <div className={styles.paymentOptionContent}>
                    <div className={styles.paymentOptionTitle}>
                      <span className="fa-solid fa-qrcode" />
                      <strong>Chuyển khoản nhanh qua mã VietQR</strong>
                      <span className={styles.recommendBadge}>Khuyên dùng</span>
                    </div>
                    <p>Quét mã QR bằng mọi ứng dụng ngân hàng hoặc ví điện tử (MB, VCB, Techcombank, MoMo,...)</p>
                  </div>
                </label>

                <label className={`${styles.paymentOption} ${paymentMethod === 'cod' ? styles.paymentOptionActive : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethodRadio"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  <div className={styles.paymentOptionContent}>
                    <div className={styles.paymentOptionTitle}>
                      <span className="fa-solid fa-hand-holding-dollar" />
                      <strong>Thanh toán khi nhận hàng (COD)</strong>
                    </div>
                    <p>Nhận hàng, kiểm tra sản phẩm chính hãng và thanh toán tiền mặt cho nhân viên giao hàng.</p>
                  </div>
                </label>
              </div>

              {/* Khung quét mã QR VietQR */}
              {paymentMethod === 'qr' && (
                <div className={styles.qrBox}>
                  <div className={styles.qrHeader}>
                    <span className="fa-solid fa-bolt" />
                    <span>Quét mã VietQR để thanh toán <b>{formatPrice(finalTotal)}</b></span>
                  </div>
                  <div className={styles.qrContent}>
                    <div className={styles.qrImageWrapper}>
                      <img
                        src={`https://api.vietqr.io/image/${BANK_INFO.bin}-${BANK_INFO.accountNo}-compact2.png?amount=${finalTotal}&addInfo=ZENSTORE%20${encodeURIComponent(customerPhone.trim() || 'ORDER')}&accountName=${encodeURIComponent(BANK_INFO.accountName)}`}
                        alt="Mã QR thanh toán VietQR"
                        className={styles.qrImage}
                      />
                      <small className={styles.qrScanHint}>
                        <i className="fa-solid fa-camera" /> Mở App Ngân hàng &gt; Quét mã
                      </small>
                    </div>
                    <div className={styles.qrDetails}>
                      <div className={styles.qrDetailRow}>
                        <span>Ngân hàng:</span>
                        <strong>{BANK_INFO.bankName}</strong>
                      </div>
                      <div className={styles.qrDetailRow}>
                        <span>Số tài khoản:</span>
                        <strong>{BANK_INFO.accountNo}</strong>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => handleCopy(BANK_INFO.accountNo, 'acc')}
                        >
                          {copiedField === 'acc' ? <><i className="fa-solid fa-check" /> Đã chép</> : <><i className="fa-regular fa-copy" /> Sao chép</>}
                        </button>
                      </div>
                      <div className={styles.qrDetailRow}>
                        <span>Chủ tài khoản:</span>
                        <strong>{BANK_INFO.accountName}</strong>
                      </div>
                      <div className={styles.qrDetailRow}>
                        <span>Số tiền:</span>
                        <strong style={{ color: '#a8f000' }}>{formatPrice(finalTotal)}</strong>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => handleCopy(String(finalTotal), 'amount')}
                        >
                          {copiedField === 'amount' ? <><i className="fa-solid fa-check" /> Đã chép</> : <><i className="fa-regular fa-copy" /> Sao chép</>}
                        </button>
                      </div>
                      <div className={styles.qrDetailRow}>
                        <span>Nội dung chuyển khoản:</span>
                        <strong className={styles.transferMemo}>ZENSTORE {customerPhone.trim() || 'ORDER'}</strong>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => handleCopy(`ZENSTORE ${customerPhone.trim() || 'ORDER'}`, 'memo')}
                        >
                          {copiedField === 'memo' ? <><i className="fa-solid fa-check" /> Đã chép</> : <><i className="fa-regular fa-copy" /> Sao chép</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className={styles.submit} type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> ĐANG XỬ LÝ ĐƠN HÀNG...
                </>
              ) : (
                <>
                  XÁC NHẬN ĐẶT HÀNG <i className="fa-solid fa-arrow-right" />
                </>
              )}
            </button>
          </form>

          <aside className={styles.summary}>
            <h2>Đơn hàng của bạn</h2>

            {items.map((item) => (
              <div className={styles.item} key={item.id}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}

            {/* Khối nhập mã giảm giá */}
            <div className={styles.couponSection}>
              <div className={styles.couponLabel}>
                <i className="fa-solid fa-ticket" />
                <span>MÃ GIẢM GIÁ / ƯU ĐÃI</span>
              </div>

              {!appliedCoupon ? (
                <div>
                  <div className={styles.couponInputRow}>
                    <input
                      className={styles.couponInput}
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        if (couponError) setCouponError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Nhập mã (VD: WELCOME2026)"
                      disabled={couponLoading}
                    />
                    <button
                      className={styles.couponButton}
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'Áp dụng'}
                    </button>
                  </div>

                  {couponError && (
                    <div className={styles.couponError} role="alert">
                      <i className="fa-solid fa-circle-exclamation" />
                      <span>{couponError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.couponAppliedCard}>
                  <div className={styles.couponAppliedInfo}>
                    <i className={`fa-solid fa-tags ${styles.couponAppliedIcon}`} />
                    <div className={styles.couponAppliedText}>
                      <span className={styles.couponAppliedCode}>{appliedCoupon.code}</span>
                      <span className={styles.couponAppliedName}>
                        {appliedCoupon.name} (-{formatPrice(appliedCoupon.discountAmount)})
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.couponRemoveBtn}
                    type="button"
                    onClick={handleRemoveCoupon}
                    title="Gỡ bỏ mã giảm giá"
                  >
                    Gỡ mã
                  </button>
                </div>
              )}
            </div>

            <div className={styles.line}>
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {appliedCoupon && (
              <div className={styles.discountLine}>
                <span>Mã giảm giá ({appliedCoupon.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}

            <div className={styles.line}>
              <span>Giao hàng</span>
              <span>{shippingFee === 0 ? 'Miễn phí' : '30.000đ'}</span>
            </div>

            <div className={styles.total}>
              <span>Tổng thanh toán</span>
              <strong>{formatPrice(finalTotal)}</strong>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default CheckOut;
