import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MenuPage from './pages/MenuPage';
import DishDetailPage from './pages/DishDetailPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import DishRequestsPage from './pages/DishRequestsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import ChefLoginPage from './pages/chef/ChefLoginPage';
import ChefDashboard from './pages/chef/ChefDashboard';
import ChefMenuPage from './pages/chef/ChefMenuPage';
import ChefOrdersPage from './pages/chef/ChefOrdersPage';
import ChefIngredientsPage from './pages/chef/ChefIngredientsPage';

function App() {
  const { user } = useAuthStore();

  const ProtectedRoute = ({ children, chefOnly = false, customerOnly = false }: { children: React.ReactNode; chefOnly?: boolean; customerOnly?: boolean }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (chefOnly && user.role !== 'CHEF' && user.role !== 'ADMIN') {
      return <Navigate to="/" replace />;
    }

    if (customerOnly && user.role !== 'CUSTOMER') {
      return <Navigate to="/chef" replace />;
    }

    return <>{children}</>;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          
          {/* Chef Login - Public Route */}
          <Route path="chef/login" element={<ChefLoginPage />} />
          <Route path="menu/:id" element={<DishDetailPage />} />
          <Route path="dish-requests" element={<DishRequestsPage />} />
          
          {/* Cart and Checkout - Customer Only */}
          <Route
            path="cart"
            element={
              <ProtectedRoute customerOnly>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="checkout"
            element={
              <ProtectedRoute customerOnly>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId"
            element={
              <ProtectedRoute>
                <OrderConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Chef Routes */}
          <Route
            path="chef"
            element={
              <ProtectedRoute chefOnly>
                <ChefDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="chef/menu"
            element={
              <ProtectedRoute chefOnly>
                <ChefMenuPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="chef/orders"
            element={
              <ProtectedRoute chefOnly>
                <ChefOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="chef/ingredients"
            element={
              <ProtectedRoute chefOnly>
                <ChefIngredientsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

