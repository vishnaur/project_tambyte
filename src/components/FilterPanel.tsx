import React from 'react';
import {
  BookOpen,
  Coffee,
  Ellipsis,
  Layers3,
  ShoppingBag,
  Tags,
  Clock3,
  Utensils,
  Wifi,
  Zap,
  Wind,
  Bath,
  TreePine,
  VolumeX,
  Footprints,
  Heart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SpotRow } from '../types/database';
import { getOpeningStatus } from '../utils/location';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';

interface FilterPanelProps {
  className?: string;
  id: string;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  openNowFilter: boolean;
  onOpenNowChange: (enabled: boolean) => void;
  locations: readonly SpotRow[];
  selectedSpotId: string | null;
  onLocateLocation: (location: SpotRow) => void;
  favoriteIds: readonly string[];
  onToggleFavorite: (spotId: string) => void;
  view: 'spots' | 'favorites';
  onViewChange: (view: 'spots' | 'favorites') => void;
}

const MAIN_CATEGORIES: Array<{ label: string; value: string; Icon: LucideIcon }> = [
  { label: 'All Categories', value: '__all__', Icon: Layers3 },
  { label: 'Food', value: 'Food', Icon: Utensils },
  { label: 'Relaxation', value: 'Relaxation', Icon: Coffee },
  { label: 'Shopping', value: 'Shopping', Icon: ShoppingBag },
  { label: 'Study', value: 'Study', Icon: BookOpen },
  { label: 'Other', value: 'Other', Icon: Ellipsis },
];

// Calculates walking minutes (assumes standard ~80 meters/minute walking speed)
function calculateWalkMinutes(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;

  const minutes = Math.round(meters / 80);
  return Math.max(1, minutes); // Minimum 1 min
}

// Retrieves up to 3 amenity icons tagged on this spot
function getSpotAmenities(location: SpotRow) {
  const list: Array<{ label: string; Icon: LucideIcon }> = [];
  if (location.has_wifi) list.push({ label: 'Wi-Fi', Icon: Wifi });
  if (location.has_outlets) list.push({ label: 'Outlets', Icon: Zap });
  if (location.has_aircon) list.push({ label: 'Aircon', Icon: Wind });
  if (location.has_restroom) list.push({ label: 'Restroom', Icon: Bath });
  if (location.is_shaded) list.push({ label: 'Shaded', Icon: TreePine });
  if (location.is_quiet) list.push({ label: 'Quiet', Icon: VolumeX });
  return list.slice(0, 3);
}

export function FilterPanel({
  className = '',
  id,
  categories,
  selectedCategory,
  onCategoryChange,
  openNowFilter,
  onOpenNowChange,
  locations,
  selectedSpotId,
  onLocateLocation,
  favoriteIds,
  onToggleFavorite,
  view,
  onViewChange,
}: FilterPanelProps) {
  const extraCategories = categories
    .filter((category) => !MAIN_CATEGORIES.some((option) => option.value === category))
    .map((category) => ({ label: category, value: category, Icon: Tags }));

  // Keep all standard categories + extras, and push 'Other' to the very end
  const withoutOther = MAIN_CATEGORIES.filter((c) => c.value !== 'Other');
  const otherCategory = MAIN_CATEGORIES.find((c) => c.value === 'Other') ?? {
    label: 'Other',
    value: 'Other',
    Icon: Ellipsis,
  };
  const categoryOptions = [...withoutOther, ...extraCategories, otherCategory];
  const openLocations = locations.filter((location) => getOpeningStatus(location.hours) === 'open');
  const categoryLocations = selectedCategory === '__all__'
    ? locations
    : locations.filter((location) => location.category?.trim() === selectedCategory.trim());
  const visibleLocations = categoryLocations.filter(
    (location) =>
      (view !== 'favorites' || favoriteIds.includes(location.id)) &&
      (!openNowFilter || getOpeningStatus(location.hours) === 'open'),
  );
  const hasSelectedCategory = selectedCategory !== '__all__';

  return (
    <aside
      className={`flex h-full min-h-0 flex-col border-r border-slate-200 bg-warm-cream p-4 ${className}`}
      aria-label="Place filters"
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Ready To Grab A Byte?</h2>
        <p className="mt-1 text-xs text-slate-500">
          Explore Tambayan And Study Spaces Around Our Campus.
        </p>
      </div>

      <nav aria-label="Place categories" className="shrink-0 space-y-2">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="category-select" className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Browse Category
          </label>
          <span className="rounded-full bg-gold/30 px-2 py-0.5 text-[10px] font-bold text-deep-maroon">
            {locations.length} total
          </span>
        </div>

        {/* Compact Category Dropdown */}
        <div className="relative">
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-8 text-xs font-semibold text-deep-maroon shadow-sm transition-colors focus:border-dark-burgundy focus:outline-none focus:ring-1 focus:ring-dark-burgundy cursor-pointer"
          >
            {categoryOptions.map(({ label, value }) => {
              const count =
                value === '__all__'
                  ? locations.length
                  : locations.filter((loc) => loc.category?.trim() === value).length;

              return (
                <option key={value} value={value}>
                  {label} ({count})
                </option>
              );
            })}
          </select>
          {/* Custom dropdown chevron arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-dark-burgundy">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Open Now Filter Toggle */}
        <button
          type="button"
          onClick={() => onOpenNowChange(!openNowFilter)}
          aria-pressed={openNowFilter}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy ${
            openNowFilter
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm'
              : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-gold/15'
          }`}
        >
          <span className="flex items-center gap-2">
            <Clock3 className={`h-3.5 w-3.5 ${openNowFilter ? 'text-emerald-600' : 'text-dark-burgundy'}`} />
            Open Now Only
          </span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              openNowFilter ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {openLocations.length}
          </span>
        </button>
      </nav>

      <section
        className="mt-5 flex min-h-0 flex-1 flex-col"
        aria-labelledby={`${id}-spots-heading`}
      >
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-gold/15 p-1">
          <button
            type="button"
            onClick={() => onViewChange('spots')}
            aria-pressed={view === 'spots'}
            className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy ${
              view === 'spots'
                ? 'bg-white text-dark-burgundy shadow-sm'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            All spots
          </button>
          <button
            type="button"
            onClick={() => onViewChange('favorites')}
            aria-pressed={view === 'favorites'}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy ${
              view === 'favorites'
                ? 'bg-white text-deep-crimson shadow-sm'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            Favorites
            <span className="rounded-full bg-gold/30 px-1.5 py-0.5 text-[10px] text-deep-maroon">
              {favoriteIds.length}
            </span>
          </button>
        </div>

        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <h3
            id={`${id}-spots-heading`}
            className="text-xs font-semibold uppercase tracking-wider text-dark-burgundy"
          >
            {view === 'favorites'
              ? 'Your favorites'
              : openNowFilter
                ? 'Open now spots'
                : hasSelectedCategory
                  ? `${selectedCategory} spots`
                  : 'Available spots'}
          </h3>
          <span className="rounded-full bg-gold/30 px-2 py-0.5 text-[11px] font-semibold text-deep-maroon">
            {visibleLocations.length}
          </span>
        </div>

        {visibleLocations.length ? (
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            <ul className="space-y-2">
              {visibleLocations.map((location) => {
                const hasCoordinates =
                  Number.isFinite(location.latitude) &&
                  Number.isFinite(location.longitude) &&
                  location.latitude >= -90 &&
                  location.latitude <= 90 &&
                  location.longitude >= -180 &&
                  location.longitude <= 180;
                const isSelected = selectedSpotId === location.id;
                const isFavorite = favoriteIds.includes(location.id);
                const amenities = getSpotAmenities(location);

                return (
                  <li key={location.id} className="relative">
                    <button
                      type="button"
                      onClick={() => onLocateLocation(location)}
                      disabled={!hasCoordinates}
                      aria-current={isSelected ? 'location' : undefined}
                      className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? 'border-gold bg-gold/25 shadow-sm'
                          : 'border-slate-200 bg-white/80 hover:border-gold hover:bg-gold/10'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2 pr-8">
                        <span className="text-sm font-semibold text-deep-maroon">{location.name}</span>
                        {getOpeningStatus(location.hours) === 'open' && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            Open
                          </span>
                        )}
                      </span>

                      {!hasSelectedCategory && (
                        <span className="mt-1 inline-flex rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-dark-burgundy">
                          {location.category}
                        </span>
                      )}

                      {/* Walk minutes, Budget, and up to 3 amenity icons */}
                      <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {hasCoordinates && (
                            <span className="inline-flex items-center gap-1 font-medium text-dark-burgundy">
                              <Footprints className="h-3.5 w-3.5 text-gold shrink-0" />
                              {calculateWalkMinutes(
                                BULSU_MENESES_CAMPUS.latitude,
                                BULSU_MENESES_CAMPUS.longitude,
                                Number(location.latitude),
                                Number(location.longitude),
                              )}{' '}
                              min walk
                            </span>
                          )}

                          {location.budget_range && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold text-slate-700">
                                {location.budget_range}
                              </span>
                            </>
                          )}
                        </div>

                        {amenities.length > 0 && (
                          <div className="flex shrink-0 items-center gap-1 text-slate-500">
                            {amenities.map(({ label, Icon }) => (
                              <span
                                key={label}
                                title={label}
                                className="rounded-md bg-slate-100 p-1 text-slate-600 hover:bg-gold/30 hover:text-dark-burgundy transition-colors"
                              >
                                <Icon className="h-3 w-3" />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(location.id)}
                      aria-label={isFavorite ? `Remove ${location.name} from favorites` : `Add ${location.name} to favorites`}
                      aria-pressed={isFavorite}
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy ${
                        isFavorite
                          ? 'text-deep-crimson hover:bg-rose-100'
                          : 'text-slate-400 hover:bg-gold/20 hover:text-deep-crimson'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-600">
            {view === 'favorites'
              ? favoriteIds.length
                ? 'No saved favorites match the current filters.'
                : 'Tap the heart on any spot to save it here on this device.'
              : openNowFilter
                ? 'No currently open spots match this category.'
                : hasSelectedCategory
                  ? 'No spots found in this category.'
                  : 'No spots are currently available.'}
          </p>
        )}
      </section>
    </aside>
  );
}