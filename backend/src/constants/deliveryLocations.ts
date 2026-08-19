/** Captain-approved dorm delivery locations (Slice 4). */
export const DELIVERY_DORMS = [
  'Harvey Hall',
  'Tantum Hall',
  'Bethune Hall',
  'Banneker Hall',
  'Younge Hall',
  'James Hall',
  'Olivia Davidson Hall',
  'Adams Hall',
  'Douglass Hall',
  'White Hall',
  'Rockefeller Hall',
  'Sage Hall',
  'Emery 1 Hall',
  'Emery 2 Hall',
  'Emery 3 Hall',
  'Emery 4 Hall',
  'East',
  'North',
  'West',
  'Marable',
] as const;

export type DeliveryDorm = (typeof DELIVERY_DORMS)[number];

export const DELIVERY_DORMS_REQUIRING_ROOM: DeliveryDorm[] = [
  'East',
  'North',
  'West',
  'Marable',
];

const dormSet = new Set<string>(DELIVERY_DORMS);

export function dormRequiresRoom(dorm: string): boolean {
  return DELIVERY_DORMS_REQUIRING_ROOM.includes(dorm as DeliveryDorm);
}

export function isKnownDeliveryDorm(dorm: string): dorm is DeliveryDorm {
  return dormSet.has(dorm);
}

/** Builds the persisted `deliveryLocation` value from checkout selections. */
export function formatDeliveryLocation(dorm: string, roomNumber?: string | null): string {
  const trimmedDorm = dorm.trim();
  if (!isKnownDeliveryDorm(trimmedDorm)) {
    throw new Error('Invalid delivery dorm');
  }
  if (dormRequiresRoom(trimmedDorm)) {
    const room = roomNumber?.trim();
    if (!room) {
      throw new Error('Room number is required');
    }
    if (room.length > 20) {
      throw new Error('Room number is too long');
    }
    return `${trimmedDorm} (Room ${room})`;
  }
  return trimmedDorm;
}

export function parseDeliveryLocation(value: string | null | undefined): {
  dorm: string;
  roomNumber: string | null;
} | null {
  if (!value?.trim()) {
    return null;
  }
  const match = value.match(/^(.+?) \(Room (.+)\)$/);
  if (match) {
    return { dorm: match[1], roomNumber: match[2] };
  }
  return { dorm: value, roomNumber: null };
}
