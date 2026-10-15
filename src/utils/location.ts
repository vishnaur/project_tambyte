import type { SpotRow } from '../types/database';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';

const EARTH_RADIUS_KM = 6371.0088;
const BUSINESS_TIME_ZONE = 'Asia/Manila';
const HOURS_RANGE_PATTERN =
  /^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/i;

export type OpeningStatus = 'open' | 'closed' | 'unavailable';

export interface WalkingRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function calculateDistanceKm(
  origin: Pick<SpotRow, 'latitude' | 'longitude'>,
  destination: Pick<SpotRow, 'latitude' | 'longitude'>,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function timeToMinutes(hour: number, minute: number, meridiem: string): number | null {
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  const hour24 = (hour % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
  return hour24 * 60 + minute;
}

function getManilaMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
}

export function getOpeningStatus(hours: string | null | undefined, now = new Date()): OpeningStatus {
  if (!hours?.trim()) {
    return 'unavailable';
  }

  if (/^\s*closed\s*$/i.test(hours)) {
    return 'closed';
  }

  const match = HOURS_RANGE_PATTERN.exec(hours);
  if (!match) {
    return 'unavailable';
  }

  const openingMinutes = timeToMinutes(Number(match[1]), Number(match[2] ?? 0), match[3]);
  const closingMinutes = timeToMinutes(Number(match[4]), Number(match[5] ?? 0), match[6]);
  if (openingMinutes === null || closingMinutes === null || openingMinutes === closingMinutes) {
    return 'unavailable';
  }

  const currentMinutes = getManilaMinutes(now);
  const isOpen =
    closingMinutes > openingMinutes
      ? currentMinutes >= openingMinutes && currentMinutes < closingMinutes
      : currentMinutes >= openingMinutes || currentMinutes < closingMinutes;

  return isOpen ? 'open' : 'closed';
}

export async function getWalkingRoute(
  destination: Pick<SpotRow, 'latitude' | 'longitude'>,
  signal?: AbortSignal,
): Promise<WalkingRoute> {
  const coordinates = [
    `${BULSU_MENESES_CAMPUS.longitude},${BULSU_MENESES_CAMPUS.latitude}`,
    `${destination.longitude},${destination.latitude}`,
  ].join(';');
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  });
  const response = await fetch(
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordinates}?${params}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Walking directions service returned ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || payload.code !== 'Ok' || !Array.isArray(payload.routes)) {
    throw new Error('Walking directions are unavailable for this location.');
  }

  const route = payload.routes[0];
  if (
    !isRecord(route) ||
    typeof route.distance !== 'number' ||
    !Number.isFinite(route.distance) ||
    typeof route.duration !== 'number' ||
    !Number.isFinite(route.duration) ||
    !isRecord(route.geometry) ||
    !Array.isArray(route.geometry.coordinates)
  ) {
    throw new Error('Walking directions service returned an unexpected route.');
  }

  const routeCoordinates = route.geometry.coordinates;
  const parsedCoordinates: [number, number][] = [];
  for (const coordinate of routeCoordinates) {
    if (
      !Array.isArray(coordinate) ||
      typeof coordinate[0] !== 'number' ||
      !Number.isFinite(coordinate[0]) ||
      typeof coordinate[1] !== 'number' ||
      !Number.isFinite(coordinate[1])
    ) {
      throw new Error('Walking directions service returned invalid map coordinates.');
    }
    parsedCoordinates.push([coordinate[1], coordinate[0]]);
  }

  if (parsedCoordinates.length < 2) {
    throw new Error('Walking directions service returned an incomplete route.');
  }

  return {
    coordinates: parsedCoordinates,
    distanceKm: route.distance / 1000,
    durationMinutes: Math.max(1, Math.ceil(route.duration / 60)),
  };
}
