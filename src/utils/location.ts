import type { SpotRow } from '../types/database';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';

const EARTH_RADIUS_KM = 6371.0088;
const BUSINESS_TIME_ZONE = 'Asia/Manila';
const HOURS_RANGE_PATTERN =
  /^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/i;

export type OpeningStatus = 'open' | 'closed' | 'unavailable';

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

export function getOpenStreetMapDirectionsUrl(
  destination: Pick<SpotRow, 'latitude' | 'longitude'>,
): string {
  const route = [
    `${BULSU_MENESES_CAMPUS.latitude},${BULSU_MENESES_CAMPUS.longitude}`,
    `${destination.latitude},${destination.longitude}`,
  ]
    .map((point) => encodeURIComponent(point))
    .join('%3B');

  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${route}`;
}
