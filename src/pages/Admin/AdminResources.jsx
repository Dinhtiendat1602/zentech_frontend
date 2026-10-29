import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminRequest, formatAdminDate, formatAdminPrice } from './adminApi.js';
import AdminPagination from './AdminPagination.jsx';

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function AdminResources({ type }) {
  const isCustomers = type === 'customers';
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState('month'); // 'month' (default), 'all', 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRows = useCallback(async (range = dateRange, start = startDate, end = endDate) => {
    setLoading(true); setError('');
    try {
      const endpoint = isCustomers ? '/users' : '/promotions';
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (range === 'all') {
        params.set('range', 'all');
      } else if (range === 'custom') {
        params.set('range', 'custom');
        if (start) params.set('startDate', start);
        if (end) params.set('endDate', end);
      } else {
        params.set('range', 'month');
      }
      setRows(await adminRequest(`${endpoint}?${params.toString()}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [isCustomers, query, dateRange, startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadRows(dateRange, startDate, endDate), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadRows, query, dateRange]);

  useEffect(() => {
    setPage(1);
  }, [query, type, dateRange]);

  const filteredRows = useMemo(() => rows, [rows]);
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);
  const activePromotions = rows.filter((item) => item.isActive && new Date(item.startDate) <= new Date() && new Date(item.endDate) >= new Date() && (item.usageLimit == null || item.usedCount < item.usageLimit)).length;

  const savePromotion = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    const form = new FormData(event.currentTarget);
    const data = {
      code: form.get('code'), name: form.get('name'), description: form.get('description'),
      discountType: form.get('discountType'), discountValue: Number(form.get('discountValue')),
      minOrderAmount: Number(form.get('minOrderAmount') || 0),
      maxDiscountAmount: form.get('maxDiscountAmount') === '' ? null : Number(form.get('maxDiscountAmount')),
      startDate: new Date(form.get('startDate')).toISOString(), endDate: new Date(form.get('endDate')).toISOString(),
      usageLimit: form.get('usageLimit') === '' ? null : Number(form.get('usageLimit')),
      isActive: form.get('isActive') === 'on',
    };
    try {
      await adminRequest(editing ? `/promotions/${editing.id}` : '/promotions', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(data) });
      setModalOpen(false); setNotice(editing ? 'Đã cập nhật mã ưu đãi.' : 'Đã tạo mã ưu đãi.'); await loadRows(dateRange, startDate, endDate);
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  const removePromotion = async (promotion) => {
    if (!window.confirm(`Xóa mã ưu đãi ${promotion.code}?`)) return;
    setError('');
    try { await adminRequest(`/promotions/${promotion.id}`, { method: 'DELETE' }); setNotice('Đã xóa mã ưu đãi.'); await loadRows(dateRange, startDate, endDate); }
    catch (requestError) { setError(requestError.message); }
  };

  const now = new Date();
  const monthLater = new Date(now.getTime() + 30 * 86400000);

  const resourceTitle = isCustomers ? 'khách hàng' : 'mã giảm giá';

  return (
    <main className="adminContent">
      <div className="adminPageHeading">
        <div>
          <span className="adminEyebrow">KHÁCH HÀNG / CHIẾN DỊCH</span>
          <h1>{isCustomers ? 'Khách hàng' : 'Mã giảm giá'}</h1>
          <p>{isCustomers ? 'Mặc định hiển thị khách hàng trong 1 tháng gần nhất. Chọn ngày để xem từ trước.' : 'Mặc định hiển thị mã giảm giá trong 1 tháng gần nhất. Chọn ngày để xem từ trước.'}</p>
        </div>
        {!isCustomers && (
          <button className="adminButton adminButtonPrimary" type="button" onClick={() => { setEditing(null); setError(''); setModalOpen(true); }}>
            <i className="fa-solid fa-plus" /> Tạo mã giảm giá
          </button>
        )}
      </div>

      {error && <p className="adminError" role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</p>}
      {notice && <p className="adminNotice" role="status"><i className="fa-solid fa-circle-check" /> {notice}</p>}

      <section className="adminStats">
        <article className="adminStat">
          <span className="adminStatLabel">{isCustomers ? 'Đang hiển thị' : 'Đang hiển thị'}</span>
          <strong className="adminStatValue">{rows.length}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">{isCustomers ? 'Đã có đơn hàng' : 'Đang áp dụng'}</span>
          <strong className="adminStatValue">{isCustomers ? rows.filter((item) => item.order_count > 0).length : activePromotions}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">{isCustomers ? 'Tổng đơn hàng' : 'Tổng lượt sử dụng'}</span>
          <strong className="adminStatValue">{isCustomers ? rows.reduce((sum, item) => sum + Number(item.order_count), 0) : rows.reduce((sum, item) => sum + Number(item.usedCount || 0), 0)}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">{isCustomers ? 'Doanh thu khách hàng' : 'Đã tắt / hết hạn'}</span>
          <strong className="adminStatValue">{isCustomers ? formatAdminPrice(rows.reduce((sum, item) => sum + Number(item.total_spent), 0)) : rows.filter((item) => !item.isActive || new Date(item.endDate) < new Date()).length}</strong>
        </article>
      </section>

      <div className="adminToolbar">
        <label className="adminSearch">
          <i className="fa-solid fa-magnifying-glass" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isCustomers ? 'Tìm tên hoặc email khách hàng...' : 'Tìm mã hoặc tên chương trình...'} />
        </label>

        <div className="adminDateTabs">
          <button
            type="button"
            className={`adminDateTab ${dateRange === 'month' ? 'active' : ''}`}
            onClick={() => setDateRange('month')}
            title="Chỉ hiển thị dữ liệu trong 30 ngày qua"
          >
            <i className="fa-regular fa-calendar" /> 1 tháng gần nhất
          </button>
          <button
            type="button"
            className={`adminDateTab ${dateRange === 'all' ? 'active' : ''}`}
            onClick={() => setDateRange('all')}
            title="Tải toàn bộ dữ liệu từ trước đến nay"
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
              loadRows('custom', startDate, endDate);
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

        <button className="adminButton" type="button" onClick={() => loadRows(dateRange, startDate, endDate)}>
          <i className="fa-solid fa-rotate" /> Làm mới
        </button>
      </div>

      {dateRange === 'month' && (
        <div className="adminDateNotice">
          <div className="adminDateNoticeLeft">
            <i className="fa-solid fa-circle-info" />
            <span>
              Đang hiển thị {resourceTitle} trong <strong>1 tháng gần nhất</strong> ({rows.length} mục).
            </span>
          </div>
          <button
            type="button"
            className="adminDateActionBtn"
            onClick={() => setDateRange('all')}
          >
            <i className="fa-solid fa-clock-rotate-left" /> Tải tất cả {resourceTitle} từ trước
          </button>
        </div>
      )}

      {dateRange === 'all' && (
        <div className="adminDateNotice allTime">
          <div className="adminDateNoticeLeft">
            <i className="fa-solid fa-check" />
            <span>
              Đang hiển thị <strong>tất cả {resourceTitle} từ trước đến nay</strong> ({rows.length} mục).
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
              Đang lọc {resourceTitle} từ ngày <strong>{formatAdminDate(startDate)}</strong> đến ngày <strong>{formatAdminDate(endDate)}</strong> ({rows.length} mục).
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
              {isCustomers ? (
                <tr>
                  <th>KHÁCH HÀNG</th>
                  <th>NGÀY THAM GIA</th>
                  <th>ĐƠN HÀNG</th>
                  <th>TỔNG CHI TIÊU</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              ) : (
                <tr>
                  <th>MÃ ƯU ĐÃI</th>
                  <th>TÊN CHƯƠNG TRÌNH</th>
                  <th>HÌNH THỨC</th>
                  <th>ĐIỀU KIỆN</th>
                  <th>ĐÃ DÙNG</th>
                  <th>THỜI HẠN</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              )}
            </thead>
            <tbody>
              {paginatedRows.map((row) =>
                isCustomers ? (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.full_name}</strong>
                      <span className="adminProductMeta">{row.email}{row.phone ? ` · ${row.phone}` : ''}</span>
                    </td>
                    <td>{formatAdminDate(row.created_at)}</td>
                    <td>{row.order_count}</td>
                    <td>{formatAdminPrice(row.total_spent)}</td>
                    <td>
                      <span className={`adminStatus ${row.is_active ? '' : 'muted'}`}>
                        {row.is_active ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td><strong>{row.code}</strong></td>
                    <td>{row.name}</td>
                    <td>{row.discountType === 'percentage' ? `${Number(row.discountValue)}%` : formatAdminPrice(row.discountValue)}</td>
                    <td>
                      {Number(row.minOrderAmount) > 0 ? `Đơn từ ${formatAdminPrice(row.minOrderAmount)}` : 'Không yêu cầu tối thiểu'}
                      {row.maxDiscountAmount && <span className="adminProductMeta">Tối đa {formatAdminPrice(row.maxDiscountAmount)}</span>}
                    </td>
                    <td>{row.usedCount}{row.usageLimit ? ` / ${row.usageLimit}` : ''}</td>
                    <td>{formatAdminDate(row.startDate)} – {formatAdminDate(row.endDate)}</td>
                    <td>
                      <span className={`adminStatus ${row.isActive && new Date(row.endDate) >= new Date() ? '' : 'muted'}`}>
                        {row.isActive && new Date(row.endDate) >= new Date() ? 'Đang bật' : 'Đã tắt / hết hạn'}
                      </span>
                    </td>
                    <td>
                      <button className="adminIconButton" type="button" onClick={() => { setEditing(row); setError(''); setModalOpen(true); }} aria-label={`Sửa ${row.code}`} title="Sửa">
                        <i className="fa-solid fa-pen" />
                      </button>{' '}
                      <button className="adminIconButton danger" type="button" onClick={() => removePromotion(row)} aria-label={`Xóa ${row.code}`} title="Xóa">
                        <i className="fa-regular fa-trash-can" />
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {loading && <p className="adminEmpty">Đang tải dữ liệu...</p>}
          {!loading && !filteredRows.length && <p className="adminEmpty">Chưa có dữ liệu phù hợp trong khoảng thời gian này.</p>}
        </div>
        {!loading && filteredRows.length > 0 && (
          <AdminPagination currentPage={page} totalItems={filteredRows.length} pageSize={PAGE_SIZE} onPageChange={setPage} itemName={isCustomers ? 'khách hàng' : 'mã giảm giá'} />
        )}
      </section>

      {modalOpen && !isCustomers && (
        <div className="adminModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
          <section className="adminModal" role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title">
            <header className="adminModalHead">
              <div>
                <h2 id="promotion-modal-title">{editing ? 'Cập nhật mã giảm giá' : 'Tạo mã giảm giá'}</h2>
                <p>Thông tin được lưu trực tiếp vào database.</p>
              </div>
              <button className="adminIconButton" type="button" onClick={() => setModalOpen(false)} aria-label="Đóng">
                <i className="fa-solid fa-xmark" />
              </button>
            </header>
            {error && <p className="adminError" role="alert">{error}</p>}
            <form onSubmit={savePromotion}>
              <div className="adminFormGrid">
                <label className="adminFormField"><span>Mã giảm giá</span><input name="code" defaultValue={editing?.code} maxLength="50" required /></label>
                <label className="adminFormField"><span>Tên chương trình</span><input name="name" defaultValue={editing?.name} maxLength="100" required /></label>
                <label className="adminFormField"><span>Loại giảm giá</span><select name="discountType" defaultValue={editing?.discountType || 'percentage'}><option value="percentage">Phần trăm</option><option value="fixed">Giảm trực tiếp</option></select></label>
                <label className="adminFormField"><span>Giá trị giảm</span><input name="discountValue" type="number" min="0.01" max={editing?.discountType === 'fixed' ? undefined : 100} step="0.01" defaultValue={editing?.discountValue} required /></label>
                <label className="adminFormField"><span>Đơn tối thiểu (VNĐ)</span><input name="minOrderAmount" type="number" min="0" defaultValue={editing?.minOrderAmount ?? 0} required /></label>
                <label className="adminFormField"><span>Giảm tối đa (VNĐ, tùy chọn)</span><input name="maxDiscountAmount" type="number" min="0" defaultValue={editing?.maxDiscountAmount ?? ''} /></label>
                <label className="adminFormField"><span>Bắt đầu</span><input name="startDate" type="datetime-local" defaultValue={dateInput(editing?.startDate) || dateInput(now)} required /></label>
                <label className="adminFormField"><span>Kết thúc</span><input name="endDate" type="datetime-local" defaultValue={dateInput(editing?.endDate) || dateInput(monthLater)} required /></label>
                <label className="adminFormField"><span>Giới hạn lượt dùng</span><input name="usageLimit" type="number" min="1" defaultValue={editing?.usageLimit ?? ''} /></label>
                <label className="adminFormField"><span>Mô tả</span><input name="description" defaultValue={editing?.description || ''} /></label>
                <label className="adminCheckField"><input name="isActive" type="checkbox" defaultChecked={editing ? editing.isActive : true} /> Đang kích hoạt</label>
              </div>
              <div className="adminModalActions">
                <button className="adminButton" type="button" disabled={saving} onClick={() => setModalOpen(false)}>Hủy</button>
                <button className="adminButton adminButtonPrimary" type="submit" disabled={saving}>{saving ? 'ĐANG LƯU...' : 'Lưu mã giảm giá'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default AdminResources;
