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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SpotRow } from '../types/database';
import { getOpeningStatus } from '../utils/location';

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
}

const MAIN_CATEGORIES: Array<{ label: string; value: string; Icon: LucideIcon }> = [
  { label: 'All Categories', value: '__all__', Icon: Layers3 },
  { label: 'Food', value: 'Food', Icon: Utensils },
  { label: 'Relaxation', value: 'Relaxation', Icon: Coffee },
  { label: 'Shopping', value: 'Shopping', Icon: ShoppingBag },
  { label: 'Study', value: 'Study', Icon: BookOpen },
  { label: 'Other', value: 'Other', Icon: Ellipsis },
];

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
}: FilterPanelProps) {
  const extraCategories = categories
    .filter((category) => !MAIN_CATEGORIES.some((option) => option.value === category))
    .map((category) => ({ label: category, value: category, Icon: Tags }));
  const categoryOptions = [...MAIN_CATEGORIES, ...extraCategories];
  const openLocations = locations.filter((location) => getOpeningStatus(location.hours) === 'open');
  const categoryLocations = selectedCategory === '__all__'
    ? locations
    : locations.filter((location) => location.category?.trim() === selectedCategory.trim());
  const visibleLocations = categoryLocations.filter(
    (location) => !openNowFilter || getOpeningStatus(location.hours) === 'open',
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

      <nav aria-label="Place categories" className="shrink-0">
        <h3 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Browse places
        </h3>
        <ul className="space-y-1">
          {categoryOptions.map(({ label, value, Icon }) => {
            const isSelected = selectedCategory === value;
            const count = value === '__all__'
              ? locations.length
              : locations.filter((location) => location.category?.trim() === value).length;

            return (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(value)}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy ${
                    isSelected
                      ? 'bg-gold/35 font-semibold text-deep-maroon'
                      : 'text-slate-700 hover:bg-gold/15'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-dark-burgundy" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] ${
                    isSelected ? 'bg-gold/50 text-deep-maroon' : 'bg-white/70 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="my-3 border-t border-dark-burgundy/10" />

        <button
          type="button"
          onClick={() => onOpenNowChange(!openNowFilter)}
          aria-pressed={openNowFilter}
          className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy ${
            openNowFilter
              ? 'bg-gold/35 font-semibold text-deep-maroon'
              : 'text-slate-700 hover:bg-gold/15'
          }`}
        >
          <Clock3 className="h-4 w-4 shrink-0 text-dark-burgundy" aria-hidden="true" />
          <span className="min-w-0 flex-1">Open Now</span>
          <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] ${
            openNowFilter ? 'bg-gold/50 text-deep-maroon' : 'bg-white/70 text-slate-500'
          }`}>
            {openLocations.length}
          </span>
        </button>
      </nav>

      <section
        className="mt-5 flex min-h-0 flex-1 flex-col"
        aria-labelledby={`${id}-spots-heading`}
      >
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <h3
            id={`${id}-spots-heading`}
            className="text-xs font-semibold uppercase tracking-wider text-dark-burgundy"
          >
            {openNowFilter ? 'Open now spots' : hasSelectedCategory ? `${selectedCategory} spots` : 'Available spots'}
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

                return (
                  <li key={location.id}>
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
                      <span className="flex items-start justify-between gap-2">
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
                      <span className="mt-1 block text-xs text-slate-600">
                        {hasCoordinates
                          ? location.location_description || 'Tap to view on map'
                          : 'Map location unavailable'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-600">
            {openNowFilter
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
