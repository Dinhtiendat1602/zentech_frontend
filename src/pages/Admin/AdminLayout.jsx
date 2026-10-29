import { useEffect, useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className={`adminShell${isCollapsed ? ' sidebarCollapsed' : ''}`}>
      <aside className={`adminSidebar${isCollapsed ? ' collapsed' : ''}`}>
        <div className="adminSidebarHeader">
          <NavLink
            className="adminBrand"
            to={ROUTES.admin}
            title={isCollapsed ? 'ZENTECH - Quản trị cửa hàng' : undefined}
          >
            <span className="adminBrandMark">Z</span>
            <span className="adminBrandText">
              ZEN<span>TECH</span>
              <small>QUẢN TRỊ CỬA HÀNG</small>
            </span>
          </NavLink>
          <button
            type="button"
            className="adminCollapseToggle"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Mở rộng menu (Ctrl+B)' : 'Thu gọn menu (Ctrl+B)'}
            aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
          </button>
        </div>

        <p className="adminNavLabel">WORKSPACE</p>

        <nav className="adminNav" aria-label="Điều hướng quản trị">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `adminNavLink${isActive ? ' active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <i className={`fa-solid ${item.icon}`} />
              <span className="adminNavLinkText">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adminSidebarBottom">
          <Link
            to={ROUTES.home}
            className="adminSidebarAction"
            title={isCollapsed ? 'Xem cửa hàng' : undefined}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" />
            <span className="adminBottomText">Xem cửa hàng</span>
          </Link>
          <button
            className="adminThemeButton"
            type="button"
            onClick={toggleTheme}
            aria-label={`Chuyển sang giao diện ${theme === 'dark' ? 'sáng' : 'tối'}`}
            title={isCollapsed ? `Giao diện ${theme === 'dark' ? 'sáng' : 'tối'}` : undefined}
          >
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            <span className="adminBottomText">Giao diện {theme === 'dark' ? 'sáng' : 'tối'}</span>
          </button>
          <button
            type="button"
            className="adminLogoutButton"
            onClick={logOut}
            title={isCollapsed ? 'Đăng xuất' : undefined}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" />
            <span className="adminBottomText">Đăng xuất</span>
          </button>
          <button
            type="button"
            className="adminSidebarCollapseAction"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Mở rộng menu (Ctrl+B)' : 'Thu gọn menu (Ctrl+B)'}
            aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <i className={`fa-solid ${isCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`} />
            <span className="adminBottomText">{isCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
          </button>
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