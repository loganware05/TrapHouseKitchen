import { Link } from 'react-router-dom';
import { ChefHat, UtensilsCrossed, MessageSquare, QrCode } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            <ChefHat className="h-20 w-20 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to TrapHouse Kitchen
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Delicious food, personalized to your preferences
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/menu"
                className="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
              >
                Browse Menu
              </Link>
              <Link
                to="/dish-requests"
                className="px-8 py-4 bg-primary-800 text-white rounded-lg font-semibold hover:bg-primary-900 transition-colors text-lg"
              >
                Request a Dish
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Choose Us?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Allergen-Friendly</h3>
            <p className="text-gray-600">
              Set your allergen profile and dietary preferences. We'll automatically filter dishes to keep you safe.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Community-Driven</h3>
            <p className="text-gray-600">
              Request dishes you'd love to try and vote on others' suggestions. Help shape our menu!
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Access</h3>
            <p className="text-gray-600">
              Scan our QR code and add to your home screen. Order food with just a tap!
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Browse our menu and start customizing your perfect meal
          </p>
          <Link
            to="/menu"
            className="inline-block px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors text-lg"
          >
            View Menu
          </Link>
        </div>
      </div>
    </div>
  );
}

