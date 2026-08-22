import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PREP_CONFIG, getKitchenQueueCounts, queueMinutesFromCounts } from './prepTime.service';

const CALIBRATION_ID = 'singleton';

export const LEARNING_CONFIG = {
  WINDOW_SIZE: parseInt(process.env.PREP_LEARNING_WINDOW || '30', 10),
  MIN_SAMPLES: parseInt(process.env.PREP_LEARNING_MIN_SAMPLES || '20', 10),
  DISH_MIN_SAMPLES: parseInt(process.env.PREP_DISH_MIN_SAMPLES || '5', 10),
  BIAS_CLAMP_MIN: parseInt(process.env.PREP_BIAS_CLAMP_MIN || '-15', 10),
  BIAS_CLAMP_MAX: parseInt(process.env.PREP_BIAS_CLAMP_MAX || '30', 10),
};

export type DishPrepSuggestion = {
  dishId: string;
  dishName: string;
  currentPrepMinutes: number | null;
  suggestedPrepMinutes: number;
  sampleCount: number;
  medianDeltaMinutes: number;
};

export function isPrepLearningEnabled(): boolean {
  const v = process.env.PREP_LEARNING_ENABLED?.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

export function clampBias(value: number): number {
  return Math.min(
    Math.max(value, LEARNING_CONFIG.BIAS_CLAMP_MIN),
    LEARNING_CONFIG.BIAS_CLAMP_MAX
  );
}

export async function getGlobalLearningBias(): Promise<number> {
  if (!isPrepLearningEnabled()) {
    return 0;
  }
  const cal = await prisma.prepCalibration.findUnique({ where: { id: CALIBRATION_ID } });
  if (!cal || cal.sampleCount < LEARNING_CONFIG.MIN_SAMPLES) {
    return 0;
  }
  return cal.globalBiasMinutes;
}

async function ensureCalibrationRow() {
  await prisma.prepCalibration.upsert({
    where: { id: CALIBRATION_ID },
    create: { id: CALIBRATION_ID },
    update: {},
  });
}

export async function recordPrepTimeObservation(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { dish: { select: { id: true, name: true, prepTime: true } } } } },
  });

  if (!order?.completedAt || order.prepTime == null || order.paymentStatus !== 'PAID') {
    return;
  }

  const actualPrepMinutes = Math.max(
    1,
    Math.round((order.completedAt.getTime() - order.createdAt.getTime()) / 60_000)
  );
  const projectedPrepMinutes = order.prepTime;
  const deltaMinutes = actualPrepMinutes - projectedPrepMinutes;
  const dishIds = order.items.map((i) => i.dishId);

  await prisma.prepTimeObservation.upsert({
    where: { orderId },
    create: {
      orderId,
      projectedPrepMinutes,
      actualPrepMinutes,
      deltaMinutes,
      dishIds,
    },
    update: {
      projectedPrepMinutes,
      actualPrepMinutes,
      deltaMinutes,
      dishIds,
    },
  });

  await recalculatePrepCalibration();
}

export async function recalculatePrepCalibration(): Promise<void> {
  await ensureCalibrationRow();

  const observations = await prisma.prepTimeObservation.findMany({
    orderBy: { createdAt: 'desc' },
    take: LEARNING_CONFIG.WINDOW_SIZE,
    include: {
      order: {
        include: {
          items: { include: { dish: { select: { id: true, name: true, prepTime: true } } } },
        },
      },
    },
  });

  const sampleCount = observations.length;
  const deltas = observations.map((o) => o.deltaMinutes);
  const medianDelta = sampleCount > 0 ? median(deltas) : 0;

  let globalBiasMinutes = 0;
  if (isPrepLearningEnabled() && sampleCount >= LEARNING_CONFIG.MIN_SAMPLES) {
    globalBiasMinutes = clampBias(medianDelta);
  }

  const dishSuggestions = await buildDishSuggestions(observations);

  await prisma.prepCalibration.update({
    where: { id: CALIBRATION_ID },
    data: {
      globalBiasMinutes,
      sampleCount,
      dishSuggestions: dishSuggestions as object[],
      lastCalculatedAt: new Date(),
    },
  });
}

async function buildDishSuggestions(
  observations: Array<{
    deltaMinutes: number;
    order: {
      items: Array<{ dishId: string; dish: { id: string; name: string; prepTime: number | null } }>;
    };
  }>
): Promise<DishPrepSuggestion[]> {
  const byDish = new Map<string, { name: string; currentPrep: number | null; deltas: number[] }>();

  for (const obs of observations) {
    for (const item of obs.order.items) {
      const entry = byDish.get(item.dishId) ?? {
        name: item.dish.name,
        currentPrep: item.dish.prepTime,
        deltas: [] as number[],
      };
      entry.deltas.push(obs.deltaMinutes);
      byDish.set(item.dishId, entry);
    }
  }

  const suggestions: DishPrepSuggestion[] = [];
  for (const [dishId, data] of byDish) {
    if (data.deltas.length < LEARNING_CONFIG.DISH_MIN_SAMPLES) continue;
    const medianDelta = median(data.deltas);
    const base = data.currentPrep ?? PREP_CONFIG.DEFAULT_DISH_PREP;
    const suggested = Math.min(
      Math.max(base + medianDelta, PREP_CONFIG.MIN_ETA),
      PREP_CONFIG.MAX_ETA
    );
    if (suggested === base) continue;
    suggestions.push({
      dishId,
      dishName: data.name,
      currentPrepMinutes: data.currentPrep,
      suggestedPrepMinutes: suggested,
      sampleCount: data.deltas.length,
      medianDeltaMinutes: medianDelta,
    });
  }

  return suggestions.sort((a, b) => b.sampleCount - a.sampleCount);
}

export async function getPrepIntelligenceSummary() {
  await ensureCalibrationRow();
  const [queueCounts, calibration, observationCount] = await Promise.all([
    getKitchenQueueCounts(),
    prisma.prepCalibration.findUnique({ where: { id: CALIBRATION_ID } }),
    prisma.prepTimeObservation.count(),
  ]);

  const learningEnabled = isPrepLearningEnabled();
  const sampleCount = calibration?.sampleCount ?? observationCount;
  const learningActive = learningEnabled && sampleCount >= LEARNING_CONFIG.MIN_SAMPLES;

  const recent = await prisma.prepTimeObservation.findMany({
    orderBy: { createdAt: 'desc' },
    take: LEARNING_CONFIG.WINDOW_SIZE,
  });
  const medianDelta = recent.length > 0 ? median(recent.map((o) => o.deltaMinutes)) : null;

  return {
    queue: {
      ...queueCounts,
      queueLoadMinutes: queueMinutesFromCounts(queueCounts),
    },
    learning: {
      enabled: learningEnabled,
      active: learningActive,
      sampleCount,
      minSamples: LEARNING_CONFIG.MIN_SAMPLES,
      windowSize: LEARNING_CONFIG.WINDOW_SIZE,
      globalBiasMinutes: learningActive ? calibration?.globalBiasMinutes ?? 0 : 0,
      medianDeltaMinutes: medianDelta,
      dishSuggestions: (calibration?.dishSuggestions as DishPrepSuggestion[] | null) ?? [],
      collectingLabel:
        !learningEnabled
          ? 'Learning disabled (set PREP_LEARNING_ENABLED on production when ready)'
          : sampleCount < LEARNING_CONFIG.MIN_SAMPLES
            ? `Collecting data (${sampleCount}/${LEARNING_CONFIG.MIN_SAMPLES} orders)`
            : 'Learning active',
    },
  };
}

export async function setOrderPrepTimeOverride(orderId: string, prepTimeMinutes: number) {
  if (!Number.isFinite(prepTimeMinutes) || prepTimeMinutes < PREP_CONFIG.MIN_ETA || prepTimeMinutes > PREP_CONFIG.MAX_ETA) {
    throw new AppError(
      `Prep time must be between ${PREP_CONFIG.MIN_ETA} and ${PREP_CONFIG.MAX_ETA} minutes`,
      400
    );
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
    throw new AppError('Cannot adjust prep time on completed or cancelled orders', 400);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      prepTime: Math.round(prepTimeMinutes),
      prepTimeSource: 'CHEF_OVERRIDE',
      prepTimeUpdatedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { dish: { include: { category: true } } } },
    },
  });
}
