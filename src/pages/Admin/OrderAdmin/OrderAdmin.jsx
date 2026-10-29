import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminRequest, formatAdminDate, formatAdminTime, formatAdminPrice } from '../adminApi.js';
import AdminPagination from '../AdminPagination.jsx';

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
  const [dateRange, setDateRange] = useState('month'); // 'month' (default), 'all', 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    shippingFee: 0,
    status: 'pending',
    paymentStatus: 'unpaid',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 20;

  const loadOrders = useCallback(async (range = dateRange, start = startDate, end = endDate) => {
    setLoading(true);
    setError('');
    try {
      let path = '/orders?';
      if (range === 'all') {
        path += 'range=all';
      } else if (range === 'custom') {
        path += `range=custom&startDate=${start}&endDate=${end}`;
      } else {
        path += 'range=month';
      }
      setOrders(await adminRequest(path));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, startDate, endDate]);

  useEffect(() => {
    loadOrders(dateRange, startDate, endDate);
  }, [dateRange, loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchFilter = filter === 'all' || order.status === filter;
      const searchTarget = `${order.orderCode || ''} ${order.customerName || ''} ${order.customerEmail || ''} ${order.customerPhone || order.phone || ''} ${order.shippingAddress || ''} ${order.customerAddress || ''}`.toLowerCase();
      return matchFilter && searchTarget.includes(query.toLowerCase());
    });
  }, [orders, query, filter]);

  useEffect(() => {
    setPage(1);
  }, [query, filter, dateRange]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

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

  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditForm({
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || order.phone || '',
      customerEmail: order.customerEmail || '',
      customerAddress: order.customerAddress || order.shippingAddress || '',
      shippingFee: order.shippingFee || 0,
      status: order.status || 'pending',
      paymentStatus: order.paymentStatus || 'unpaid',
      note: order.note || '',
    });
  };

  const saveOrderEdit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        customerName: editForm.customerName.trim(),
        customerPhone: editForm.customerPhone.trim(),
        customerEmail: editForm.customerEmail.trim(),
        customerAddress: editForm.customerAddress.trim(),
        status: editForm.status,
        paymentStatus: editForm.paymentStatus,
        shippingFee: Number(editForm.shippingFee) || 0,
        note: editForm.note.trim() || null,
      };
      const updated = await adminRequest(`/orders/${editingOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setOrders((current) => current.map((item) => (item.id === editingOrder.id ? updated : item)));
      setNotice(`Đã lưu thay đổi cho đơn hàng ${editingOrder.orderCode}.`);
      if (viewingOrder && viewingOrder.id === editingOrder.id) {
        setViewingOrder(updated);
      }
      setEditingOrder(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="adminContent">
      <div className="adminPageHeading">
        <div>
          <span className="adminEyebrow">BÁN HÀNG / XỬ LÝ GIAO DỊCH</span>
          <h1>Quản lý đơn hàng</h1>
          <p>Mặc định hiển thị đơn hàng 1 tháng gần nhất. Chọn ngày hoặc tất cả để tải đơn từ trước.</p>
        </div>
        <button className="adminButton" type="button" onClick={() => loadOrders(dateRange, startDate, endDate)}>
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
          <span className="adminStatLabel">Đơn đang hiển thị</span>
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

        <div className="adminDateTabs">
          <button
            type="button"
            className={`adminDateTab ${dateRange === 'month' ? 'active' : ''}`}
            onClick={() => setDateRange('month')}
            title="Chỉ hiển thị đơn hàng trong 30 ngày qua"
          >
            <i className="fa-regular fa-calendar" /> 1 tháng gần nhất
          </button>
          <button
            type="button"
            className={`adminDateTab ${dateRange === 'all' ? 'active' : ''}`}
            onClick={() => setDateRange('all')}
            title="Tải toàn bộ đơn hàng từ trước đến nay"
          >
            <i className="fa-solid fa-clock-rotate-left" /> Tất cả thời gian
          </button>
          <button
            type="button"
            className={`adminDateTab ${dateRange === 'custom' ? 'active' : ''}`}
            onClick={() => setDateRange('custom')}
            title="Chọn khoảng ngày cụ thể"
          >
            <i className="fa-solid fa-calendar-days" /> Chọn ngày
          </button>
        </div>

        {dateRange === 'custom' && (
          <form
            className="adminCustomDateForm"
            onSubmit={(e) => {
              e.preventDefault();
              loadOrders('custom', startDate, endDate);
            }}
          >
            <label className="adminDateInputLabel">
              <span>Từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="adminDateInputLabel">
              <span>Đến:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <button className="adminButton adminButtonPrimary" type="submit">
              Lọc ngày
            </button>
          </form>
        )}
      </div>

      {dateRange === 'month' && (
        <div className="adminDateNotice">
          <div className="adminDateNoticeLeft">
            <i className="fa-solid fa-circle-info" />
            <span>
              Đang hiển thị đơn hàng trong <strong>1 tháng gần nhất</strong> ({orders.length} đơn).
            </span>
          </div>
          <button
            type="button"
            className="adminDateActionBtn"
            onClick={() => setDateRange('all')}
          >
            <i className="fa-solid fa-clock-rotate-left" /> Tải tất cả đơn hàng từ trước
          </button>
        </div>
      )}

      {dateRange === 'all' && (
        <div className="adminDateNotice allTime">
          <div className="adminDateNoticeLeft">
            <i className="fa-solid fa-check" />
            <span>
              Đang hiển thị <strong>tất cả đơn hàng từ trước đến nay</strong> ({orders.length} đơn).
            </span>
          </div>
          <button
            type="button"
            className="adminDateActionBtn"
            onClick={() => setDateRange('month')}
          >
            <i className="fa-regular fa-calendar" /> Về 1 tháng gần nhất
          </button>
        </div>
      )}

      {dateRange === 'custom' && (
        <div className="adminDateNotice custom">
          <div className="adminDateNoticeLeft">
            <i className="fa-solid fa-calendar-check" />
            <span>
              Đang lọc đơn hàng từ ngày <strong>{formatAdminDate(startDate)}</strong> đến ngày <strong>{formatAdminDate(endDate)}</strong> ({orders.length} đơn).
            </span>
          </div>
          <button
            type="button"
            className="adminDateActionBtn"
            onClick={() => setDateRange('month')}
          >
            <i className="fa-regular fa-calendar" /> Về 1 tháng gần nhất
          </button>
        </div>
      )}

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
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
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
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ fontSize: '13px' }}>
                          {formatAdminDate(order.createdAt || order.created_at)}
                        </strong>
                        <span
                          className="adminProductMeta"
                          style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="fa-regular fa-clock" style={{ fontSize: '10px' }} />
                          {formatAdminTime(order.createdAt || order.created_at)}
                        </span>
                      </div>
                    </td>
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
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="adminIconButton"
                          type="button"
                          onClick={() => setViewingOrder(order)}
                          title="Xem chi tiết đơn hàng"
                          aria-label={`Xem chi tiết đơn ${order.orderCode}`}
                        >
                          <i className="fa-regular fa-eye" />
                        </button>
                        <button
                          className="adminIconButton"
                          type="button"
                          onClick={() => openEditModal(order)}
                          title="Chỉnh sửa đơn hàng"
                          aria-label={`Chỉnh sửa đơn ${order.orderCode}`}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p className="adminEmpty">Đang tải đơn hàng...</p>}
          {!loading && !filteredOrders.length && <p className="adminEmpty">Không có đơn hàng phù hợp.</p>}
        </div>

        {!loading && filteredOrders.length > 0 && (
          <AdminPagination
            currentPage={page}
            totalItems={filteredOrders.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemName="đơn hàng"
          />
        )}
      </section>

      {/* Modal: Xem chi tiết đơn hàng */}
      {viewingOrder && (
        <div
          className="adminModalBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingOrder(null);
          }}
        >
          <section
            className="adminModal adminModalLg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-title"
          >
            <header className="adminModalHead">
              <div>
                <h2 id="order-detail-title">
                  Chi tiết đơn hàng #{viewingOrder.orderCode}
                </h2>
                <p>
                  Ngày đặt:{' '}
                  {formatAdminDate(viewingOrder.createdAt || viewingOrder.created_at)} lúc{' '}
                  {formatAdminTime(viewingOrder.createdAt || viewingOrder.created_at)}
                </p>
              </div>
              <button
                className="adminIconButton"
                type="button"
                onClick={() => setViewingOrder(null)}
                aria-label="Đóng"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            <div className="adminDetailGrid">
              <div className="adminDetailCard">
                <div className="adminDetailCardTitle">
                  <i className="fa-solid fa-user" /> Thông tin người nhận
                </div>
                <div className="adminDetailItem">
                  <strong>Khách hàng:</strong> {viewingOrder.customerName || 'Không có tên'}
                </div>
                <div className="adminDetailItem">
                  <strong>Số điện thoại:</strong> {viewingOrder.customerPhone || viewingOrder.phone || 'Chưa cập nhật'}
                </div>
                <div className="adminDetailItem">
                  <strong>Email:</strong> {viewingOrder.customerEmail || 'Chưa cập nhật'}
                </div>
                <div className="adminDetailItem">
                  <strong>Địa chỉ nhận:</strong> {viewingOrder.customerAddress || viewingOrder.shippingAddress || 'Chưa cập nhật'}
                </div>
                {viewingOrder.note && (
                  <div className="adminDetailItem">
                    <strong>Ghi chú:</strong> {viewingOrder.note}
                  </div>
                )}
              </div>

              <div className="adminDetailCard">
                <div className="adminDetailCardTitle">
                  <i className="fa-solid fa-credit-card" /> Trạng thái & Thanh toán
                </div>
                <div className="adminDetailItem">
                  <strong>Trạng thái:</strong>{' '}
                  <span className={`adminStatusPill ${viewingOrder.status}`}>
                    {STATUS_LABELS[viewingOrder.status] || viewingOrder.status}
                  </span>
                </div>
                <div className="adminDetailItem">
                  <strong>Thanh toán:</strong>{' '}
                  <span className={`adminStatusPill ${viewingOrder.paymentStatus}`}>
                    {PAYMENT_LABELS[viewingOrder.paymentStatus] || viewingOrder.paymentStatus}
                  </span>
                </div>
                <div className="adminDetailItem">
                  <strong>Phương thức:</strong>{' '}
                  {['bank', 'banking_qr', 'qr'].includes(viewingOrder.paymentMethod)
                    ? 'Chuyển khoản ngân hàng (QR)'
                    : 'Thanh toán khi nhận hàng (COD)'}
                </div>
                <div className="adminDetailItem">
                  <strong>Mã giảm giá:</strong>{' '}
                  {viewingOrder.promotion ? (
                    <span style={{ color: '#a8f000', fontWeight: 'bold' }}>
                      {viewingOrder.promotion.code} ({viewingOrder.promotion.name})
                    </span>
                  ) : (
                    'Không áp dụng'
                  )}
                </div>
              </div>
            </div>

            <div className="adminDetailCardTitle" style={{ marginTop: '10px' }}>
              <i className="fa-solid fa-box-open" /> Danh sách sản phẩm ({(viewingOrder.orderItems || []).length})
            </div>
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table className="adminOrderItemsTable">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'center' }}>Số lượng</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingOrder.orderItems && viewingOrder.orderItems.length > 0) ? (
                    viewingOrder.orderItems.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.product?.thumbnail ? (
                              <img
                                src={item.product.thumbnail}
                                alt={item.productName || 'Sản phẩm'}
                                className="adminItemThumb"
                              />
                            ) : (
                              <div className="adminItemThumb">
                                <i className="fa-solid fa-camera" style={{ opacity: 0.5 }} />
                              </div>
                            )}
                            <div>
                              <strong style={{ display: 'block', fontSize: '12px' }}>
                                {item.productName || item.product?.name || 'Sản phẩm'}
                              </strong>
                              {item.productId && (
                                <span className="adminProductMeta" style={{ fontSize: '10px' }}>
                                  ID: #{item.productId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatAdminPrice(item.price)}</td>
                        <td style={{ textAlign: 'center' }}>x{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatAdminPrice(item.total || Number(item.price) * Number(item.quantity))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#888' }}>
                        Không có chi tiết sản phẩm nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="adminOrderSummaryBox">
              <div className="adminSummaryRow">
                <span>Tạm tính tiền hàng:</span>
                <span>{formatAdminPrice(viewingOrder.totalAmount)}</span>
              </div>
              <div className="adminSummaryRow">
                <span>Phí vận chuyển:</span>
                <span>+{formatAdminPrice(viewingOrder.shippingFee || 0)}</span>
              </div>
              {Number(viewingOrder.discountAmount) > 0 && (
                <div className="adminSummaryRow" style={{ color: '#ff6b6b' }}>
                  <span>Giảm giá khuyến mãi:</span>
                  <span>-{formatAdminPrice(viewingOrder.discountAmount)}</span>
                </div>
              )}
              <div className="adminSummaryRow total">
                <span>TỔNG THANH TOÁN:</span>
                <span style={{ fontSize: '15px' }}>{formatAdminPrice(viewingOrder.finalAmount)}</span>
              </div>
            </div>

            <div className="adminModalActions" style={{ marginTop: '20px' }}>
              <button
                className="adminButton adminButtonPrimary"
                type="button"
                onClick={() => {
                  const target = viewingOrder;
                  setViewingOrder(null);
                  openEditModal(target);
                }}
              >
                <i className="fa-solid fa-pen" /> Chỉnh sửa đơn này
              </button>
              <button
                className="adminButton"
                type="button"
                onClick={() => setViewingOrder(null)}
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal: Chỉnh sửa đơn hàng */}
      {editingOrder && (
        <div
          className="adminModalBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setEditingOrder(null);
          }}
        >
          <section
            className="adminModal adminModalLg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-edit-title"
          >
            <header className="adminModalHead">
              <div>
                <h2 id="order-edit-title">
                  Chỉnh sửa đơn hàng #{editingOrder.orderCode}
                </h2>
                <p>Cập nhật thông tin giao nhận, trạng thái xử lý và chi phí đơn hàng.</p>
              </div>
              <button
                className="adminIconButton"
                type="button"
                onClick={() => setEditingOrder(null)}
                disabled={saving}
                aria-label="Đóng"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            <form onSubmit={saveOrderEdit}>
              <div className="adminFormGrid">
                <label className="adminFormField">
                  <span>Họ và tên người nhận</span>
                  <input
                    value={editForm.customerName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, customerName: e.target.value }))}
                    required
                  />
                </label>
                <label className="adminFormField">
                  <span>Số điện thoại</span>
                  <input
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                    required
                  />
                </label>
                <label className="adminFormField">
                  <span>Email người nhận</span>
                  <input
                    type="email"
                    value={editForm.customerEmail}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    required
                  />
                </label>
                <label className="adminFormField">
                  <span>Phí vận chuyển (VNĐ)</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editForm.shippingFee}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, shippingFee: e.target.value }))}
                    required
                  />
                </label>
                <label className="adminFormField wide">
                  <span>Địa chỉ giao hàng</span>
                  <textarea
                    rows="2"
                    value={editForm.customerAddress}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, customerAddress: e.target.value }))}
                    required
                  />
                </label>
                <label className="adminFormField">
                  <span>Trạng thái đơn hàng</span>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    disabled={editingOrder.status === 'completed'}
                  >
                    {getNextStatuses(editingOrder.status).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adminFormField">
                  <span>Trạng thái thanh toán</span>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                  >
                    {Object.entries(PAYMENT_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adminFormField wide">
                  <span>Ghi chú đơn hàng</span>
                  <textarea
                    rows="2"
                    value={editForm.note}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Ghi chú nội bộ hoặc yêu cầu của khách hàng..."
                  />
                </label>
              </div>

              <div className="adminOrderSummaryBox" style={{ marginTop: '16px' }}>
                <div className="adminSummaryRow">
                  <span>Tạm tính tiền hàng:</span>
                  <span>{formatAdminPrice(editingOrder.totalAmount)}</span>
                </div>
                <div className="adminSummaryRow">
                  <span>Phí ship điều chỉnh:</span>
                  <span>+{formatAdminPrice(Number(editForm.shippingFee) || 0)}</span>
                </div>
                {Number(editingOrder.discountAmount) > 0 && (
                  <div className="adminSummaryRow" style={{ color: '#ff6b6b' }}>
                    <span>Giảm giá khuyến mãi:</span>
                    <span>-{formatAdminPrice(editingOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="adminSummaryRow total">
                  <span>TỔNG THANH TOÁN DỰ KIẾN:</span>
                  <span style={{ fontSize: '15px' }}>
                    {formatAdminPrice(
                      Math.max(
                        0,
                        Number(editingOrder.totalAmount || 0) +
                          Number(editForm.shippingFee || 0) -
                          Number(editingOrder.discountAmount || 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="adminModalActions" style={{ marginTop: '20px' }}>
                <button
                  className="adminButton"
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingOrder(null)}
                >
                  Hủy
                </button>
                <button
                  className="adminButton adminButtonPrimary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check" /> Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default OrderAdmin;
