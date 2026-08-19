import { AppError } from '../middleware/errorHandler';
import {
  formatDeliveryLocation,
  isKnownDeliveryDorm,
  dormRequiresRoom,
} from '../constants/deliveryLocations';

export type DeliveryInput = {
  deliveryDorm: string;
  deliveryRoomNumber?: string | null;
};

export function resolveDeliveryLocation(input: DeliveryInput): string {
  const dorm = input.deliveryDorm?.trim();
  if (!dorm) {
    throw new AppError('Delivery dorm is required', 400);
  }
  if (!isKnownDeliveryDorm(dorm)) {
    throw new AppError('Invalid delivery dorm', 400);
  }
  if (dormRequiresRoom(dorm) && !input.deliveryRoomNumber?.trim()) {
    throw new AppError('Room number is required for this dorm', 400);
  }
  try {
    return formatDeliveryLocation(dorm, input.deliveryRoomNumber);
  } catch {
    throw new AppError('Invalid delivery location', 400);
  }
}
