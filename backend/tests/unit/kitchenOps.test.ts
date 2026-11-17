import { describe, it, expect } from 'vitest';
import {
  isWithinDayHours,
  isWithinWeeklySchedule,
  validateWeeklyHours,
  getChicagoClock,
  assertRemainingServingsForItems,
} from '../../src/services/kitchenOps.service';

describe('kitchenOps hours helpers', () => {
  it('validates weekly hours HH:mm', () => {
    const hours = validateWeeklyHours({
      mon: { open: '17:00', close: '23:00' },
      tue: null,
    });
    expect(hours?.mon).toEqual({ open: '17:00', close: '23:00' });
    expect(hours?.tue).toBeNull();
  });

  it('rejects invalid time strings', () => {
    expect(() => validateWeeklyHours({ mon: { open: '25:00', close: '23:00' } })).toThrow(
      /Invalid time/
    );
  });

  it('detects same-day open window', () => {
    expect(isWithinDayHours({ open: '17:00', close: '23:00' }, 17 * 60)).toBe(true);
    expect(isWithinDayHours({ open: '17:00', close: '23:00' }, 16 * 60 + 59)).toBe(false);
    expect(isWithinDayHours({ open: '17:00', close: '23:00' }, 23 * 60)).toBe(false);
  });

  it('detects overnight open window', () => {
    expect(isWithinDayHours({ open: '22:00', close: '02:00' }, 23 * 60)).toBe(true);
    expect(isWithinDayHours({ open: '22:00', close: '02:00' }, 1 * 60)).toBe(true);
    expect(isWithinDayHours({ open: '22:00', close: '02:00' }, 12 * 60)).toBe(false);
  });

  it('returns false when schedule has no hours for today', () => {
    const { day } = getChicagoClock(new Date('2026-11-16T18:00:00Z'));
    const other = day === 'mon' ? 'tue' : 'mon';
    expect(
      isWithinWeeklySchedule({ [other]: { open: '00:00', close: '23:59' } }, new Date())
    ).toBe(false);
  });

  it('assertRemainingServingsForItems rejects oversell and unavailable', () => {
    expect(() =>
      assertRemainingServingsForItems([
        {
          dishId: 'd1',
          quantity: 2,
          dish: { name: 'Bowl', remainingServings: 1, status: 'AVAILABLE' },
        },
      ])
    ).toThrow(/Not enough servings/);

    expect(() =>
      assertRemainingServingsForItems([
        {
          dishId: 'd1',
          quantity: 1,
          dish: { name: 'Bowl', remainingServings: 5, status: 'UNAVAILABLE' },
        },
      ])
    ).toThrow(/Not enough servings/);

    expect(() =>
      assertRemainingServingsForItems([
        {
          dishId: 'd1',
          quantity: 1,
          dish: { name: 'Bowl', remainingServings: 5, status: 'AVAILABLE' },
        },
      ])
    ).not.toThrow();
  });
});
