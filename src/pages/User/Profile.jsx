import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
import { formatPrice, getProductImage } from '../../data/products.js';
import { getValidToken, logout, isTokenExpired } from '../../utils/auth.js';
import { showToast } from '../../context/ToastContext.jsx';
import styles from './Profile.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
const TABS = [
	{ id: 'overview', label: 'Tổng quan', icon: 'fa-grid-2' },
	{ id: 'orders', label: 'Đơn hàng', icon: 'fa-box' },
	{ id: 'wishlist', label: 'Yêu thích', icon: 'fa-heart' },
	{ id: 'promotions', label: 'Mã ưu đãi', icon: 'fa-ticket' },
];

const ORDER_STATUS = {
	pending: 'Chờ xác nhận',
	confirmed: 'Đã xác nhận',
	shipping: 'Đang giao hàng',
	completed: 'Đã giao hàng',
	cancelled: 'Đã hủy',
};

const CANCEL_REASONS = [
	'Thay đổi ý định mua sắm',
	'Muốn đổi sản phẩm hoặc số lượng',
	'Cần cập nhật lại địa chỉ nhận hàng / SĐT',
	'Tìm thấy mức giá hoặc khuyến mãi tốt hơn',
	'Thời gian giao hàng không phù hợp',
	'Khác',
];

function formatDate(value) {
	if (!value) return '—';
	return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
}

async function request(path, token, options = {}) {
	if (!token || isTokenExpired(token)) {
		logout({ expired: true, redirect: true });
		throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
	}
	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			...options.headers,
		},
	});
	if (response.status === 401) {
		logout({ expired: true, redirect: true });
		throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
	}
	let result;
	try {
		result = await response.json();
	} catch {
		throw new Error(response.ok ? 'Phản hồi từ máy chủ không hợp lệ.' : `Yêu cầu thất bại (mã ${response.status}).`);
	}
	if (!response.ok) throw new Error(result?.message || 'Không thể hoàn thành yêu cầu.');
	return result.data;
}

function Profile() {
	const navigate = useNavigate();
	const [token, setToken] = useState(() => getValidToken());
	const [dashboard, setDashboard] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const [loading, setLoading] = useState(true);
	const [refreshingOrders, setRefreshingOrders] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	// Tải dữ liệu dashboard
	const fetchDashboard = useCallback(async (silent = false) => {
		const currentToken = getValidToken();
		if (!currentToken) {
			logout({ expired: true, redirect: true, navigate });
			return;
		}
		if (!silent) setLoading(true);
		try {
			const data = await request('/users/me', currentToken);
			setDashboard(data);
		} catch (requestError) {
			if (/đăng nhập|phiên|hết hạn/i.test(requestError.message)) {
				logout({ expired: true, redirect: true, navigate });
				return;
			}
			if (!silent) setError(requestError.message);
		} finally {
			if (!silent) setLoading(false);
		}
	}, [navigate]);

	// Khởi tạo
	useEffect(() => {
		const currentToken = getValidToken();
		if (!currentToken) {
			logout({ expired: true, redirect: true, navigate });
			return;
		}
		setToken(currentToken);
		fetchDashboard(false);
	}, [fetchDashboard, navigate]);

	// Tự động đồng bộ cập nhật khi chuyển sang tab đơn hàng hoặc khi người dùng quay lại tab trình duyệt
	useEffect(() => {
		if (activeTab === 'orders') {
			fetchDashboard(true);
		}
	}, [activeTab, fetchDashboard]);

	useEffect(() => {
		const handleFocus = () => {
			if (token) {
				fetchDashboard(true);
			}
		};
		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [token, fetchDashboard]);

	const showNotice = (text) => {
		setNotice(text);
		window.setTimeout(() => setNotice(''), 3500);
	};

	// Xử lý làm mới thủ công
	const handleManualRefreshOrders = async () => {
		if (refreshingOrders) return;
		setRefreshingOrders(true);
		try {
			await fetchDashboard(true);
			showNotice('Đã cập nhật trạng thái đơn hàng mới nhất.');
		} finally {
			setRefreshingOrders(false);
		}
	};

	const saveProfile = async (event) => {
		event.preventDefault();
		setSaving(true);
		setError('');
		try {
			const form = new FormData(event.currentTarget);
			const profile = await request('/users/me', token, {
				method: 'PUT',
				body: JSON.stringify({
					full_name: form.get('full_name'),
					phone: form.get('phone'),
					address: form.get('address'),
				}),
			});
			setDashboard((current) => ({ ...current, profile: { ...current.profile, ...profile } }));
			window.localStorage.setItem('novatech-user', JSON.stringify({ ...JSON.parse(window.localStorage.getItem('novatech-user') || '{}'), ...profile }));
			showNotice('Thông tin cá nhân đã được cập nhật.');
		} catch (requestError) {
			setError(requestError.message);
		} finally {
			setSaving(false);
		}
	};

	const removeFavorite = async (slug) => {
		try {
			await request(`/users/me/wishlist/${encodeURIComponent(slug)}`, token, { method: 'DELETE' });
			const removedItem = dashboard?.wishlist?.find((item) => item.id === slug);
			setDashboard((current) => ({ ...current, wishlist: current.wishlist.filter((item) => item.id !== slug) }));
			showNotice('Đã xóa sản phẩm khỏi danh sách yêu thích.');
			showToast({
				type: 'wishlist-remove',
				title: 'Đã bỏ yêu thích',
				product: removedItem
					? { name: removedItem.name, image: getProductImage(removedItem.image, 240) }
					: null,
				message: 'Đã xóa sản phẩm khỏi danh sách yêu thích.',
			});
		} catch (requestError) {
			setError(requestError.message);
		}
	};

	const copyPromotion = async (code) => {
		try {
			await navigator.clipboard.writeText(code);
			showNotice(`Đã sao chép mã ${code}.`);
			showToast({
				type: 'success',
				title: 'ĐÃ SAO CHÉP MÃ',
				message: `Đã sao chép mã ${code} vào bộ nhớ tạm.`,
			});
		} catch {
			showNotice(`Mã ưu đãi: ${code}`);
		}
	};

	const logOut = () => {
		logout({ expired: false, redirect: true, navigate });
	};

	// Review state
	const [reviewTarget, setReviewTarget] = useState(null);
	const [reviewRating, setReviewRating] = useState(5);
	const [reviewHoverRating, setReviewHoverRating] = useState(0);
	const [reviewComment, setReviewComment] = useState('');
	const [reviewSubmitting, setReviewSubmitting] = useState(false);
	const [reviewError, setReviewError] = useState('');

	const openReviewModal = (item, order) => {
		setReviewTarget({ item, order });
		setReviewRating(item.userRating || 5);
		setReviewComment(item.userComment || '');
		setReviewError('');
	};

	const handleReviewSubmit = async (e) => {
		e.preventDefault();
		if (!reviewTarget) return;
		setReviewSubmitting(true);
		setReviewError('');

		try {
			const res = await fetch(`${API_URL}/reviews`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					productId: reviewTarget.item.productId,
					productSlug: reviewTarget.item.productSlug,
					rating: reviewRating,
					comment: reviewComment,
				}),
			});

			let result;
			try {
				result = await res.json();
			} catch {
				throw new Error(res.ok ? 'Phản hồi từ máy chủ không hợp lệ.' : `Yêu cầu gửi đánh giá thất bại (mã ${res.status}).`);
			}
			if (!res.ok || !result.success) {
				throw new Error(result.message || 'Không thể gửi đánh giá.');
			}

			// Cập nhật trạng thái đánh giá trong dashboard orders cục bộ
			setDashboard((curr) => {
				if (!curr) return curr;
				const nextOrders = curr.orders.map((o) => {
					if (o.id !== reviewTarget.order.id) return o;
					return {
						...o,
						items: o.items.map((it) => {
							if (it.productId === reviewTarget.item.productId) {
								return {
									...it,
									reviewed: true,
									userRating: reviewRating,
									userComment: reviewComment,
								};
							}
							return it;
						}),
					};
				});
				return { ...curr, orders: nextOrders };
			});

			showNotice(`Cảm ơn bạn đã đánh giá sản phẩm "${reviewTarget.item.name}"!`);
			setReviewTarget(null);
		} catch (err) {
			setReviewError(err.message);
		} finally {
			setReviewSubmitting(false);
		}
	};

	// Cancel Order state & handler
	const [cancelTarget, setCancelTarget] = useState(null);
	const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
	const [cancelOtherNote, setCancelOtherNote] = useState('');
	const [cancelSubmitting, setCancelSubmitting] = useState(false);
	const [cancelError, setCancelError] = useState('');

	const openCancelModal = (order) => {
		setCancelTarget(order);
		setCancelReason(CANCEL_REASONS[0]);
		setCancelOtherNote('');
		setCancelError('');
	};

	const handleCancelSubmit = async (e) => {
		e.preventDefault();
		if (!cancelTarget) return;
		setCancelSubmitting(true);
		setCancelError('');

		const finalReason = cancelReason === 'Khác' ? (cancelOtherNote.trim() || 'Lý do khác') : cancelReason;

		try {
			const res = await fetch(`${API_URL}/orders/${cancelTarget.id}/cancel`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ reason: finalReason }),
			});

			let result;
			try {
				result = await res.json();
			} catch {
				throw new Error(res.ok ? 'Phản hồi từ máy chủ không hợp lệ.' : `Yêu cầu hủy đơn thất bại (mã ${res.status}).`);
			}
			if (!res.ok || !result.success) {
				throw new Error(result.message || 'Không thể hủy đơn hàng.');
			}

			// Cập nhật state đơn hàng của client
			setDashboard((curr) => {
				if (!curr) return curr;
				const nextOrders = curr.orders.map((o) => {
					if (o.id === cancelTarget.id) {
						return { ...o, status: 'cancelled' };
					}
					return o;
				});
				return { ...curr, orders: nextOrders };
			});

			showNotice(`Đơn hàng #${cancelTarget.order_code} đã được hủy thành công.`);
			setCancelTarget(null);
		} catch (err) {
			setCancelError(err.message);
		} finally {
			setCancelSubmitting(false);
		}
	};

	if (loading) return <main className={styles.loading}>Đang tải hồ sơ của bạn...</main>;
	if (!dashboard) return <main className={styles.loading}><p role="alert">{error || 'Không thể tải hồ sơ.'}</p><Link to={ROUTES.login}>Đăng nhập lại</Link></main>;

	const { profile = {}, orders = [], wishlist = [], promotions = [] } = dashboard;
	const fullName = profile.full_name || profile.fullName || 'Khách hàng';
	const firstName = fullName.trim().split(/\s+/)[0] || 'Khách hàng';
	const avatarInitials = fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'KH';

	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<div>
					<span className={styles.eyebrow}>TÀI KHOẢN ZEN STORE</span>
					<h1>Xin chào, {firstName}</h1>
					<p>Quản lý thông tin và hoạt động mua sắm của bạn.</p>
				</div>
				<button className={styles.logout} type="button" onClick={logOut}>
					<i className="fa-solid fa-arrow-right-from-bracket" /> Đăng xuất
				</button>
			</header>

			{error && (
				<div className={styles.error} role="alert">
					<i className="fa-solid fa-circle-exclamation" /> {error}
					<button type="button" onClick={() => setError('')} aria-label="Đóng">×</button>
				</div>
			)}
			{notice && (
				<div className={styles.notice} role="status">
					<i className="fa-solid fa-circle-check" /> {notice}
				</div>
			)}

			<div className={styles.layout}>
				<aside className={styles.sidebar}>
					<div className={styles.identity}>
						<span className={styles.avatar}>{avatarInitials}</span>
						<span>
							<strong>{fullName}</strong>
							<small>{profile.email}</small>
						</span>
					</div>
					<nav className={styles.nav} aria-label="Khu vực tài khoản">
						{TABS.map((tab) => (
							<button
								className={`${styles.navItem} ${activeTab === tab.id ? styles.navActive : ''}`}
								type="button"
								key={tab.id}
								onClick={() => { setActiveTab(tab.id); setError(''); }}
							>
								<i className={`fa-solid ${tab.icon}`} />
								<span>{tab.label}</span>
								<b>
									{tab.id === 'orders' ? orders.length : tab.id === 'wishlist' ? wishlist.length : tab.id === 'promotions' ? promotions.length : ''}
								</b>
							</button>
						))}
					</nav>
					<div className={styles.memberSince}>
						<i className="fa-regular fa-calendar" />
						<span>Thành viên từ<strong>{formatDate(profile.created_at)}</strong></span>
					</div>
				</aside>

				<section className={styles.content}>
					{activeTab === 'overview' && (
						<>
							<div className={styles.sectionHeading}>
								<div>
									<span className={styles.sectionEyebrow}>TỔNG QUAN TÀI KHOẢN</span>
									<h2>Hoạt động mua sắm</h2>
								</div>
							</div>
							<div className={styles.stats}>
								<button type="button" onClick={() => setActiveTab('orders')}>
									<span className={styles.statIcon}><i className="fa-solid fa-box" /></span>
									<span><small>Đơn hàng</small><strong>{orders.length}</strong></span>
									<i className={`fa-solid fa-arrow-right ${styles.statArrow}`} />
								</button>
								<button type="button" onClick={() => setActiveTab('wishlist')}>
									<span className={styles.statIcon}><i className="fa-solid fa-heart" /></span>
									<span><small>Sản phẩm yêu thích</small><strong>{wishlist.length}</strong></span>
									<i className={`fa-solid fa-arrow-right ${styles.statArrow}`} />
								</button>
								<button type="button" onClick={() => setActiveTab('promotions')}>
									<span className={styles.statIcon}><i className="fa-solid fa-ticket" /></span>
									<span><small>Mã ưu đãi khả dụng</small><strong>{promotions.length}</strong></span>
									<i className={`fa-solid fa-arrow-right ${styles.statArrow}`} />
								</button>
							</div>
							<ProfileForm profile={profile} saving={saving} onSubmit={saveProfile} />
							<OrdersPanel
								orders={orders.slice(0, 3)}
								onViewAll={() => setActiveTab('orders')}
								onOpenReview={openReviewModal}
								onOpenCancel={openCancelModal}
								onRefresh={handleManualRefreshOrders}
								refreshing={refreshingOrders}
							/>
						</>
					)}
					{activeTab === 'orders' && (
						<OrdersPanel
							orders={orders}
							onOpenReview={openReviewModal}
							onOpenCancel={openCancelModal}
							onRefresh={handleManualRefreshOrders}
							refreshing={refreshingOrders}
						/>
					)}
					{activeTab === 'wishlist' && <WishlistPanel items={wishlist} onRemove={removeFavorite} />}
					{activeTab === 'promotions' && <PromotionsPanel items={promotions} onCopy={copyPromotion} />}
				</section>
			</div>

			{/* Review Modal */}
			{reviewTarget && (
				<div className={styles.modalBackdrop} role="presentation" onClick={() => !reviewSubmitting && setReviewTarget(null)}>
					<div className={styles.modalContent} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<div>
								<h3>Đánh giá sản phẩm</h3>
								<p>Chỉ áp dụng cho sản phẩm đã mua và giao thành công</p>
							</div>
							<button type="button" onClick={() => setReviewTarget(null)} disabled={reviewSubmitting} aria-label="Đóng">
								<i className="fa-solid fa-xmark" />
							</button>
						</div>

						<div className={styles.modalProductInfo}>
							<img
								src={getProductImage(reviewTarget.item.productImage || 'photo-1502920917128-1aa500764cbd', 120)}
								alt={reviewTarget.item.name}
								className={styles.modalProductThumb}
							/>
							<div>
								<strong>{reviewTarget.item.name}</strong>
								<small>Mã đơn: #{reviewTarget.order.order_code} · {ORDER_STATUS[reviewTarget.order.status] || 'Đã giao hàng'}</small>
							</div>
						</div>

						<form onSubmit={handleReviewSubmit}>
							<div className={styles.starPicker}>
								<span>Chất lượng sản phẩm:</span>
								<div className={styles.stars}>
									{[1, 2, 3, 4, 5].map((star) => (
										<button
											key={star}
											type="button"
											className={`${styles.starBtn} ${(reviewHoverRating || reviewRating) >= star ? styles.starActive : ''}`}
											onMouseEnter={() => setReviewHoverRating(star)}
											onMouseLeave={() => setReviewHoverRating(0)}
											onClick={() => setReviewRating(star)}
											aria-label={`${star} sao`}
										>
											<i className="fa-solid fa-star" />
										</button>
									))}
									<span className={styles.starLabel}>
										{reviewRating === 5 ? 'Tuyệt vời (5/5)' : reviewRating === 4 ? 'Rất tốt (4/5)' : reviewRating === 3 ? 'Bình thường (3/5)' : reviewRating === 2 ? 'Không hài lòng (2/5)' : 'Rất tệ (1/5)'}
									</span>
								</div>
							</div>

							<div className={styles.reviewCommentField}>
								<label htmlFor="review-comment">Nhận xét chi tiết của bạn:</label>
								<textarea
									id="review-comment"
									value={reviewComment}
									onChange={(e) => setReviewComment(e.target.value)}
									placeholder="Sản phẩm dùng tốt không? Đóng gói như thế nào? Hãy chia sẻ đánh giá thực tế của bạn..."
									rows={4}
								/>
							</div>

							{reviewError && <p className={styles.modalError} role="alert"><i className="fa-solid fa-circle-exclamation" /> {reviewError}</p>}

							<div className={styles.modalActions}>
								<button type="button" onClick={() => setReviewTarget(null)} disabled={reviewSubmitting} className={styles.cancelBtn}>
									Hủy
								</button>
								<button type="submit" disabled={reviewSubmitting} className={styles.submitReviewBtn}>
									{reviewSubmitting ? <><i className="fa-solid fa-spinner fa-spin" /> Đang gửi...</> : (reviewTarget.item.reviewed ? 'Cập nhật đánh giá' : 'Gửi đánh giá')}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Cancel Order Modal */}
			{cancelTarget && (
				<div className={styles.modalBackdrop} role="presentation" onClick={() => !cancelSubmitting && setCancelTarget(null)}>
					<div className={styles.modalContent} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<div>
								<h3>Xác nhận hủy đơn hàng</h3>
								<p>Chỉ có thể hủy khi đơn chưa chuyển sang giai đoạn giao hàng</p>
							</div>
							<button type="button" onClick={() => setCancelTarget(null)} disabled={cancelSubmitting} aria-label="Đóng">
								<i className="fa-solid fa-xmark" />
							</button>
						</div>

						<div className={styles.modalCancelOrderInfo}>
							<div className={styles.modalCancelOrderTop}>
								<span>Mã đơn: <strong>#{cancelTarget.order_code}</strong></span>
								<Status status={cancelTarget.status} />
							</div>
							<div className={styles.modalCancelOrderMeta}>
								<span>Tổng thanh toán: <b>{formatPrice(Number(cancelTarget.final_amount))}</b></span>
								<span>Số lượng món: <b>{(cancelTarget.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)}</b></span>
							</div>
						</div>

						<form onSubmit={handleCancelSubmit}>
							<div className={styles.cancelReasonSection}>
								<label className={styles.cancelSectionLabel}>Lý do bạn muốn hủy đơn:</label>
								<div className={styles.cancelReasonList}>
									{CANCEL_REASONS.map((reason) => (
										<label key={reason} className={styles.cancelRadioItem}>
											<input
												type="radio"
												name="cancel_reason"
												value={reason}
												checked={cancelReason === reason}
												onChange={() => setCancelReason(reason)}
											/>
											<span>{reason}</span>
										</label>
									))}
								</div>
							</div>

							{cancelReason === 'Khác' && (
								<div className={styles.reviewCommentField} style={{ marginTop: 8 }}>
									<label htmlFor="cancel-other-note">Chi tiết lý do khác:</label>
									<textarea
										id="cancel-other-note"
										value={cancelOtherNote}
										onChange={(e) => setCancelOtherNote(e.target.value)}
										placeholder="Nhập lý do bạn muốn hủy đơn hàng..."
										rows={2}
										required
									/>
								</div>
							)}

							<div className={styles.cancelWarningBox}>
								<i className="fa-solid fa-triangle-exclamation" />
								<span>Lưu ý: Sau khi xác nhận hủy, đơn hàng sẽ chuyển sang trạng thái <b>Đã hủy</b> và không thể khôi phục lại.</span>
							</div>

							{cancelError && (
								<p className={styles.modalError} role="alert">
									<i className="fa-solid fa-circle-exclamation" /> {cancelError}
								</p>
							)}

							<div className={styles.modalActions}>
								<button
									type="button"
									onClick={() => setCancelTarget(null)}
									disabled={cancelSubmitting}
									className={styles.cancelBtn}
								>
									Quay lại
								</button>
								<button
									type="submit"
									disabled={cancelSubmitting}
									className={styles.confirmCancelOrderBtn}
								>
									{cancelSubmitting ? (
										<><i className="fa-solid fa-spinner fa-spin" /> Đang xử lý hủy...</>
									) : (
										<><i className="fa-solid fa-ban" /> Xác nhận hủy đơn</>
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</main>
	);
}

function ProfileForm({ profile, saving, onSubmit }) {
	return (
		<section className={styles.panel}>
			<header className={styles.panelHeader}>
				<div>
					<h2>Thông tin cá nhân</h2>
					<p>Cập nhật thông tin dùng cho đơn hàng và liên hệ.</p>
				</div>
				<span className={styles.secure}><i className="fa-solid fa-shield-halved" /> Riêng tư</span>
			</header>
			<form className={styles.form} onSubmit={onSubmit}>
				<label className={styles.field}><span>Họ và tên</span><input name="full_name" defaultValue={profile.full_name} maxLength="150" required /></label>
				<label className={styles.field}><span>Email</span><input value={profile.email} readOnly aria-readonly="true" /><small>Email đăng nhập không thể thay đổi.</small></label>
				<label className={styles.field}><span>Số điện thoại</span><input name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone || ''} maxLength="20" placeholder="Thêm số điện thoại" /></label>
				<label className={`${styles.field} ${styles.fieldWide}`}><span>Địa chỉ</span><input name="address" autoComplete="street-address" defaultValue={profile.address || ''} maxLength="500" placeholder="Thêm địa chỉ nhận hàng" /></label>
				<div className={styles.formActions}>
					<span>Vai trò: {profile.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</span>
					<button className={styles.primaryButton} type="submit" disabled={saving}>
						{saving ? 'ĐANG LƯU...' : 'LƯU THÔNG TIN'}
					</button>
				</div>
			</form>
		</section>
	);
}

function OrdersPanel({ orders = [], onViewAll, onOpenReview, onOpenCancel, onRefresh, refreshing }) {
	const [filter, setFilter] = useState('all');

	const filteredOrders = useMemo(() => {
		return (orders || []).filter((order) => {
			if (filter === 'completed') return order.status === 'completed';
			if (filter === 'active') return ['pending', 'confirmed', 'shipping'].includes(order.status);
			if (filter === 'cancelled') return order.status === 'cancelled';
			return true;
		});
	}, [orders, filter]);

	return (
		<section className={styles.panel}>
			<header className={styles.panelHeader}>
				<div>
					<h2>Lịch sử đơn hàng</h2>
					<p>Theo dõi tiến trình đơn, hủy đơn chưa giao và viết đánh giá sản phẩm.</p>
				</div>
				<div className={styles.panelHeaderActions}>
					{onRefresh && (
						<button
							className={styles.refreshBtn}
							type="button"
							onClick={onRefresh}
							disabled={refreshing}
							title="Làm mới trạng thái đơn hàng"
						>
							<i className={`fa-solid fa-rotate ${refreshing ? 'fa-spin' : ''}`} />
							<span>Làm mới</span>
						</button>
					)}
					{onViewAll && (
						<button className={styles.textButton} type="button" onClick={onViewAll}>
							Xem tất cả <i className="fa-solid fa-arrow-right" />
						</button>
					)}
				</div>
			</header>

			{/* Bộ lọc trạng thái đơn hàng */}
			{!onViewAll && (
				<div className={styles.orderFilterTabs}>
					<button
						type="button"
						className={`${styles.orderFilterTab} ${filter === 'all' ? styles.orderFilterTabActive : ''}`}
						onClick={() => setFilter('all')}
					>
						Tất cả ({orders.length})
					</button>
					<button
						type="button"
						className={`${styles.orderFilterTab} ${filter === 'active' ? styles.orderFilterTabActive : ''}`}
						onClick={() => setFilter('active')}
					>
						Đang xử lý / Giao ({orders.filter((o) => ['pending', 'confirmed', 'shipping'].includes(o.status)).length})
					</button>
					<button
						type="button"
						className={`${styles.orderFilterTab} ${filter === 'completed' ? styles.orderFilterTabActive : ''}`}
						onClick={() => setFilter('completed')}
					>
						<i className="fa-solid fa-circle-check" /> Đã giao hàng ({orders.filter((o) => o.status === 'completed').length})
					</button>
					<button
						type="button"
						className={`${styles.orderFilterTab} ${filter === 'cancelled' ? styles.orderFilterTabActive : ''}`}
						onClick={() => setFilter('cancelled')}
					>
						Đã hủy ({orders.filter((o) => o.status === 'cancelled').length})
					</button>
				</div>
			)}

			{filteredOrders.length ? (
				<div className={styles.orderList}>
					{filteredOrders.map((order) => {
						const canCancel = order.status === 'pending' || order.status === 'confirmed';
						const isShipping = order.status === 'shipping';
						const isCompleted = order.status === 'completed';

						return (
							<article className={styles.order} key={order.id}>
								<div className={styles.orderTop}>
									<div>
										<span className={styles.orderCode}>#{order.order_code}</span>
										<small>Đặt ngày {formatDate(order.created_at)}</small>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<Status status={order.status} />
									</div>
								</div>

								<div className={styles.orderItemList}>
									{(order.items || []).map((item, idx) => (
										<div key={idx} className={styles.orderItemRow}>
											<img
												src={getProductImage(item.productImage, 100)}
												alt={item.name}
												className={styles.orderItemThumb}
												onError={(e) => { e.currentTarget.style.display = 'none'; }}
											/>
											<div className={styles.orderItemInfo}>
												{item.productSlug ? (
													<Link to={`${ROUTES.products}/${item.productSlug}`} className={styles.orderItemName}>
														{item.name}
													</Link>
												) : (
													<span className={styles.orderItemName}>{item.name}</span>
												)}
												<div className={styles.orderItemMeta}>
													<span>Số lượng: <b>×{item.quantity}</b></span>
													<span>·</span>
													<span>Đơn giá: {formatPrice(Number(item.price))}</span>
												</div>
											</div>

											{/* Nút đánh giá: CHỈ HIỂN THỊ KHI ĐƠN HÀNG ĐÃ GIAO HÀNG (completed) */}
											{isCompleted && onOpenReview && (
												<div className={styles.orderItemReview}>
													{item.reviewed ? (
														<button
															type="button"
															className={styles.reviewedBtn}
															onClick={() => onOpenReview(item, order)}
															title="Nhấn để xem hoặc cập nhật đánh giá"
														>
															<i className="fa-solid fa-star" /> Đã đánh giá ({item.userRating}★)
														</button>
													) : (
														<button
															type="button"
															className={styles.reviewBtn}
															onClick={() => onOpenReview(item, order)}
														>
															<i className="fa-regular fa-star" /> Đánh giá sản phẩm
														</button>
													)}
												</div>
											)}
										</div>
									))}
								</div>

								<div className={styles.orderFoot}>
									<span className={styles.orderFootPay}>
										Thanh toán: <b>{order.payment_status === 'paid' ? 'Đã thanh toán' : order.payment_status === 'failed' ? 'Thất bại' : 'Chưa thanh toán'}</b>
										{' '}({order.payment_method === 'bank' ? 'Chuyển khoản QR' : String(order.payment_method || 'COD').toUpperCase()})
									</span>

									<div className={styles.orderFootRight}>
										<strong className={styles.orderTotalAmount}>Tổng tiền: {formatPrice(Number(order.final_amount))}</strong>

										{/* Nút Hủy đơn hàng cho Client: Chỉ khi chưa giao hàng (pending hoặc confirmed) */}
										{canCancel && onOpenCancel && (
											<button
												type="button"
												className={styles.cancelOrderBtn}
												onClick={() => onOpenCancel(order)}
												title="Hủy đơn hàng này khi chưa giao"
											>
												<i className="fa-solid fa-ban" /> Hủy đơn hàng
											</button>
										)}

										{/* Đang giao hàng: KHÔNG CHO HỦY, hiển thị thông báo */}
										{isShipping && (
											<span className={styles.shippingNotice} title="Đơn hàng đang trên đường vận chuyển, không thể hủy đơn">
												<i className="fa-solid fa-truck-fast" /> Đang giao (Không thể hủy)
											</span>
										)}
									</div>
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<EmptyState
					icon="fa-box-open"
					title={filter === 'completed' ? 'Chưa có đơn hàng đã giao' : 'Chưa có đơn hàng phù hợp'}
					text="Khi bạn đặt hàng và đơn hàng được cập nhật, bạn có thể theo dõi tiến trình và hủy đơn chưa giao tại đây."
					href={ROUTES.products}
					action="Khám phá sản phẩm"
				/>
			)}
		</section>
	);
}

function Status({ status }) {
	const label = ORDER_STATUS[status] || status || 'Đang cập nhật';
	let statusClass = styles.statusPending;

	if (status === 'completed') {
		statusClass = styles.statusDone;
	} else if (status === 'shipping') {
		statusClass = styles.statusShipping;
	} else if (status === 'confirmed') {
		statusClass = styles.statusConfirmed;
	} else if (status === 'cancelled') {
		statusClass = styles.statusCancelled;
	}

	return (
		<span className={`${styles.status} ${statusClass}`}>
			<i />
			{label}
		</span>
	);
}

function WishlistPanel({ items, onRemove }) {
	return (
		<section className={styles.panel}>
			<header className={styles.panelHeader}>
				<div>
					<h2>Sản phẩm yêu thích</h2>
					<p>Danh sách thiết bị bạn đã lưu để xem lại.</p>
				</div>
				<span className={styles.count}>{items.length} sản phẩm</span>
			</header>
			{items.length ? (
				<div className={styles.wishlistGrid}>
					{items.map((item) => (
						<article className={styles.favoriteCard} key={item.id}>
							<Link className={styles.favoriteImage} to={`${ROUTES.products}/${item.id}`}>
								<img src={getProductImage(item.image, 420)} alt={item.name} loading="lazy" />
							</Link>
							<div className={styles.favoriteInfo}>
								<span>{item.brand} / {item.category_name || 'Thiết bị ảnh'}</span>
								<Link to={`${ROUTES.products}/${item.id}`}>
									<strong>{item.name}</strong>
								</Link>
								<b>{formatPrice(Number(item.price))}</b>
							</div>
							<button
								className={styles.removeFavorite}
								type="button"
								onClick={() => onRemove(item.id)}
								aria-label={`Bỏ yêu thích ${item.name}`}
								title="Bỏ yêu thích"
							>
								<i className="fa-solid fa-heart-crack" />
							</button>
						</article>
					))}
				</div>
			) : (
				<EmptyState
					icon="fa-heart-crack"
					title="Danh sách yêu thích đang trống"
					text="Lưu máy ảnh hoặc ống kính từ trang sản phẩm, danh sách sẽ hiện ở đây."
					href={ROUTES.products}
					action="Xem sản phẩm"
				/>
			)}
		</section>
	);
}

function PromotionsPanel({ items, onCopy }) {
	return (
		<section className={styles.panel}>
			<header className={styles.panelHeader}>
				<div>
					<h2>Mã giảm giá</h2>
					<p>Các ưu đãi toàn cửa hàng còn thời hạn và lượt sử dụng.</p>
				</div>
				<span className={styles.count}>{items.length} mã khả dụng</span>
			</header>
			{items.length ? (
				<div className={styles.couponList}>
					{items.map((coupon) => (
						<article className={styles.coupon} key={coupon.id}>
							<div className={styles.couponValue}>
								<strong>
									{coupon.discountType === 'percentage' ? `${Number(coupon.discountValue)}%` : formatPrice(Number(coupon.discountValue))}
								</strong>
								<small>{coupon.discountType === 'percentage' ? 'GIẢM GIÁ' : 'GIẢM TRỰC TIẾP'}</small>
							</div>
							<div className={styles.couponInfo}>
								<strong>{coupon.name}</strong>
								<span>
									{coupon.description || (Number(coupon.minOrderAmount) > 0 ? `Đơn tối thiểu ${formatPrice(Number(coupon.minOrderAmount))}` : 'Áp dụng theo điều kiện chương trình')}
								</span>
								{Number(coupon.maxDiscountAmount) > 0 && <small>Giảm tối đa {formatPrice(Number(coupon.maxDiscountAmount))}</small>}
								<small>Hết hạn {formatDate(coupon.endDate)}</small>
							</div>
							<button className={styles.couponCode} type="button" onClick={() => onCopy(coupon.code)}>
								<span>{coupon.code}</span>
								<i className="fa-regular fa-copy" />
							</button>
						</article>
					))}
				</div>
			) : (
				<EmptyState
					icon="fa-ticket"
					title="Chưa có mã ưu đãi khả dụng"
					text="Các chương trình đang hiệu lực sẽ xuất hiện ở đây."
				/>
			)}
		</section>
	);
}

function EmptyState({ icon, title, text, href, action }) {
	return (
		<div className={styles.emptyState}>
			<span><i className={`fa-solid ${icon}`} /></span>
			<h3>{title}</h3>
			<p>{text}</p>
			{href && (
				<Link to={href}>
					{action}<i className="fa-solid fa-arrow-right" />
				</Link>
			)}
		</div>
	);
}

export default Profile;
