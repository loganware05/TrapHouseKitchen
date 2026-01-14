import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Menu, ShoppingCart, User, ChefHat, LogOut, FileText, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useEffect } from 'react';

export default function Layout() {
  const location = useLocation();
  const { user, logout, fetchUser } = useAuthStore();
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    if (localStorage.getItem('token') && !user) {
      fetchUser();
    }
  }, []);

  const isChefRoute = location.pathname.startsWith('/chef');

  const navItems = user?.role === 'CHEF' || user?.role === 'ADMIN'
    ? [
        { to: '/chef', icon: ChefHat, label: 'Dashboard' },
        { to: '/chef/menu', icon: Menu, label: 'Menu' },
        { to: '/chef/orders', icon: FileText, label: 'Orders' },
        { to: '/chef/ingredients', icon: Menu, label: 'Ingredients' },
      ]
    : [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/menu', icon: Menu, label: 'Menu' },
        { to: '/dish-requests', icon: MessageSquare, label: 'Requests' },
        { to: '/orders', icon: FileText, label: 'Orders' },
      ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">TrapHouse Kitchen</span>
            </Link>

            <div className="flex items-center space-x-4">
              {/* Only show cart for logged-in customers (not chefs/admins) */}
              {!isChefRoute && user && user.role === 'CUSTOMER' && (
                <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary-600">
                  <ShoppingCart className="h-6 w-6" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>
              )}

              {user ? (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 p-2 text-gray-600 hover:text-primary-600"
                  >
                    <User className="h-6 w-6" />
                    <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="Logout"
                  >
                    <LogOut className="h-6 w-6" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 safe-bottom z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-primary-600' : 'text-gray-600'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200">
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

