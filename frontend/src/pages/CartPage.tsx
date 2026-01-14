import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  const total = getTotalPrice();
  const itemCount = getTotalItems();

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please log in to checkout');
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center md:ml-64 mb-20 md:mb-8">
        <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some delicious items from our menu!</p>
        <Link
          to="/menu"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.dish.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-start space-x-4">
                {item.dish.imageUrl && (
                  <img
                    src={item.dish.imageUrl}
                    alt={item.dish.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{item.dish.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.dish.description}</p>
                  <p className="text-primary-600 font-bold mt-2">${item.dish.price.toFixed(2)}</p>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <button
                    onClick={() => removeItem(item.dish.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>

                  <div className="flex items-center space-x-2 border border-gray-300 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.dish.id, Math.max(1, item.quantity - 1))}
                      className="p-2 hover:bg-gray-100 rounded-l-lg"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-3 font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.dish.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-100 rounded-r-lg"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-lg font-bold text-gray-900">
                    ${(item.dish.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items ({itemCount})</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500">
                Tax included in price
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                + optional tip at checkout
              </p>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Proceed to Checkout
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>

            <Link
              to="/menu"
              className="block text-center mt-4 text-sm text-primary-600 hover:text-primary-700"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
