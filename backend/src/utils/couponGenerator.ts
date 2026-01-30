/**
 * Generate a unique coupon code
 * Format: TRAP-XXXX-XXXX (e.g., TRAP-A5B9-C3D7)
 */
export function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars (0, O, 1, I)
  const segments = 2;
  const segmentLength = 4;
  
  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => {
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
  }).join('-');
  
  return `TRAP-${code}`;
}
