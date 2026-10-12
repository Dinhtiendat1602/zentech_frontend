import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
import { authRequest, saveSession } from './authApi.js';
import styles from './Auth.module.css';

function Login() {
	const navigate = useNavigate();
	const location = useLocation();
	const isExpired = location.state?.sessionExpired || new URLSearchParams(location.search).get('expired') === '1';
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError('');
		setLoading(true);
		const values = Object.fromEntries(new FormData(event.currentTarget).entries());
		try {
			const session = await authRequest('/auth/login', values);
			saveSession(session);
			navigate(session.user.role === 'admin' ? ROUTES.home : ROUTES.account, { replace: true });
		} catch (requestError) {
			setError(requestError.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className={styles.page}>
			<section className={styles.intro}><span className={styles.eyebrow}>TÀI KHOẢN NOVATECH</span><h1>Mọi lựa chọn<br />công nghệ, <em>một nơi.</em></h1><p>Đăng nhập để theo dõi đơn hàng, lưu sản phẩm yêu thích và nhận ưu đãi dành riêng cho bạn.</p><div className={styles.benefits}><span><i className="fa-solid fa-box" /> Theo dõi đơn hàng nhanh chóng</span><span><i className="fa-regular fa-heart" /> Lưu sản phẩm bạn quan tâm</span><span><i className="fa-solid fa-tag" /> Nhận ưu đãi riêng từ NovaTech</span><span><i className="fa-solid fa-shield-halved" /> Thông tin luôn được bảo mật</span></div></section>
			<section className={styles.panel}><h2>Chào mừng trở lại</h2><p>Đăng nhập để tiếp tục mua sắm.</p><div className={styles.tabs}><Link className={`${styles.tab} ${styles.tabActive}`} to={ROUTES.login}>Đăng nhập</Link><Link className={styles.tab} to={ROUTES.register}>Đăng ký</Link></div>
				{isExpired && !error && (
					<div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
						<i className="fa-solid fa-circle-exclamation" />
						<span>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</span>
					</div>
				)}
				<form className={styles.form} onSubmit={handleSubmit}><div className={styles.field}><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" autoComplete="email" required placeholder="ban@example.com" /></div><div className={styles.field}><label htmlFor="login-password">Mật khẩu</label><input id="login-password" name="password" type="password" autoComplete="current-password" required placeholder="Mật khẩu của bạn" /></div>{error && <p className={styles.error} role="alert">{error}</p>}<Link className={`${styles.link} ${styles.linkRight}`} to={ROUTES.forgotPassword}>Quên mật khẩu?</Link><button className={styles.submit} type="submit" disabled={loading}>{loading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'} <i className="fa-solid fa-arrow-right" /></button></form><p className={styles.footnote}>Mật khẩu được mã hóa trước khi lưu trữ.</p>
			</section>
		</main>
	);
}

export default Login;
