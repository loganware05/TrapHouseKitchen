import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({
  default: {
    userAllergen: { findMany: vi.fn() },
    dishAllergen: { findFirst: vi.fn() },
  },
}));

import prisma from '../../src/lib/prisma';
import { assertNoAllergenConflicts } from '../../src/services/order.service';

describe('assertNoAllergenConflicts', () => {
  beforeEach(() => {
    vi.mocked(prisma.userAllergen.findMany).mockReset();
    vi.mocked(prisma.dishAllergen.findFirst).mockReset();
  });

  it('returns when user has no allergens recorded', async () => {
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValueOnce([]);
    await expect(assertNoAllergenConflicts('u1', ['d1'])).resolves.toBeUndefined();
    expect(prisma.dishAllergen.findFirst).not.toHaveBeenCalled();
  });

  it('throws when a dish matches a user allergen', async () => {
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([{ allergenId: 'a1' }]);
    vi.mocked(prisma.dishAllergen.findFirst).mockResolvedValue({ id: 'da1' });
    await expect(assertNoAllergenConflicts('u1', ['d1'])).rejects.toMatchObject({
      message: expect.stringContaining('allergen'),
      statusCode: 400,
    });
  });

  it('returns when no dish-allergen overlap exists', async () => {
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValueOnce([{ allergenId: 'a1' }]);
    vi.mocked(prisma.dishAllergen.findFirst).mockResolvedValueOnce(null);
    await expect(assertNoAllergenConflicts('u1', ['d1'])).resolves.toBeUndefined();
  });
});
