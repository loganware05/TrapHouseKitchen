import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  Receipt,
  User,
  ChefHat,
  LogOut,
  FileText,
  Star,
  MessageSquare,
  Menu,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';
import { useEffect, useRef } from 'react';
import CheckoutSheet from './CheckoutSheet';
import { flushAnalytics, initAnalyticsFlushListeners } from '../stores/analyticsStore';

function pathMatchesNav(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/' || pathname === '/home';
  }
  if (to === '/menu') {
    return pathname === '/menu' || pathname.startsWith('/menu/');
  }
  if (to === '/orders') {
    return pathname.startsWith('/orders');
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function Layout() {
  const location = useLocation();
  const { user, logout, fetchUser } = useAuthStore();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const openCheckout = useCheckoutSheetStore((s) => s.open);
  const analyticsReady = useRef(false);

  useEffect(() => {
    if (localStorage.getItem('token') && !user) {
      fetchUser();
    }
  }, []);

  useEffect(() => {
    if (analyticsReady.current) return;
    analyticsReady.current = true;
    initAnalyticsFlushListeners();
  }, []);

  useEffect(() => {
    void flushAnalytics();
  }, [location.pathname]);

  const isChefRoute = location.pathname.startsWith('/chef');

  const customerNav = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/menu', icon: LayoutGrid, label: 'Menu' },
    { to: '/orders', icon: Receipt, label: 'Orders' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const chefNav = [
    { to: '/chef', icon: ChefHat, label: 'Dashboard' },
    { to: '/chef/menu', icon: Menu, label: 'Menu' },
    { to: '/chef/orders', icon: FileText, label: 'Orders' },
    { to: '/chef/reviews', icon: Star, label: 'Reviews' },
    { to: '/chef/requests', icon: MessageSquare, label: 'Requests' },
  ];

  const navItems = user?.role === 'CHEF' || user?.role === 'ADMIN' ? chefNav : customerNav;

  const showCustomerFab =
    !isChefRoute && user?.role === 'CUSTOMER' && totalItems > 0;

  return (
    <div className="min-h-screen bg-th-surface flex flex-col">
      <header className="bg-white border-b border-th-border sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            <Link to={isChefRoute ? '/chef' : '/'} className="flex items-center gap-2 min-w-0">
              <ChefHat className="h-7 w-7 md:h-8 md:w-8 text-primary-600 shrink-0" />
              <span className="text-lg md:text-xl font-bold text-gray-900 truncate">
                TrapHouse Kitchen
              </span>
            </Link>

            <div className="flex items-center gap-2 md:gap-4">
              {!isChefRoute && user && user.role === 'CUSTOMER' && (
                <button
                  type="button"
                  onClick={openCheckout}
                  className="hidden md:flex relative items-center gap-2 rounded-th-lg border border-th-border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  aria-label={`Cart, ${totalItems} items`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="tabular-nums">${totalPrice.toFixed(2)}</span>
                  {totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1 text-xs font-bold text-white">
                      {totalItems}
                    </span>
                  )}
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-1">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 p-2 text-gray-600 hover:text-primary-600 rounded-th-md"
                  >
                    <User className="h-6 w-6" />
                    <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                      {user.name}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-2 text-gray-600 hover:text-red-600 rounded-th-md"
                    title="Logout"
                  >
                    <LogOut className="h-6 w-6" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary-600 text-white rounded-th-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <CheckoutSheet />

      {showCustomerFab && (
        <button
          type="button"
          onClick={openCheckout}
          className="md:hidden fixed z-40 flex items-center gap-3 rounded-full bg-gray-900 text-white pl-4 pr-5 py-3 shadow-th-float right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
          aria-label={`Open cart, ${totalItems} items`}
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-500 px-1 text-xs font-bold">
              {totalItems}
            </span>
          </div>
          <span className="font-bold tabular-nums">${totalPrice.toFixed(2)}</span>
        </button>
      )}

      <nav className="md:hidden bg-white border-t border-th-border fixed bottom-0 left-0 right-0 safe-bottom z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathMatchesNav(location.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 ${
                  isActive ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="text-[11px] mt-0.5 font-medium truncate w-full text-center px-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <aside className="hidden md:block fixed left-0 top-14 md:top-16 bottom-0 w-64 bg-white border-r border-th-border z-40">
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathMatchesNav(location.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-th-lg transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
