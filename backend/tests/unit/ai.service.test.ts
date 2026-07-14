import { describe, it, expect } from 'vitest';
import type { Dish, Category } from '@prisma/client';
import {
  isMainCategory,
  dishMatchesDietaryPrefs,
  validateAndHydrateCombos,
  buildGreedyCombos,
  type EligibleDish,
  type LlmCombo,
} from '../../src/services/ai.service';

function makeDish(partial: Partial<Dish> & { category: Category }): EligibleDish {
  const c = partial.category;
  const base: Dish = {
    id: partial.id ?? 'd-id',
    name: partial.name ?? 'Item',
    description: partial.description ?? '',
    price: partial.price ?? 5,
    categoryId: partial.categoryId ?? c.id,
    status: partial.status ?? 'AVAILABLE',
    imageUrl: partial.imageUrl ?? null,
    prepTime: partial.prepTime ?? null,
    spiceLevel: partial.spiceLevel ?? null,
    isVegan: partial.isVegan ?? false,
    isVegetarian: partial.isVegetarian ?? false,
    isGlutenFree: partial.isGlutenFree ?? false,
    createdAt: partial.createdAt ?? new Date(),
    updatedAt: partial.updatedAt ?? new Date(),
  };
  return {
    ...base,
    category: c,
    allergens: [],
  };
}

const cat = (id: string, name: string): Category => ({
  id,
  name,
  description: null,
  displayOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('AI meal helpers', () => {
  it('isMainCategory treats beverages and desserts as non-mains', () => {
    expect(isMainCategory('Soft Drinks')).toBe(false);
    expect(isMainCategory('Dessert Bar')).toBe(false);
    expect(isMainCategory('Entrees')).toBe(true);
  });

  it('dishMatchesDietaryPrefs enforces vegan and gluten-free hints', () => {
    const veganOk = makeDish({
      category: cat('c1', 'Mains'),
      isVegan: true,
      isVegetarian: true,
    });
    const veganBad = makeDish({
      category: cat('c1b', 'Mains2'),
      isVegan: false,
      isVegetarian: true,
    });
    expect(dishMatchesDietaryPrefs(veganOk, ['vegan'])).toBe(true);
    expect(dishMatchesDietaryPrefs(veganBad, ['vegan'])).toBe(false);

    const gfOk = makeDish({ category: cat('c2', 'Mains3'), isGlutenFree: true });
    const gfBad = makeDish({ category: cat('c3', 'Mains4'), isGlutenFree: false });
    expect(dishMatchesDietaryPrefs(gfOk, ['gluten free'])).toBe(true);
    expect(dishMatchesDietaryPrefs(gfBad, ['gluten'])).toBe(false);
  });

  it('validateAndHydrateCombos enforces budget and main rule', () => {
    const burger = makeDish({
      id: 'b1',
      name: 'Burger',
      price: 8,
      category: cat('cm', 'Mains'),
    });
    const soda = makeDish({
      id: 's1',
      name: 'Soda',
      price: 2,
      category: cat('cb', 'Soft Drinks'),
    });
    const map = new Map<string, EligibleDish>([
      [burger.id, burger],
      [soda.id, soda],
    ]);

    const overBudget: LlmCombo[] = [
      {
        name: 'too much',
        description: '',
        items: [{ dishId: burger.id, name: burger.name, price: 8, quantity: 1 }],
        totalPrice: 8,
      },
    ];
    expect(validateAndHydrateCombos(overBudget, map, 8)).toHaveLength(0);

    const drinkOnly: LlmCombo[] = [
      {
        name: 'soda only',
        description: '',
        items: [{ dishId: soda.id, name: soda.name, price: 2, quantity: 1 }],
        totalPrice: 2,
      },
    ];
    expect(validateAndHydrateCombos(drinkOnly, map, 10)).toHaveLength(0);

    const okCombo: LlmCombo[] = [
      {
        name: 'combo',
        description: '',
        items: [
          { dishId: burger.id, name: burger.name, price: 8, quantity: 1 },
          { dishId: soda.id, name: soda.name, price: 2, quantity: 1 },
        ],
        totalPrice: 10,
      },
    ];
    const out = validateAndHydrateCombos(okCombo, map, 12);
    expect(out).toHaveLength(1);
    expect(out[0].totalPrice).toBeLessThan(12);
  });

  it('buildGreedyCombos + validateAndHydrateCombos produces under-budget combos with a main', () => {
    const mains = makeDish({
      id: 'm1',
      name: 'Plate',
      price: 6,
      category: cat('cp', 'Plates'),
    });
    const side = makeDish({
      id: 'sd1',
      name: 'Fries',
      price: 3,
      category: cat('cs', 'Sides'),
    });
    const eligible: EligibleDish[] = [mains, side];
    const dishById = new Map(eligible.map((d) => [d.id, d]));
    const trending = new Map<string, number>([
      [mains.id, 5],
      [side.id, 1],
    ]);
    const raw = buildGreedyCombos(eligible, 15, trending, new Set(), 3);
    expect(raw.length).toBeGreaterThan(0);
    const hydrated = validateAndHydrateCombos(raw, dishById, 15);
    expect(hydrated.length).toBeGreaterThan(0);
    for (const c of hydrated) {
      expect(c.totalPrice).toBeLessThan(15);
      expect(c.items.some((i) => isMainCategory(i.dish.category.name))).toBe(true);
    }
  });
});
