import { createHash } from 'crypto';
import type { Dish, Category, DishAllergen } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export type EligibleDish = Dish & {
  category: Category;
  allergens: (DishAllergen & { allergen: { id: string; name: string } })[];
};

export type MealComboLine = {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  dish: EligibleDish;
};

export type MealCombo = {
  name: string;
  description: string;
  items: MealComboLine[];
  totalPrice: number;
};

const AI_INTERACTION_BUDGET_MEAL = 'budget_meal';
const DAY_MS = 24 * 60 * 60 * 1000;

function isMainCategory(categoryName: string): boolean {
  const n = categoryName.toLowerCase();
  return !/\b(beverage|drinks?|dessert)\b/i.test(n);
}

function dishMatchesDietaryPrefs(
  dish: Pick<Dish, 'isVegan' | 'isVegetarian' | 'isGlutenFree'>,
  prefs: string[]
): boolean {
  if (prefs.length === 0) return true;
  const lower = prefs.map((p) => p.toLowerCase());
  if (lower.some((p) => p.includes('vegan'))) {
    if (!dish.isVegan) return false;
  }
  if (lower.some((p) => p.includes('vegetarian')) && !lower.some((p) => p.includes('vegan'))) {
    if (!dish.isVegetarian && !dish.isVegan) return false;
  }
  if (lower.some((p) => p.includes('gluten'))) {
    if (!dish.isGlutenFree) return false;
  }
  return true;
}

async function loadTrendingDishIds(since: Date): Promise<Map<string, number>> {
  const counts = await prisma.orderItem.groupBy({
    by: ['dishId'],
    where: {
      order: {
        createdAt: { gte: since },
      },
    },
    _count: { dishId: true },
    orderBy: { _count: { dishId: 'desc' } },
    take: 30,
  });
  const map = new Map<string, number>();
  for (const row of counts) {
    map.set(row.dishId, row._count.dishId);
  }
  return map;
}

function sanitizeInputContext(params: {
  budget: number;
  excludedAllergenNames: string[];
  dietaryPrefs: string[];
  recentDishNames: string[];
  trendingTopIds: string[];
  eligibleDishCount: number;
  categoryCounts: Record<string, number>;
}): Record<string, unknown> {
  const payload = JSON.stringify({
    budget: params.budget,
    allergens: params.excludedAllergenNames.sort(),
    dietary: params.dietaryPrefs.sort(),
    recentSample: params.recentDishNames.slice(0, 5),
    trendingTop: params.trendingTopIds.slice(0, 8),
    eligibleCount: params.eligibleDishCount,
    categories: params.categoryCounts,
  });
  return {
    budget: params.budget,
    excludedAllergenCount: params.excludedAllergenNames.length,
    dietaryPreferenceCount: params.dietaryPrefs.length,
    recentOrderDishCount: params.recentDishNames.length,
    trendingSampleCount: params.trendingTopIds.length,
    eligibleDishCount: params.eligibleDishCount,
    categoryCounts: params.categoryCounts,
    contextHash: createHash('sha256').update(payload).digest('hex').slice(0, 16),
  };
}

type LlmCombo = {
  name: string;
  description: string;
  items: { dishId: string; name: string; price: number; quantity?: number }[];
  totalPrice: number;
};

type LlmResponse = { combinations: LlmCombo[] };

async function callOpenAiJson(system: string, user: string): Promise<LlmResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');

  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const maxTokens = Number(process.env.AI_MAX_TOKENS || '1024');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI empty response');
  return JSON.parse(content) as LlmResponse;
}

async function callAnthropicJson(system: string, user: string): Promise<LlmResponse> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY missing');

  const model =
    process.env.AI_MODEL && process.env.AI_MODEL.includes('claude')
      ? process.env.AI_MODEL
      : 'claude-3-5-haiku-20241022';
  const maxTokens = Number(process.env.AI_MAX_TOKENS || '1024');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('Anthropic empty response');

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Anthropic response not JSON');
  return JSON.parse(text.slice(start, end + 1)) as LlmResponse;
}

async function callLlmForCombos(system: string, user: string): Promise<LlmResponse> {
  if (process.env.OPENAI_API_KEY) {
    return callOpenAiJson(system, user);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropicJson(system, user);
  }
  throw new Error('No LLM API key configured');
}

function buildGreedyCombos(
  dishes: EligibleDish[],
  budget: number,
  trending: Map<string, number>,
  recentLower: Set<string>,
  maxCombos: number
): LlmCombo[] {
  const score = (d: EligibleDish) => {
    const t = trending.get(d.id) ?? 0;
    const recentPenalty = recentLower.has(d.name.toLowerCase()) ? -2 : 0;
    return t + recentPenalty + (isMainCategory(d.category.name) ? 1 : 0);
  };

  const sorted = [...dishes].sort((a, b) => score(b) - score(a));
  const mains = sorted.filter((d) => isMainCategory(d.category.name));
  const starters = mains.length > 0 ? mains : sorted;
  const combos: LlmCombo[] = [];
  const usedSignatures = new Set<string>();

  for (let s = 0; s < starters.length && combos.length < maxCombos; s++) {
    const items: LlmCombo['items'] = [];
    let total = 0;
    const usedIds = new Set<string>();

    const tryAdd = (d: EligibleDish, qty = 1) => {
      const line = d.price * qty;
      if (total + line >= budget - 1e-4) return false;
      items.push({ dishId: d.id, name: d.name, price: d.price, quantity: qty });
      total += line;
      usedIds.add(d.id);
      return true;
    };

    if (!tryAdd(starters[s], 1)) continue;

    for (const d of sorted) {
      if (usedIds.has(d.id)) continue;
      tryAdd(d, 1);
      if (total >= budget * 0.85) break;
    }

    const hasMain = items.some((i) => {
      const dish = dishes.find((x) => x.id === i.dishId);
      return dish && isMainCategory(dish.category.name);
    });
    if (!hasMain && mains.length > 0) continue;

    const sig = items
      .map((i) => i.dishId)
      .sort()
      .join(',');
    if (usedSignatures.has(sig)) continue;
    usedSignatures.add(sig);

    combos.push({
      name: `Campus pick ${combos.length + 1}`,
      description: "Balanced combo from tonight's menu (quick pick).",
      items: items.map((i) => ({
        ...i,
        quantity: i.quantity ?? 1,
      })),
      totalPrice: Math.round(total * 100) / 100,
    });
  }

  return combos.slice(0, maxCombos);
}

function validateAndHydrateCombos(
  raw: LlmCombo[],
  dishById: Map<string, EligibleDish>,
  budget: number
): MealCombo[] {
  const out: MealCombo[] = [];

  for (const combo of raw.slice(0, 5)) {
    if (!combo.items?.length) continue;

    const hydratedItems: MealComboLine[] = [];
    let total = 0;

    for (const line of combo.items) {
      const d = dishById.get(line.dishId);
      if (!d) continue;
      const qty = Math.max(1, Math.min(5, Math.floor(line.quantity ?? 1)));
      const price = d.price;
      hydratedItems.push({
        dishId: d.id,
        name: d.name,
        price,
        quantity: qty,
        dish: d,
      });
      total += price * qty;
    }

    if (hydratedItems.length === 0) continue;

    total = Math.round(total * 100) / 100;
    if (total >= budget - 1e-4) continue;

    const hasMain = hydratedItems.some((i) => isMainCategory(i.dish.category.name));
    const anyMainExists = [...dishById.values()].some((d) => isMainCategory(d.category.name));
    if (anyMainExists && !hasMain) continue;

    out.push({
      name: combo.name?.slice(0, 80) || 'Meal combo',
      description: combo.description?.slice(0, 300) || '',
      items: hydratedItems,
      totalPrice: total,
    });

    if (out.length >= 3) break;
  }

  return out;
}

function modelLabel(): string {
  if (process.env.OPENAI_API_KEY) return process.env.AI_MODEL || 'gpt-4o-mini';
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.AI_MODEL?.includes('claude')
      ? process.env.AI_MODEL
      : 'claude-3-5-haiku-20241022';
  }
  return 'heuristic-fallback';
}

export async function buildBudgetMeal(userId: string, budget: number): Promise<{
  combinations: MealCombo[];
  interactionId: string;
}> {
  if (budget < 5 || budget > 100) {
    throw new AppError('Budget must be between 5 and 100', 400);
  }

  const since = new Date(Date.now() - DAY_MS);
  const [user, trendingMap] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        allergenProfile: { include: { allergen: true } },
        dietaryPreferences: true,
      },
    }),
    loadTrendingDishIds(since),
  ]);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const excludedAllergenIds = new Set(user.allergenProfile.map((a) => a.allergenId));
  const excludedAllergenNames = user.allergenProfile.map((a) => a.allergen.name);
  const dietaryPrefs = user.dietaryPreferences.map((p) => p.name);

  const recentOrders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      items: { include: { dish: true } },
    },
  });

  const recentDishNames: string[] = [];
  for (const o of recentOrders) {
    for (const it of o.items) {
      recentDishNames.push(it.dish.name);
    }
  }
  const recentLower = new Set(recentDishNames.map((n) => n.toLowerCase()));

  const allDishes = await prisma.dish.findMany({
    where: { status: 'AVAILABLE' },
    include: {
      category: true,
      allergens: { include: { allergen: true } },
    },
  });

  const eligible: EligibleDish[] = [];
  for (const d of allDishes) {
    const conflict = d.allergens.some((da) => excludedAllergenIds.has(da.allergenId));
    if (conflict) continue;
    if (!dishMatchesDietaryPrefs(d, dietaryPrefs)) continue;
    eligible.push(d);
  }

  if (eligible.length === 0) {
    throw new AppError('No menu items match your allergens and dietary preferences', 400);
  }

  const trendingTopIds = [...trendingMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const categoryCounts: Record<string, number> = {};
  for (const d of eligible) {
    categoryCounts[d.category.name] = (categoryCounts[d.category.name] || 0) + 1;
  }

  const inputContext = sanitizeInputContext({
    budget,
    excludedAllergenNames,
    dietaryPrefs,
    recentDishNames,
    trendingTopIds,
    eligibleDishCount: eligible.length,
    categoryCounts,
  });

  const dishById = new Map(eligible.map((d) => [d.id, d]));

  const menuForPrompt = eligible.map((d) => ({
    dishId: d.id,
    name: d.name,
    price: d.price,
    category: d.category.name,
    isVegan: d.isVegan,
    isVegetarian: d.isVegetarian,
    isGlutenFree: d.isGlutenFree,
    trendingOrders24h: trendingMap.get(d.id) ?? 0,
  }));

  const system = `You are a meal recommendation engine for a campus food kitchen.
Given a budget, available menu items, and user preferences, return 2-3 meal combinations that:
1. Total cost is STRICTLY under the budget (sum of line items must be less than the budget).
2. Include at least one main item when the menu has a non-beverage, non-dessert category (e.g. mains, appetizers, entrees).
3. Respect dietary restrictions and allergen exclusions (the menu list is already filtered — only choose from provided dishIds).
4. Prefer higher trendingOrders24h when ties are broken.
5. Introduce variety vs recent orders when possible.

Return ONLY valid JSON with this shape:
{"combinations":[{"name":"string","description":"string","items":[{"dishId":"uuid","name":"string","price":number,"quantity":number}],"totalPrice":number}]}

Use quantity 1 unless a side portion makes sense. totalPrice must equal the sum of item price * quantity.`;

  const userPrompt = `Budget: $${budget}
Excluded allergens (already applied to menu): ${excludedAllergenNames.join(', ') || 'none'}
Dietary preferences: ${dietaryPrefs.join(', ') || 'none'}
Recent dishes ordered (avoid repeating the same meal when possible): ${[...new Set(recentDishNames)].slice(0, 15).join(', ') || 'none'}

Available menu (JSON):
${JSON.stringify(menuForPrompt)}`;

  const started = Date.now();
  let llmRaw: LlmResponse | null = null;
  let llmError: string | null = null;

  try {
    llmRaw = await callLlmForCombos(system, userPrompt);
  } catch (e) {
    llmError = e instanceof Error ? e.message : String(e);
  }

  let combinations = llmRaw
    ? validateAndHydrateCombos(llmRaw.combinations || [], dishById, budget)
    : [];

  if (combinations.length === 0) {
    const fallbackRaw = buildGreedyCombos(eligible, budget, trendingMap, recentLower, 3);
    combinations = validateAndHydrateCombos(fallbackRaw, dishById, budget);
  }

  if (combinations.length === 0) {
    throw new AppError('Could not build a meal under that budget. Try a higher amount.', 400);
  }

  const latencyMs = Math.min(Math.max(0, Date.now() - started), 2147483647);

  const outputResponse: Prisma.InputJsonValue = {
    combinations: combinations.map((c) => ({
      name: c.name,
      description: c.description,
      items: c.items.map((i) => ({
        dishId: i.dishId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      totalPrice: c.totalPrice,
    })),
    llmError,
    usedLlm: !llmError && !!llmRaw,
  };

  const interaction = await prisma.aIInteraction.create({
    data: {
      userId,
      type: AI_INTERACTION_BUDGET_MEAL,
      inputBudget: budget,
      inputContext: inputContext as Prisma.InputJsonValue,
      outputResponse,
      latencyMs,
      model: modelLabel(),
    },
  });

  return { combinations, interactionId: interaction.id };
}

export async function recordComboSelection(
  userId: string,
  interactionId: string,
  selectedComboIndex: number
): Promise<void> {
  const row = await prisma.aIInteraction.findFirst({
    where: { id: interactionId, userId, type: AI_INTERACTION_BUDGET_MEAL },
  });
  if (!row) {
    throw new AppError('Interaction not found', 404);
  }
  await prisma.aIInteraction.update({
    where: { id: interactionId },
    data: { selectedComboIndex },
  });
}

export async function markInteractionOrderPlaced(
  userId: string,
  interactionId: string,
  orderId: string
): Promise<void> {
  const row = await prisma.aIInteraction.findFirst({
    where: { id: interactionId, userId },
  });
  if (!row) return;
  await prisma.aIInteraction.update({
    where: { id: interactionId },
    data: {
      convertedToOrder: true,
      orderId,
    },
  });
}
