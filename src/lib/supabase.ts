import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase Environment Variables! Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  image_url?: string | null;
  approved: boolean;
  admin_edited?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
}

const SPOT_IMAGE_BUCKET = 'spot-images';
const MAX_SPOT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_SPOT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadSpotImage(file: File): Promise<string> {
  if (!ALLOWED_SPOT_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_SPOT_IMAGE_SIZE) {
    throw new Error('Images must be 5 MB or smaller.');
  }

  const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(SPOT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', contentType: file.type });

  if (error) {
    throw new Error(`Unable to upload image: ${error.message}`);
  }

  return supabase.storage.from(SPOT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// 1. Fetch approved spots for regular visitors to see on the map
export async function getApprovedSpots() {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('approved', true);

  if (error) {
    console.error('Error fetching spots:', error.message);
    return [];
  }
  return data as Spot[];
}

// 2. Allow any visitor to contribute a spot (pending admin approval)
export async function submitSpot(newSpot: Omit<Spot, 'id' | 'approved' | 'created_at'>) {
  const { data, error } = await supabase
    .from('spots')
    .insert([
      {
        ...newSpot,
        approved: false // Enforced by database RLS
      }
    ]);

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