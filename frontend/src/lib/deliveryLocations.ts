/** Captain-approved dorm delivery locations (Slice 4). Keep in sync with backend constants. */
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

export function dormRequiresRoom(dorm: string): boolean {
  return DELIVERY_DORMS_REQUIRING_ROOM.includes(dorm as DeliveryDorm);
}

export function canProceedToPayment(dorm: string, roomNumber: string): boolean {
  if (!dorm) {
    return false;
  }
  if (dormRequiresRoom(dorm)) {
    return roomNumber.trim().length > 0;
  }
  return DELIVERY_DORMS.includes(dorm as DeliveryDorm);
}
