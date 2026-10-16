export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface SpotRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  latitude: number;
  longitude: number;
  location_description: string | null;
  hours: string;
  operating_hours: Json | null;
  noise_level: string | null;
  outlets_available: boolean | null;
  has_outlets: boolean;
  has_wifi: boolean;
  has_aircon: boolean;
  has_restroom: boolean;
  is_shaded: boolean;
  is_quiet: boolean;
  image_url: string | null;
  image_path: string | null;
  is_active: boolean;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  admin_edited: boolean;
  open_time: string | null;
  close_time: string | null;
  budget_range: string | null;
  created_at: string;
}

export type SpotInsert = Pick<
  SpotRow,
  'name' | 'category' | 'latitude' | 'longitude' | 'hours'
> &
  Partial<
    Omit<
      SpotRow,
      'name' | 'category' | 'latitude' | 'longitude' | 'hours'
    >
  >;

export type SpotUpdate = Partial<
  Omit<SpotRow, 'id' | 'created_at'>
>;

export interface Database {
  public: {
    Tables: {
      spots: {
        Row: SpotRow;
        Insert: SpotInsert;
        Update: SpotUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
