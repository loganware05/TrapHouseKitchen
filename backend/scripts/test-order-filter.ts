/**
 * Headless test to validate order list visibility for chefs and customers.
 * Lists show only paid or post-payment states (PAID, REFUNDED, PARTIALLY_REFUNDED).
 */

import { ORDER_LIST_VISIBLE_PAYMENT_STATUSES } from '../src/services/orderVisibility';

type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

interface Order {
  id: string;
  orderNumber: number;
  paymentStatus: PaymentStatus;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
}

function testOrderFiltering() {
  console.log('🧪 Testing order list visibility\n');

  const allOrders: Order[] = [
    { id: '1', orderNumber: 1, paymentStatus: 'PAID', status: 'PENDING' },
    { id: '2', orderNumber: 2, paymentStatus: 'PENDING', status: 'PREPARING' },
    { id: '3', orderNumber: 3, paymentStatus: 'UNPAID', status: 'PENDING' },
    { id: '4', orderNumber: 4, paymentStatus: 'PAID', status: 'READY' },
    { id: '5', orderNumber: 5, paymentStatus: 'FAILED', status: 'PENDING' },
    { id: '6', orderNumber: 6, paymentStatus: 'PAID', status: 'COMPLETED' },
    { id: '7', orderNumber: 7, paymentStatus: 'REFUNDED', status: 'COMPLETED' },
  ];

  const visibleOrders = allOrders.filter((order) =>
    ORDER_LIST_VISIBLE_PAYMENT_STATUSES.includes(order.paymentStatus)
  );

  console.log(`   Total orders: ${allOrders.length}`);
  console.log(`   List-visible orders: ${visibleOrders.length}`);
  console.log(
    `   Visible: ${visibleOrders.map((o) => `#${o.orderNumber}`).join(', ')}`
  );
  console.log(
    `   Hidden: ${allOrders
      .filter((o) => !ORDER_LIST_VISIBLE_PAYMENT_STATUSES.includes(o.paymentStatus))
      .map((o) => `#${o.orderNumber} (${o.paymentStatus})`)
      .join(', ')}`
  );

  const filterPass =
    visibleOrders.length === 4 &&
    visibleOrders.every((o) =>
      ORDER_LIST_VISIBLE_PAYMENT_STATUSES.includes(o.paymentStatus)
    ) &&
    !visibleOrders.some((o) =>
      ['UNPAID', 'PENDING', 'FAILED'].includes(o.paymentStatus)
    );

  console.log(`   Filter result: ${filterPass ? '✅ PASS' : '❌ FAIL'}\n`);

  const paidIncluded = visibleOrders.some((o) => o.orderNumber === 1);
  const pendingExcluded = !visibleOrders.some((o) => o.orderNumber === 2);
  const unpaidExcluded = !visibleOrders.some((o) => o.orderNumber === 3);
  const refundedIncluded = visibleOrders.some((o) => o.orderNumber === 7);

  const inclusionPass =
    paidIncluded && pendingExcluded && unpaidExcluded && refundedIncluded;

  console.log(`   PAID included: ${paidIncluded ? '✅' : '❌'}`);
  console.log(`   PENDING excluded: ${pendingExcluded ? '✅' : '❌'}`);
  console.log(`   UNPAID excluded: ${unpaidExcluded ? '✅' : '❌'}`);
  console.log(`   REFUNDED included: ${refundedIncluded ? '✅' : '❌'}`);
  console.log(`   Inclusion result: ${inclusionPass ? '✅ PASS' : '❌ FAIL'}\n`);

  const allTestsPass = filterPass && inclusionPass;
  console.log(`Overall: ${allTestsPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  process.exit(allTestsPass ? 0 : 1);
}

testOrderFiltering();
