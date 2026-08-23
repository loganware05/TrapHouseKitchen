import { describe, expect, it } from 'vitest';
import {
  computeOrderPrepMinutes,
  queueMinutesFromCounts,
  sumDishPrepMinutes,
  PREP_CONFIG,
} from '../../src/services/prepTime.service';
import { clampBias, median, isPrepLearningEnabled } from '../../src/services/prepTimeLearning.service';

describe('prepTime.service', () => {
  const burger = { quantity: 1, dish: { prepTime: 15 } };
  const wings = { quantity: 2, dish: { prepTime: 20 } };

  it('sums dish prep with quantity', () => {
    expect(sumDishPrepMinutes([burger, wings])).toBe(15 + 40);
  });

  it('uses default dish prep when unset', () => {
    expect(sumDishPrepMinutes([{ quantity: 1, dish: { prepTime: null } }])).toBe(
      PREP_CONFIG.DEFAULT_DISH_PREP
    );
  });

  it('weights READY lower than PREPARING in queue', () => {
    const readyHeavy = queueMinutesFromCounts({ pending: 0, preparing: 0, ready: 5 });
    const prepHeavy = queueMinutesFromCounts({ pending: 0, preparing: 5, ready: 0 });
    expect(readyHeavy).toBeLessThan(prepHeavy);
    expect(readyHeavy).toBe(5 * PREP_CONFIG.QUEUE_READY);
  });

  it('Captain scenario: 3 READY + 2 PREPARING = 22 queue minutes', () => {
    expect(queueMinutesFromCounts({ pending: 0, preparing: 2, ready: 3 })).toBe(22);
  });

  it('clamps to MIN and MAX ETA', () => {
    const low = computeOrderPrepMinutes({
      items: [{ quantity: 1, dish: { prepTime: 5 } }],
      queueCounts: { pending: 0, preparing: 0, ready: 0 },
    });
    expect(low).toBe(PREP_CONFIG.MIN_ETA);

    const high = computeOrderPrepMinutes({
      items: [{ quantity: 10, dish: { prepTime: 30 } }],
      queueCounts: { pending: 10, preparing: 10, ready: 10 },
      learningBiasMinutes: 30,
    });
    expect(high).toBe(PREP_CONFIG.MAX_ETA);
  });
});

describe('prepTimeLearning helpers', () => {
  it('computes median', () => {
    expect(median([1, 2, 9])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
  });

  it('clamps bias', () => {
    expect(clampBias(50)).toBe(30);
    expect(clampBias(-50)).toBe(-15);
  });

  it('learning disabled by default in test env', () => {
    expect(isPrepLearningEnabled()).toBe(false);
  });
});
