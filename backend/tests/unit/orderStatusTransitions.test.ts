import { describe, it, expect } from 'vitest';
import { assertValidOrderStatusTransition } from '../../src/services/orderStatusTransitions';
import { AppError } from '../../src/middleware/errorHandler';

describe('assertValidOrderStatusTransition', () => {
  it('allows linear forward steps', () => {
    expect(() => assertValidOrderStatusTransition('PENDING', 'PREPARING')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('PREPARING', 'READY')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('READY', 'OUT_FOR_DELIVERY')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('OUT_FOR_DELIVERY', 'COMPLETED')).not.toThrow();
  });

  it('allows same-status no-ops', () => {
    expect(() => assertValidOrderStatusTransition('PENDING', 'PENDING')).not.toThrow();
  });

  it('allows cancel from non-cancelled statuses', () => {
    expect(() => assertValidOrderStatusTransition('READY', 'CANCELLED')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('COMPLETED', 'CANCELLED')).not.toThrow();
  });

  it('rejects skipped steps', () => {
    expect(() => assertValidOrderStatusTransition('PENDING', 'COMPLETED')).toThrow(AppError);
    expect(() => assertValidOrderStatusTransition('READY', 'COMPLETED')).toThrow(AppError);
    expect(() => assertValidOrderStatusTransition('PENDING', 'OUT_FOR_DELIVERY')).toThrow(AppError);
  });

  it('rejects backward moves', () => {
    expect(() => assertValidOrderStatusTransition('READY', 'PREPARING')).toThrow(AppError);
  });
});
