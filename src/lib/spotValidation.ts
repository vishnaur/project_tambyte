export const SPOT_CATEGORIES = [
  'Food',
  'Study',
  'Relaxation',
  'Recreation',
  'Shopping',
  'Essentials',
  'Other',
] as const;

export const MAX_SPOT_IMAGE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_SPOT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface SpotSubmissionInput {
  name: string;
  category: string;
  description: string;
  locationDescription: string;
  hours: string;
  budgetRange: string;
  latitude: number;
  longitude: number;
}

export function validateSpotSubmission(input: SpotSubmissionInput): string | null {
  if (!input.name.trim() || input.name.trim().length > 120) {
    return 'Place name is required and must be 120 characters or fewer.';
  }
  if (!(SPOT_CATEGORIES as readonly string[]).includes(input.category)) {
    return 'Choose a valid place category.';
  }
  if (input.description.length > 2000) {
    return 'Description must be 2,000 characters or fewer.';
  }
  if (input.locationDescription.length > 300) {
    return 'Location description must be 300 characters or fewer.';
  }
  if (!input.hours.trim() || input.hours.trim().length > 120) {
    return 'Operating hours are required and must be 120 characters or fewer.';
  }
  if (input.budgetRange.length > 100) {
    return 'Budget range must be 100 characters or fewer.';
  }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    return 'Latitude must be a valid coordinate between -90 and 90.';
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    return 'Longitude must be a valid coordinate between -180 and 180.';
  }
  return null;
}

export function validateSpotImage(file: Pick<File, 'size' | 'type'>): string | null {
  if (!(ALLOWED_SPOT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a JPEG, PNG, or WebP image.';
  }
  if (file.size <= 0 || file.size > MAX_SPOT_IMAGE_SIZE) {
    return 'Images must be larger than 0 bytes and 5 MB or smaller.';
  }
  return null;
}

export function validateSpotImageBytes(type: string, bytes: Uint8Array): string | null {
  const isJpeg =
    type === 'image/jpeg' &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    type === 'image/png' &&
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    type === 'image/webp' &&
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  return isJpeg || isPng || isWebp
    ? null
    : 'The selected file does not match its declared image format.';
}
