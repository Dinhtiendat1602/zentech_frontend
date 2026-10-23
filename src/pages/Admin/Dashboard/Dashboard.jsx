import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes.js';
import { adminRequest, formatAdminDate, formatAdminTime, formatAdminPrice } from '../adminApi.js';

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError('');
    try { setData(await adminRequest('/admin/dashboard')); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    adminRequest('/admin/dashboard')
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const summary = data?.summary || {};
  const revenue = data?.revenue || [];
  const maxRevenue = Math.max(1, ...revenue.map((item) => Number(item.total)));
  const revenueDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return revenue.find((item) => new Date(item.date).toISOString().slice(0, 10) === key) || { date: key, total: 0 };
  });

  return (
    <main className="adminContent">
      <div className="adminPageHeading"><div><span className="adminEyebrow">TỔNG QUAN CỬA HÀNG</span><h1>Chào mừng trở lại</h1><p>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}</p></div><div className="adminHeadingActions"><button className="adminButton" type="button" onClick={load}><i className="fa-solid fa-rotate" /> Làm mới</button><Link className="adminButton adminButtonPrimary" to={`${ROUTES.admin}/products`}><i className="fa-solid fa-plus" /> Thêm sản phẩm</Link></div></div>
      {error && <p className="adminError" role="alert"><i className="fa-solid fa-circle-exclamation" /> {error} <button type="button" onClick={load}>Thử lại</button></p>}
      <section className="adminStats" aria-label="Chỉ số cửa hàng">
        {[["Doanh thu hôm nay", formatAdminPrice(summary.revenue_today), 'Không tính đơn đã hủy', 'fa-arrow-trend-up'], ['Đơn hôm nay', summary.orders_today ?? 0, `${summary.pending_orders ?? 0} đang chờ xử lý`, 'fa-bag-shopping'], ['Sản phẩm', summary.products_total ?? 0, `${summary.low_stock ?? 0} sắp hết hàng`, 'fa-box'], ['Khách hàng', summary.customers_total ?? 0, `${summary.promotions_active ?? 0} mã đang áp dụng`, 'fa-users']].map(([label, value, foot, icon]) => <article className="adminStat" key={label}><div className="adminStatLabel"><span>{label}</span><i className={`adminStatIcon fa-solid ${icon}`} /></div><strong className="adminStatValue">{loading ? '—' : value}</strong><span className="adminStatFoot">{foot}</span></article>)}
      </section>
      <div className="adminGrid2">
        <section className="adminPanel"><header className="adminPanelHeader"><h2>Doanh thu 7 ngày</h2><span className="adminStatFoot">Tổng theo ngày, VNĐ</span></header><div className="adminBars" aria-label="Doanh thu bảy ngày gần nhất">{revenueDays.map((item) => <div className="adminBarColumn" key={item.date} title={formatAdminPrice(item.total)}><div className="adminBar" style={{ height: `${Math.max(4, Number(item.total) / maxRevenue * 100)}%` }} /><span>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(new Date(item.date))}</span></div>)}</div></section>
        <section className="adminPanel"><header className="adminPanelHeader"><h2>Cần theo dõi</h2><Link to={`${ROUTES.admin}/orders`}>Mở đơn hàng <i className="fa-solid fa-arrow-right" /></Link></header><div className="adminTableWrap"><table className="adminTable"><tbody><tr><td><i className="fa-regular fa-clock" /> Đơn chờ xác nhận</td><td><strong>{summary.pending_orders ?? 0}</strong></td></tr><tr><td><i className="fa-solid fa-box-open" /> Sản phẩm sắp hết hàng</td><td><strong>{summary.low_stock ?? 0}</strong></td></tr><tr><td><i className="fa-regular fa-comment-dots" /> Tổng đánh giá</td><td><strong>{data?.reviewsTotal ?? 0}</strong></td></tr></tbody></table></div></section>
      </div>
      <section className="adminPanel adminDashboardRecent"><header className="adminPanelHeader"><h2>Đơn hàng gần đây</h2><Link to={`${ROUTES.admin}/orders`}>Xem tất cả <i className="fa-solid fa-arrow-right" /></Link></header><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>MÃ ĐƠN</th><th>KHÁCH HÀNG</th><th>NGÀY ĐẶT</th><th>TỔNG TIỀN</th><th>TRẠNG THÁI</th></tr></thead><tbody>{(data?.recentOrders || []).map((order) => <tr key={order.id}><td><strong>{order.order_code || order.orderCode}</strong></td><td>{order.customer_name || order.customerName}<span className="adminProductMeta">{order.customer_email || order.customerEmail}</span></td><td><div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><strong style={{ fontSize: '12.5px' }}>{formatAdminDate(order.created_at || order.createdAt)}</strong><span className="adminProductMeta" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}><i className="fa-regular fa-clock" style={{ fontSize: '10px' }} />{formatAdminTime(order.created_at || order.createdAt)}</span></div></td><td>{formatAdminPrice(order.final_amount || order.finalAmount)}</td><td><span className={`adminStatus ${order.status === 'pending' ? 'warning' : order.status === 'cancelled' ? 'muted' : ''}`}>{({ pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao hàng', completed: 'Đã giao hàng', cancelled: 'Đã hủy' })[order.status] || order.status}</span></td></tr>)}</tbody></table>{!loading && !data?.recentOrders?.length && <p className="adminEmpty">Chưa có đơn hàng.</p>}</div></section>
    </main>
  );
}

export default Dashboard;
