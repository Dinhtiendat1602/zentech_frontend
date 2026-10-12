import { Route, Routes } from 'react-router-dom';
import Cart from '../pages/Client/Cart/Cart.jsx';
import CheckOut from '../pages/Client/CheckOut/CheckOut.jsx';
import Home from '../pages/Client/Home/Home.jsx';
import ProductDetail from '../pages/Client/ProductDetail/ProductDetail.jsx';
import ProductList from '../pages/Client/ProductList/ProductList.jsx';
import Login from '../pages/Auth/Login.jsx';
import Register from '../pages/Auth/Register.jsx';
import ForgotPassword from '../pages/Auth/ForgotPassword.jsx';
import Profile from '../pages/User/Profile.jsx';
import AdminLayout from '../pages/Admin/AdminLayout.jsx';
import Dashboard from '../pages/Admin/Dashboard/Dashboard.jsx';
import ProductAdmin from '../pages/Admin/ProductAdmin/ProductAdmin.jsx';
import OrderAdmin from '../pages/Admin/OrderAdmin/OrderAdmin.jsx';
import AdminResources from '../pages/Admin/AdminResources.jsx';
import LiveChatAdmin from '../pages/Admin/LiveChatAdmin/LiveChatAdmin.jsx';
import { ROUTES } from '../constants/routes.js';

function AppRoutes() {
	return (
		<Routes>
			{/* client */}
			<Route path={ROUTES.home} element={<Home />} />
			<Route path={ROUTES.products} element={<ProductList />} />
			<Route path={ROUTES.productDetail} element={<ProductDetail />} />
			<Route path={ROUTES.cart} element={<Cart />} />
			<Route path={ROUTES.checkout} element={<CheckOut />} />
			{/* auth */}
			<Route path={ROUTES.login} element={<Login />} />
			<Route path={ROUTES.register} element={<Register />} />
			<Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
			<Route path={ROUTES.account} element={<Profile />} />
			{/* admin */}
			<Route path={ROUTES.admin} element={<AdminLayout />}>
				<Route index element={<Dashboard />} />
				<Route path="products" element={<ProductAdmin />} />
				<Route path="orders" element={<OrderAdmin />} />
				<Route path="chat" element={<LiveChatAdmin />} />
				<Route path="customers" element={<AdminResources type="customers" />} />
				<Route path="promotions" element={<AdminResources type="promotions" />} />
			</Route>
			<Route path="*" element={<Home />} />
		</Routes>
	);
}

export default AppRoutes;
