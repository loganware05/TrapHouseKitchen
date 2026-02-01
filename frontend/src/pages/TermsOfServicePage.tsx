export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 12, 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using the TrapHouse Kitchen website and services ("Service"), you accept and agree
              to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not
              use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Service Description</h2>
            <p className="text-gray-700">
              TrapHouse Kitchen provides an online platform for ordering food for pickup. We reserve the right to
              modify, suspend, or discontinue any part of our Service at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>You must be at least 13 years old to create an account</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>We reserve the right to terminate accounts that violate these Terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Orders and Payment</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Order Placement:</strong> All orders are subject to acceptance by TrapHouse Kitchen</li>
              <li><strong>Pricing:</strong> All prices are in USD and include applicable taxes</li>
              <li><strong>Payment:</strong> Payment is processed through Stripe. We accept credit cards, Apple Pay, Cash App Pay, and other digital payment methods.</li>
              <li><strong>Order Modifications:</strong> Orders cannot be modified or cancelled once confirmed</li>
              <li><strong>Refunds:</strong> Refunds are issued at our discretion for valid reasons (incorrect orders, quality issues, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Pickup Policy</h2>
            <p className="text-gray-700 mb-3">Orders are available for pickup only:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Pickup times are estimates and may vary based on kitchen capacity</li>
              <li>You must pick up your order within 30 minutes of the ready notification</li>
              <li>Orders not picked up within 1 hour may be discarded without refund</li>
              <li>Please bring your order number when picking up</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Allergen and Dietary Information</h2>
            <p className="text-gray-700">
              While we make efforts to accommodate dietary restrictions and provide allergen information, we cannot
              guarantee that our food is free from allergens. Cross-contamination may occur in our kitchen. If you
              have severe allergies, please contact us before ordering. By placing an order, you acknowledge this risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. User Conduct</h2>
            <p className="text-gray-700 mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use automated systems (bots) to access the Service</li>
              <li>Submit false or misleading information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p className="text-gray-700">
              All content on this website, including text, graphics, logos, images, and software, is the property
              of TrapHouse Kitchen and protected by copyright and trademark laws. You may not reproduce, distribute,
              or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, TrapHouse Kitchen shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages resulting from your use of the Service.
              Our total liability shall not exceed the amount paid by you for the specific order giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              The Service is provided "as is" and "as available" without warranties of any kind, either express
              or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify and hold harmless TrapHouse Kitchen from any claims, losses, damages, or
              expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">12. Dispute Resolution</h2>
            <p className="text-gray-700">
              Any disputes arising from these Terms or your use of the Service shall be resolved through binding
              arbitration in accordance with the laws of the State of Alabama. You waive your right to participate
              in class action lawsuits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon
              posting. Your continued use of the Service after changes are posted constitutes acceptance of the
              modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">14. Termination</h2>
            <p className="text-gray-700">
              We may terminate or suspend your account and access to the Service immediately, without prior notice,
              for any violation of these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">15. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with the laws of the State of Alabama,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">16. Contact Information</h2>
            <p className="text-gray-700 mb-3">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 font-medium">TrapHouse Kitchen</p>
              <p className="text-gray-700">123 Main Street, Birmingham, AL 35203</p>
              <p className="text-gray-700">Email: <a href="mailto:legal@traphousekitchen.com" className="text-primary-600 hover:text-primary-700">legal@traphousekitchen.com</a></p>
              <p className="text-gray-700">Phone: <a href="tel:+12055551234" className="text-primary-600 hover:text-primary-700">(205) 555-1234</a></p>
            </div>
          </section>

          <section className="border-t pt-6 mt-8">
            <p className="text-sm text-gray-500">
              By using TrapHouse Kitchen, you acknowledge that you have read, understood, and agree to be bound
              by these Terms of Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
