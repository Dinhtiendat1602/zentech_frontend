import { useEffect, useMemo, useState } from 'react';
import { adminRequest, formatAdminDate, formatAdminPrice } from '../adminApi.js';

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  completed: 'Đã giao hàng',
  cancelled: 'Đã hủy',
};

const STATUSES = Object.keys(STATUS_LABELS);
const PAYMENT_LABELS = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
};

// Luồng trạng thái một chiều: Đã xác nhận thì không được quay lại Chờ xác nhận
const getNextStatuses = (currentStatus) => {
  switch (currentStatus) {
    case 'pending':
      return ['pending', 'confirmed', 'shipping', 'cancelled'];
    case 'confirmed':
      // Không có 'pending'
      return ['confirmed', 'shipping', 'completed', 'cancelled'];
    case 'shipping':
      // Không có 'pending', 'confirmed'
      return ['shipping', 'completed', 'cancelled'];
    case 'completed':
      // Đã giao hàng: trạng thái cuối
      return ['completed'];
    case 'cancelled':
      // Đã hủy: trạng thái cuối
      return ['cancelled'];
    default:
      return STATUSES.filter((s) => s !== 'pending');
  }
};

function OrderAdmin() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await adminRequest('/orders'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    adminRequest('/orders')
      .then((result) => { if (active) setOrders(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchFilter = filter === 'all' || order.status === filter;
      const searchTarget = `${order.orderCode || ''} ${order.customerName || ''} ${order.customerEmail || ''} ${order.customerPhone || order.phone || ''} ${order.shippingAddress || ''}`.toLowerCase();
      return matchFilter && searchTarget.includes(query.toLowerCase());
    });
  }, [orders, query, filter]);

  const updateOrder = async (order, patch) => {
    setBusy(order.id);
    setError('');
    setNotice('');
    try {
      const updated = await adminRequest(`/orders/${order.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      setOrders((current) => current.map((item) => (item.id === order.id ? updated : item)));
      if (patch.status) {
        setNotice(`Đã cập nhật đơn ${order.orderCode} sang trạng thái "${STATUS_LABELS[patch.status]}".`);
      } else if (patch.paymentStatus) {
        setNotice(`Đã cập nhật thanh toán đơn ${order.orderCode} sang "${PAYMENT_LABELS[patch.paymentStatus]}".`);
      } else {
        setNotice(`Đã cập nhật đơn ${order.orderCode}.`);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="adminContent">
      <div className="adminPageHeading">
        <div>
          <span className="adminEyebrow">BÁN HÀNG / XỬ LÝ GIAO DỊCH</span>
          <h1>Quản lý đơn hàng</h1>
          <p>Quy trình trạng thái một chiều: Đơn đã xác nhận không thể quay lại Chờ xác nhận.</p>
        </div>
        <button className="adminButton" type="button" onClick={loadOrders}>
          <i className="fa-solid fa-rotate" /> Làm mới
        </button>
      </div>

      {error && (
        <p className="adminError" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}
      {notice && (
        <p className="adminNotice" role="status">
          <i className="fa-solid fa-circle-check" /> {notice}
        </p>
      )}

      <section className="adminStats">
        <article className="adminStat">
          <span className="adminStatLabel">Tất cả đơn</span>
          <strong className="adminStatValue">{orders.length}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">Chờ xác nhận</span>
          <strong className="adminStatValue">{orders.filter((item) => item.status === 'pending').length}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">Đang giao hàng</span>
          <strong className="adminStatValue">{orders.filter((item) => item.status === 'shipping').length}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">Đã giao hàng</span>
          <strong className="adminStatValue">{orders.filter((item) => item.status === 'completed').length}</strong>
        </article>
      </section>

      <div className="adminToolbar">
        <label className="adminSearch">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã đơn, tên, email, SĐT, địa chỉ..."
          />
        </label>
        <select
          className="adminSelect"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Lọc đơn hàng"
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <section className="adminPanel">
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>MÃ ĐƠN</th>
                <th>KHÁCH HÀNG</th>
                <th>NGÀY ĐẶT</th>
                <th>THANH TOÁN</th>
                <th>TỔNG TIỀN</th>
                <th>TRẠNG THÁI ĐƠN</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const availableStatuses = getNextStatuses(order.status);
                const isFinalStatus = order.status === 'completed' || order.status === 'cancelled';
                return (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderCode}</strong>
                    </td>
                    <td>
                      {order.customerName}
                      <span className="adminProductMeta">{order.customerEmail}</span>
                    </td>
                    <td>{formatAdminDate(order.created_at || order.createdAt)}</td>
                    <td>
                      <select
                        className="adminSelect"
                        value={order.paymentStatus}
                        disabled={busy === order.id}
                        onChange={(event) => updateOrder(order, { paymentStatus: event.target.value })}
                        aria-label={`Thanh toán đơn ${order.orderCode}`}
                      >
                        {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatAdminPrice(order.finalAmount)}</td>
                    <td>
                      <select
                        className="adminSelect"
                        value={order.status}
                        disabled={busy === order.id || isFinalStatus}
                        onChange={(event) => updateOrder(order, { status: event.target.value })}
                        aria-label={`Trạng thái đơn ${order.orderCode}`}
                      >
                        {availableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p className="adminEmpty">Đang tải đơn hàng...</p>}
          {!loading && !filteredOrders.length && <p className="adminEmpty">Không có đơn hàng phù hợp.</p>}
        </div>
      </section>
    </main>
  );
}

export default OrderAdmin;
