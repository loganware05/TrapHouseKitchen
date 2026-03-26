import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const MAX_BATCH = 100;

export type AnalyticsEventInput = {
  event: string;
  metadata?: Prisma.InputJsonValue;
  sessionId?: string;
};

export function parsePeriodStart(period: string): Date {
  const now = new Date();
  const p = period.trim().toLowerCase();
  if (p === '24h' || p === '1d') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  const dayMatch = /^(\d+)d$/.exec(p);
  if (dayMatch) {
    const days = Math.min(365, Math.max(1, parseInt(dayMatch[1], 10)));
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  throw new AppError('Invalid period. Use 7d, 30d, 24h, etc.', 400);
}

export async function ingestEvents(
  userId: string | undefined,
  defaultSessionId: string | undefined,
  events: AnalyticsEventInput[]
) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new AppError('events must be a non-empty array', 400);
  }
  if (events.length > MAX_BATCH) {
    throw new AppError(`At most ${MAX_BATCH} events per request`, 400);
  }

  const rows = events.map((e) => {
    if (!e.event || typeof e.event !== 'string' || e.event.length > 120) {
      throw new AppError('Each event must be a non-empty string (max 120 chars)', 400);
    }
    const sid =
      typeof e.sessionId === 'string' && e.sessionId.length > 0
        ? e.sessionId.slice(0, 128)
        : defaultSessionId?.slice(0, 128);

    const row: {
      userId: string | null;
      event: string;
      sessionId: string | null;
      metadata?: Prisma.InputJsonValue;
    } = {
      userId: userId ?? null,
      event: e.event,
      sessionId: sid ?? null,
    };
    if (e.metadata !== undefined && e.metadata !== null) {
      row.metadata = e.metadata as Prisma.InputJsonValue;
    }
    return row;
  });

  await prisma.analyticsEvent.createMany({ data: rows });
  return { accepted: rows.length };
}

export async function getChefDashboard(period: string) {
  const start = parsePeriodStart(period);

  const paidOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start },
      paymentStatus: 'PAID',
    },
    select: { id: true, finalAmount: true },
  });

  const revenue = paidOrders.reduce((s, o) => s + o.finalAmount, 0);
  const orderCount = paidOrders.length;
  const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

  const topGroups = await prisma.orderItem.groupBy({
    by: ['dishId'],
    where: {
      order: {
        createdAt: { gte: start },
        paymentStatus: 'PAID',
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });

  const dishIds = topGroups.map((g) => g.dishId);
  const dishes = await prisma.dish.findMany({
    where: { id: { in: dishIds } },
    select: { id: true, name: true, price: true },
  });
  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  const topDishes = topGroups.map((g) => ({
    dishId: g.dishId,
    name: dishMap.get(g.dishId)?.name ?? 'Unknown',
    orderCount: g._sum.quantity ?? 0,
    unitPrice: dishMap.get(g.dishId)?.price ?? 0,
  }));

  const eventCounts = await prisma.analyticsEvent.groupBy({
    by: ['event'],
    where: { createdAt: { gte: start } },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const row of eventCounts) {
    counts[row.event] = row._count._all;
  }

  const checkoutStarts = counts['checkout_start'] ?? 0;
  const ordersPlacedEvents = counts['order_placed'] ?? 0;
  const conversionRate =
    checkoutStarts > 0 ? Math.min(1, ordersPlacedEvents / checkoutStarts) : null;

  const funnel = {
    viewDish: counts['view_dish'] ?? 0,
    addToCart: counts['add_to_cart'] ?? 0,
    removeFromCart: counts['remove_from_cart'] ?? 0,
    checkoutStart: checkoutStarts,
    orderPlaced: ordersPlacedEvents,
    aiBuildMeal: counts['ai_build_meal'] ?? 0,
    aiComboSelected: counts['ai_combo_selected'] ?? 0,
    reorderTapped: counts['reorder_tapped'] ?? 0,
  };

  const wauRows = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: start },
      userId: { not: null },
    },
    _count: { _all: true },
  });
  const weeklyActiveUsers = wauRows.filter((r) => r.userId !== null).length;

  const aiTotal = await prisma.aIInteraction.count({
    where: { createdAt: { gte: start } },
  });
  const aiConverted = await prisma.aIInteraction.count({
    where: { createdAt: { gte: start }, convertedToOrder: true },
  });
  const aiConversionRate = aiTotal > 0 ? aiConverted / aiTotal : null;

  return {
    period,
    periodStart: start.toISOString(),
    revenue: Math.round(revenue * 100) / 100,
    orderCount,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    topDishes,
    funnel,
    conversionRate:
      conversionRate === null ? null : Math.round(conversionRate * 10000) / 100,
    weeklyActiveUsers,
    aiBuilder: {
      interactions: aiTotal,
      convertedToOrder: aiConverted,
      conversionPercent:
        aiConversionRate === null
          ? null
          : Math.round(aiConversionRate * 10000) / 100,
    },
  };
}

export async function getUserSpendSummary(userId: string, period: string) {
  const start = parsePeriodStart(period);

  const [budgetRow, paidOrders, aiStats] = await Promise.all([
    prisma.userBudget.findUnique({ where: { userId } }),
    prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: start },
        paymentStatus: 'PAID',
      },
      include: {
        items: {
          include: {
            dish: { include: { category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.aIInteraction.groupBy({
      by: ['convertedToOrder'],
      where: { userId, createdAt: { gte: start } },
      _count: { _all: true },
    }),
  ]);

  const totalSpent = paidOrders.reduce((s, o) => s + o.finalAmount, 0);

  const categoryTotals = new Map<string, number>();
  for (const order of paidOrders) {
    for (const line of order.items) {
      const cat = line.dish.category?.name ?? 'Other';
      const lineTotal = line.priceAtOrder * line.quantity;
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + lineTotal);
    }
  }

  const categoryBreakdown = [...categoryTotals.entries()]
    .map(([categoryName, amount]) => ({
      categoryName,
      amount: Math.round(amount * 100) / 100,
      percentOfSpend:
        totalSpent > 0
          ? Math.round((amount / totalSpent) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const aiBuilderOrders = paidOrders.filter((o) => o.source === 'AI_BUILDER').length;

  const aiInteractionsTotal = aiStats.reduce((s, r) => s + r._count._all, 0);
  const aiInteractionsConverted =
    aiStats.find((r) => r.convertedToOrder === true)?._count._all ?? 0;

  // Rough product metric: typical third-party delivery fee avoided per AI-planned pickup order.
  const EST_FEE_PER_AI_ORDER = 4.5;
  const estimatedSavingsVsDeliveryUsd = Math.round(aiBuilderOrders * EST_FEE_PER_AI_ORDER * 100) / 100;

  const weeklyBudget = budgetRow?.weeklyBudget ?? 50;
  const spentLastPeriod = Math.round(totalSpent * 100) / 100;
  const budgetRemaining = Math.round((weeklyBudget - spentLastPeriod) * 100) / 100;

  return {
    period,
    periodStart: start.toISOString(),
    weeklyBudget,
    spentInPeriod: spentLastPeriod,
    budgetRemaining,
    categoryBreakdown,
    orderCount: paidOrders.length,
    aiBuilder: {
      paidOrdersCount: aiBuilderOrders,
      interactions: aiInteractionsTotal,
      interactionsConvertedToOrder: aiInteractionsConverted,
      estimatedSavingsVsDeliveryUsd,
    },
  };
}
