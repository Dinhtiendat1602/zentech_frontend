import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
import { authRequest, saveSession } from './authApi.js';
import styles from './Auth.module.css';

function Register() {
	const navigate = useNavigate();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError('');
		setLoading(true);
		const values = Object.fromEntries(new FormData(event.currentTarget).entries());
		try {
			const session = await authRequest('/auth/register', values);
			saveSession(session);
			navigate(ROUTES.account, { replace: true });
		} catch (requestError) {
			setError(requestError.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className={styles.page}>
			<section className={styles.intro}><span className={styles.eyebrow}>TÀI KHOẢN NOVATECH</span><h1>Mọi lựa chọn<br />công nghệ, <em>một nơi.</em></h1><p>Tạo tài khoản để theo dõi đơn hàng, lưu sản phẩm yêu thích và nhận ưu đãi dành riêng cho bạn.</p><div className={styles.benefits}><span><i className="fa-solid fa-box" /> Theo dõi đơn hàng nhanh chóng</span><span><i className="fa-regular fa-heart" /> Lưu sản phẩm bạn quan tâm</span><span><i className="fa-solid fa-tag" /> Nhận ưu đãi riêng từ NovaTech</span><span><i className="fa-solid fa-shield-halved" /> Thông tin luôn được bảo mật</span></div></section>
			<section className={styles.panel}><h2>Tạo tài khoản mới</h2><p>Đăng ký để bắt đầu trải nghiệm.</p><div className={styles.tabs}><Link className={styles.tab} to={ROUTES.login}>Đăng nhập</Link><Link className={`${styles.tab} ${styles.tabActive}`} to={ROUTES.register}>Đăng ký</Link></div>
				<form className={styles.form} onSubmit={handleSubmit}><div className={styles.field}><label htmlFor="register-name">Họ và tên</label><input id="register-name" name="full_name" autoComplete="name" required placeholder="Tên của bạn" /></div><div className={styles.field}><label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" required placeholder="ban@example.com" /></div><div className={styles.field}><label htmlFor="register-password">Mật khẩu</label><input id="register-password" name="password" type="password" autoComplete="new-password" minLength="8" required placeholder="Tối thiểu 8 ký tự" /></div>{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.submit} type="submit" disabled={loading}>{loading ? 'ĐANG TẠO TÀI KHOẢN...' : 'TẠO TÀI KHOẢN'} <i className="fa-solid fa-arrow-right" /></button></form><p className={styles.footnote}>Mật khẩu được mã hóa trước khi lưu trữ.</p>
			</section>
		</main>
	);
}

export default Register;
