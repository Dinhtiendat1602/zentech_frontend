import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
import { authRequest } from './authApi.js';
import styles from './Auth.module.css';

function ForgotPassword() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [pinSent, setPinSent] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setMessage('');
		setError('');
		setLoading(true);
		const values = Object.fromEntries(new FormData(event.currentTarget).entries());
		try {
			if (!pinSent) {
				const result = await authRequest('/auth/forgot-password', { email: values.email });
				setEmail(values.email);
				setPinSent(true);
				setMessage(result.message || 'Mã PIN 6 số đã được gửi đến hộp thư của bạn.');
			} else {
				const result = await authRequest('/auth/reset-password', { email, pin: values.pin, password: values.password });
				setMessage(result.message || 'Đổi mật khẩu thành công! Đang chuyển hướng...');
				setSuccess(true);
				setTimeout(() => {
					navigate(ROUTES.login);
				}, 2000);
			}
		} catch (requestError) {
			setError(requestError.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className={styles.page}>
			<section className={styles.intro}>
				<span className={styles.eyebrow}>HỖ TRỢ TÀI KHOẢN</span>
				<h1>Lấy lại quyền<br /><em>truy cập.</em></h1>
				<p>Nhận mã PIN qua email để đặt lại mật khẩu an toàn.</p>
			</section>
			<section className={styles.panel}>
				<h2>{success ? 'Thành công' : pinSent ? 'Cập nhật mật khẩu' : 'Quên mật khẩu'}</h2>
				<p>
					{success
						? 'Mật khẩu của bạn đã được cập nhật thành công.'
						: pinSent
						? `Nhập mã PIN 6 số đã gửi tới ${email} và mật khẩu mới.`
						: 'Nhập email tài khoản để nhận mã PIN xác thực.'}
				</p>
				<Link className={styles.link} to={ROUTES.login}>← Quay lại đăng nhập</Link>

				{success ? (
					<div style={{ marginTop: '20px' }}>
						<p className={styles.message}>{message}</p>
						<Link className={styles.submit} to={ROUTES.login} style={{ display: 'inline-flex', textDecoration: 'none', justifyContent: 'center', marginTop: '14px' }}>
							ĐĂNG NHẬP NGAY <i className="fa-solid fa-arrow-right" />
						</Link>
					</div>
				) : (
					<form className={styles.form} onSubmit={handleSubmit}>
						<div className={styles.field}>
							<label htmlFor="reset-email">Email</label>
							<input
								id="reset-email"
								name="email"
								type="email"
								autoComplete="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								readOnly={pinSent}
								required
								placeholder="ban@example.com"
							/>
						</div>

						{pinSent && (
							<>
								<div className={styles.field}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<label htmlFor="reset-pin">Mã PIN</label>
										<button
											type="button"
											onClick={() => { setPinSent(false); setMessage(''); setError(''); }}
											style={{ background: 'none', border: 'none', color: 'var(--accent, #9acc33)', cursor: 'pointer', fontSize: '11px', padding: 0 }}
										>
											Đổi email khác
										</button>
									</div>
									<input
										id="reset-pin"
										name="pin"
										inputMode="numeric"
										pattern="[0-9]{6}"
										maxLength="6"
										required
										placeholder="6 chữ số trong email"
									/>
								</div>
								<div className={styles.field}>
									<label htmlFor="reset-password">Mật khẩu mới</label>
									<input
										id="reset-password"
										name="password"
										type="password"
										minLength="8"
										autoComplete="new-password"
										required
										placeholder="Tối thiểu 8 ký tự"
									/>
								</div>
							</>
						)}

						{message && <p className={styles.message} role="status">{message}</p>}
						{error && <p className={styles.error} role="alert">{error}</p>}

						<button className={styles.submit} type="submit" disabled={loading}>
							{loading ? 'ĐANG XỬ LÝ...' : pinSent ? 'CẬP NHẬT MẬT KHẨU' : 'GỬI MÃ PIN'} <i className="fa-solid fa-arrow-right" />
						</button>
					</form>
				)}
				<p className={styles.footnote}>Mã PIN có hiệu lực trong vòng 1 phút.</p>
			</section>
		</main>
	);
}

export default ForgotPassword;
