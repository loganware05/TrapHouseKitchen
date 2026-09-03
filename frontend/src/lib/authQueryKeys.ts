/** Auth-scoped React Query keys — always include userId to avoid cross-account cache leaks. */

export function myCouponsQueryKey(userId: string) {
  return ['myCoupons', userId] as const;
}

export function myReviewsQueryKey(userId: string) {
  return ['myReviews', userId] as const;
}

export function userProfileQueryKey(userId: string) {
  return ['userProfile', userId] as const;
}

export function userSpendQueryKey(userId: string, period: string) {
  return ['userSpend', userId, period] as const;
}

export function eligibleOrdersQueryKey(userId: string) {
  return ['eligibleOrders', userId] as const;
}

export function spendTrackerQueryKey(userId: string) {
  return ['orders', userId, 'spend-tracker'] as const;
}
