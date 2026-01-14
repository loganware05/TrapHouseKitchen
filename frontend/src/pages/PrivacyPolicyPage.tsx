export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 12, 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-700">
              Welcome to TrapHouse Kitchen ("we," "our," or "us"). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy explains how we collect, use, and share
              information about you when you use our online food ordering service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="text-gray-700 mb-3">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account</li>
              <li><strong>Order Information:</strong> Details about the food items you order, special instructions, and payment information</li>
              <li><strong>Profile Information:</strong> Dietary preferences and allergen information</li>
              <li><strong>Communication Information:</strong> When you contact us for support or feedback</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Process and fulfill your food orders</li>
              <li>Send you order confirmations and updates</li>
              <li>Communicate with you about your orders and our services</li>
              <li>Improve our menu offerings based on your preferences</li>
              <li>Protect against fraud and unauthorized transactions</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Information Sharing</h2>
            <p className="text-gray-700 mb-3">We may share your information with:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Payment Processors:</strong> Stripe processes your payment information securely</li>
              <li><strong>Service Providers:</strong> Third-party vendors who help us operate our service</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-gray-700 mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
            <p className="text-gray-700">
              We implement appropriate technical and organizational measures to protect your personal information.
              However, no method of transmission over the Internet is 100% secure. We use industry-standard encryption
              for sensitive data and regularly update our security practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p className="text-gray-700 mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to our processing of your personal information</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Cookies and Tracking</h2>
            <p className="text-gray-700">
              We use cookies and similar tracking technologies to improve your experience on our website.
              You can control cookies through your browser settings. Essential cookies are necessary for the
              website to function properly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Data Retention</h2>
            <p className="text-gray-700">
              We retain your personal information for as long as necessary to fulfill the purposes outlined
              in this Privacy Policy, unless a longer retention period is required by law. Order history is
              retained for accounting and legal compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p className="text-gray-700">
              Our service is not directed to children under 13 years of age. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information
              from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the "Last updated" date. You are
              advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p className="text-gray-700 mb-3">
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 font-medium">TrapHouse Kitchen</p>
              <p className="text-gray-700">123 Main Street, Birmingham, AL 35203</p>
              <p className="text-gray-700">Email: <a href="mailto:privacy@traphousekitchen.com" className="text-primary-600 hover:text-primary-700">privacy@traphousekitchen.com</a></p>
              <p className="text-gray-700">Phone: <a href="tel:+12055551234" className="text-primary-600 hover:text-primary-700">(205) 555-1234</a></p>
            </div>
          </section>

          <section className="border-t pt-6 mt-8">
            <p className="text-sm text-gray-500">
              By using our service, you acknowledge that you have read and understood this Privacy Policy
              and agree to its terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
