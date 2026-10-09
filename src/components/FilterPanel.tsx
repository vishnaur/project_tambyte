import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { SpotRow } from '../types/database';

interface FilterPanelProps {
  className?: string;
  id: string;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  locations: readonly SpotRow[];
  selectedSpotId: string | null;
  onLocateLocation: (location: SpotRow) => void;
}

export function FilterPanel({
  className = '',
  id,
  categories,
  selectedCategory,
  onCategoryChange,
  locations,
  selectedSpotId,
  onLocateLocation,
}: FilterPanelProps) {
  const hasSelectedCategory = selectedCategory !== '__all__';
  const visibleLocations = hasSelectedCategory
    ? locations.filter((location) => location.category?.trim() === selectedCategory.trim())
    : locations;

  return (
    <aside
      className={`flex flex-col bg-warm-cream p-5 lg:p-6 border-r border-slate-200 ${className}`}
      aria-label="Place filters"
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900">Ready To Grab A Byte?</h2>
        <p className="mt-1 text-xs text-slate-500">
          Explore Tambayan And Study Spaces Around Our Campus By Category.
        </p>
      </div>

      <div>
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600"
        >
          Category
        </label>
        <div className="relative">
          <select
            id={id}
            value={selectedCategory}
            onChange={(event) => onCategoryChange(event.target.value)}
            className={`category-select min-h-[44px] w-full appearance-none rounded-xl border px-3 pr-9 text-sm transition-colors focus:outline-none ${
              hasSelectedCategory
                ? 'border-gold bg-gold/20 font-semibold text-deep-maroon shadow-sm ring-2 ring-gold/40 focus:border-gold focus:ring-gold/50'
                : 'border-slate-200 bg-gold/50 text-slate-800 focus:border-dark-burgundy focus:bg-gold/50 focus:ring-2 focus:ring-dark-burgundy/20'
            }`}
          >
            <option value="__all__">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </div>

      <section className="mt-6" aria-labelledby={`${id}-spots-heading`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3
              id={`${id}-spots-heading`}
              className="text-xs font-semibold uppercase tracking-wider text-dark-burgundy"
            >
              {hasSelectedCategory ? `${selectedCategory} spots` : 'Available spots'}
            </h3>
            <span className="rounded-full bg-gold/30 px-2 py-0.5 text-[11px] font-semibold text-deep-maroon">
              {visibleLocations.length}
            </span>
          </div>

          {visibleLocations.length ? (
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
                      <span className="block text-sm font-semibold text-deep-maroon">
                        {location.name}
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
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-600">
              {hasSelectedCategory
                ? 'No spots found in this category.'
                : 'No spots are currently available.'}
            </p>
          )}
      </section>
    </aside>
  );
}
