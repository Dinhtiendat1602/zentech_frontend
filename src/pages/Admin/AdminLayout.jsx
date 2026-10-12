import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
import { useTheme } from '../../context/useTheme.js';
import { getValidToken, getCurrentUser, logout } from '../../utils/auth.js';
import './Admin.css';

const navigation = [
  { to: ROUTES.admin, label: 'Tổng quan', icon: 'fa-chart-pie', end: true },
  { to: ROUTES.adminProducts, label: 'Sản phẩm', icon: 'fa-box' },
  { to: ROUTES.adminOrders, label: 'Đơn hàng', icon: 'fa-receipt' },
  { to: ROUTES.adminChat, label: 'Chat hỗ trợ', icon: 'fa-comments' },
  { to: ROUTES.adminCustomers, label: 'Khách hàng', icon: 'fa-users' },
  { to: ROUTES.adminPromotions, label: 'Mã giảm giá', icon: 'fa-ticket' },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const verifyAdmin = () => {
      const token = getValidToken();
      const user = getCurrentUser();
      if (!token || user?.role !== 'admin') {
        logout({ expired: true, redirect: true, navigate });
      }
    };

    verifyAdmin();

    const interval = setInterval(verifyAdmin, 5000);
    const handleFocus = () => verifyAdmin();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [navigate]);

  const logOut = () => {
    logout({ expired: false, redirect: true, navigate });
  };

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <NavLink className="adminBrand" to={ROUTES.admin}><span className="adminBrandMark">Z</span><span>ZEN<span>TECH</span><small>QUẢN TRỊ CỬA HÀNG</small></span></NavLink>
        <p className="adminNavLabel">WORKSPACE</p>
        <nav className="adminNav" aria-label="Điều hướng quản trị">
          {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `adminNavLink${isActive ? ' active' : ''}`}><i className={`fa-solid ${item.icon}`} /><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="adminSidebarBottom">
          <Link to={ROUTES.home} className="adminSidebarAction"><i className="fa-solid fa-arrow-up-right-from-square" /> Xem cửa hàng</Link>
          <button className="adminThemeButton" type="button" onClick={toggleTheme} aria-label={`Chuyển sang giao diện ${theme === 'dark' ? 'sáng' : 'tối'}`}><i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} /> Giao diện {theme === 'dark' ? 'sáng' : 'tối'}</button>
          <button type="button" onClick={logOut}><i className="fa-solid fa-arrow-right-from-bracket" /> Đăng xuất</button>
        </div>
      </aside>
      <div className="adminMain">
        {/* <header className="adminTopbar"><div><span className="adminCrumb">ZEN TECH / QUẢN TRỊ</span></div><div className="adminTopActions"><span className="adminTopName">{adminUser.full_name || 'Quản trị viên'}</span><span className="adminAvatar">{(adminUser.full_name || 'AD').split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span></div></header> */}
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;