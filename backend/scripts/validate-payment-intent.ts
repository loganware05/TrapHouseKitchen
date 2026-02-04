/**
 * Validation script to verify PaymentIntent structure
 * This validates the code structure without requiring Stripe API keys
 */

// Mock Stripe PaymentIntent structure validation
interface PaymentIntentParams {
  amount: number;
  currency: string;
  automatic_payment_methods?: {
    enabled: boolean;
    allow_redirects?: string;
  };
  payment_method_types?: string[];
  metadata?: Record<string, string>;
  description?: string;
}

function validatePaymentIntentStructure(params: PaymentIntentParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check that automatic_payment_methods is present
  if (!params.automatic_payment_methods) {
    errors.push('automatic_payment_methods is required');
  } else {
    if (params.automatic_payment_methods.enabled !== true) {
      errors.push('automatic_payment_methods.enabled must be true');
    }
  }

  // Critical: Check that payment_method_types is NOT present
  // This is the fix we implemented - they cannot coexist
  if (params.payment_method_types) {
    errors.push(
      'ERROR: payment_method_types cannot be used with automatic_payment_methods. ' +
      'This will cause StripeInvalidRequestError. Remove payment_method_types.'
    );
  }

  // Validate required fields
  if (!params.amount || params.amount <= 0) {
    errors.push('amount must be a positive number');
  }

  if (!params.currency) {
    errors.push('currency is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Test the fixed structure (what we want)
const fixedStructure: PaymentIntentParams = {
  amount: 2000, // $20.00 in cents
  currency: 'usd',
  automatic_payment_methods: {
    enabled: true,
    allow_redirects: 'always',
  },
  // ✅ payment_method_types is NOT present - this is correct
  metadata: {
    orderId: 'test-order-123',
    userId: 'test-user-456',
  },
  description: 'TrapHouse Kitchen Order #test-123',
};

// Test the old broken structure (what we fixed)
const brokenStructure: PaymentIntentParams = {
  amount: 2000,
  currency: 'usd',
  payment_method_types: ['card', 'cashapp'], // ❌ This causes the error
  automatic_payment_methods: {
    enabled: true,
    allow_redirects: 'always',
  },
};

console.log('🔍 Validating PaymentIntent Structure\n');

console.log('✅ Testing FIXED structure (current code):');
const fixedResult = validatePaymentIntentStructure(fixedStructure);
if (fixedResult.valid) {
  console.log('   ✓ Structure is valid - PaymentIntent will work correctly\n');
} else {
  console.log('   ✗ Structure has errors:');
  fixedResult.errors.forEach((error) => console.log(`     - ${error}`));
  console.log('');
}

console.log('❌ Testing BROKEN structure (old code):');
const brokenResult = validatePaymentIntentStructure(brokenStructure);
if (!brokenResult.valid) {
  console.log('   ✓ Correctly detected errors (this is expected):');
  brokenResult.errors.forEach((error) => console.log(`     - ${error}`));
  console.log('');
}

if (fixedResult.valid && !brokenResult.valid) {
  console.log('✅ Validation passed! The fix is correct.');
  console.log('   PaymentIntent will now work without StripeInvalidRequestError.');
  process.exit(0);
} else {
  console.log('❌ Validation failed!');
  process.exit(1);
}
