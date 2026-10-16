import { createClient } from '@supabase/supabase-js';
import { validateSpotImage, validateSpotImageBytes } from './spotValidation';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase Environment Variables! Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return false;

  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

// Data structure matching your spots table
export interface Spot {
  id: string;
  name: string;
  category: 'Food' | 'Study' | 'Relaxation' | 'Recreation' | 'Shopping' | 'Essentials' | 'Other';
  description?: string;
  location_description?: string;
  latitude: number;
  longitude: number;
  hours: string;
  open_time: string;
  close_time: string;
  budget_range?: string;
  estimated_walk_mins?: number;
  has_outlets?: boolean;
  has_wifi?: boolean;
  has_aircon?: boolean;
  has_restroom?: boolean;
  is_shaded?: boolean;
  is_quiet?: boolean;
  is_active?: boolean;
  image_path?: string | null;
  image_url?: string | null;
  approved: boolean;
  admin_edited?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
}

const SPOT_IMAGE_BUCKET = 'spot-images';
const SIGNED_IMAGE_URL_TTL_SECONDS = 15 * 60;

function isSpotImagePath(path: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(path);
}

export async function uploadSpotImage(file: File): Promise<string> {
  const validationError = validateSpotImage(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const signatureError = validateSpotImageBytes(
    file.type,
    new Uint8Array(await file.slice(0, 12).arrayBuffer()),
  );
  if (signatureError) {
    throw new Error(signatureError);
  }

  const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(SPOT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Unable to upload image: ${error.message}`);
  }

  return path;
}

export async function createSignedSpotImageUrl(path: string): Promise<string> {
  if (!isSpotImagePath(path)) {
    throw new Error('Invalid spot image path.');
  }

  const { data, error } = await supabase.storage
    .from(SPOT_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_IMAGE_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error('Unable to refresh the spot image.');
  }
  return data.signedUrl;
}

export async function withSignedSpotImages<T extends Pick<Spot, 'image_path' | 'image_url'>>(
  spots: T[],
): Promise<Array<T & { image_url: string | null }>> {
  const paths = [...new Set(spots.map((spot) => spot.image_path).filter((path): path is string => Boolean(path)))];
  if (paths.some((path) => !isSpotImagePath(path))) {
    throw new Error('A spot contains an invalid image path.');
  }
  if (paths.length === 0) {
    return spots.map((spot) => ({ ...spot, image_url: spot.image_url ?? null }));
  }

  const { data, error } = await supabase.storage
    .from(SPOT_IMAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_IMAGE_URL_TTL_SECONDS);

  if (error || !data) {
    throw new Error(`Unable to load spot images: ${error?.message ?? 'No signed URL data returned.'}`);
  }

  const signedUrls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      signedUrls.set(item.path, item.signedUrl);
    }
  }

  return spots.map((spot) => {
    if (!spot.image_path) {
      return { ...spot, image_url: spot.image_url ?? null };
    }

    const signedUrl = signedUrls.get(spot.image_path);
    if (!signedUrl) {
      throw new Error(`Unable to create a signed URL for spot image "${spot.image_path}".`);
    }
    return { ...spot, image_url: signedUrl };
  });
}

// 1. Fetch approved spots for regular visitors to see on the map
export async function getApprovedSpots() {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('approved', true);

  if (error) {
    throw new Error(`Unable to fetch spots: ${error.message}`);
  }
  return withSignedSpotImages((data as Spot[] | null) ?? []);
}

// 2. Allow any visitor to contribute a spot (pending admin approval)
export async function submitSpot(
  newSpot: Omit<Spot, 'id' | 'approved' | 'approved_by' | 'approved_at' | 'admin_edited' | 'created_at'>,
) {
  const { data, error } = await supabase
    .from('spots')
    .insert([newSpot]);

  if (error) {
    console.error('Error submitting spot:', error.message);
    throw error;
  }
  return data;
}

// 3. Helper to check if a spot is currently open (handles midnight crossover)
export function isSpotOpenNow(openTimeStr: string, closeTimeStr: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = openTimeStr.split(':').map(Number);
  const [closeH, closeM] = closeTimeStr.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }
  return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
}