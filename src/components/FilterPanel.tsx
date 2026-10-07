import React, { useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface FilterPanelProps {
  className?: string;
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  searchQuery: string;
  category: string;
  isOpenNow: boolean;
}

export function FilterPanel({ className = '', onFilterChange }: FilterPanelProps) {
  // Local state for interactive preview of the layout shell controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isOpenNow, setIsOpenNow] = useState(false);

  // Category list as requested: Quiet Study, Tambay, Food, Outlets, Shaded
  const categories = [
    'All Tags',
    'Quiet Study',
    'Tambay',
    'Food',
    'Outlets',
    'Shaded',
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    // PHASE 2 NOTE: Connect to client-side debounce and Supabase text search query
    onFilterChange?.({ searchQuery: val, category: selectedCategory, isOpenNow });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCategory(val);
    // PHASE 2 NOTE: Query Supabase spots table filtered by spot_category = val
    onFilterChange?.({ searchQuery, category: val, isOpenNow });
  };

  const handleToggleOpenNow = () => {
    const nextVal = !isOpenNow;
    setIsOpenNow(nextVal);
    // PHASE 2 NOTE: Filter spots matching current day of week and campus operating hours
    onFilterChange?.({ searchQuery, category: selectedCategory, isOpenNow: nextVal });
  };

  return (
    <aside
      className={`flex flex-col bg-white p-5 lg:p-6 border-r border-slate-200 ${className}`}
      aria-label="Spot filters"
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900">Spot Filters</h2>
        <p className="mt-1 text-xs text-slate-500">
          Find suitable places to study or tambay across campus.
        </p>
      </div>

      <div className="space-y-5">
        {/* 1. Search input */}
        {/* PHASE 2 NOTE: Attach to Supabase full-text search index (name, description, building) */}
        <div>
          <label
            htmlFor="spot-search"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
          >
            Search Spots
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" aria-hidden="true" />
            </div>
            <input
              id="spot-search"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="e.g. Science Library, Gazebo..."
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
        </div>

        {/* 2. Category dropdown */}
        {/* PHASE 2 NOTE: Populate categories dynamically from Supabase spot_categories table */}
        <div>
          <label
            htmlFor="category-select"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
          >
            Category
          </label>
          <div className="relative">
            <select
              id="category-select"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full min-h-[44px] appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 pr-9 text-sm text-slate-800 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            >
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

        {/* 3. "Open now" toggle */}
        {/* PHASE 2 NOTE: Evaluate spot operating_hours JSON column against current client timestamp */}
        <div className="pt-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="open-now-toggle"
              className="cursor-pointer text-sm font-medium text-slate-800 select-none"
            >
              Open now
              <span className="block text-xs font-normal text-slate-500">
                Show locations open right now
              </span>
            </label>
            <button
              id="open-now-toggle"
              type="button"
              role="switch"
              aria-checked={isOpenNow}
              onClick={handleToggleOpenNow}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                isOpenNow ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <span className="sr-only">Toggle open now filter</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isOpenNow ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Phase 2 Feature Note Card */}
        <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <span>Phase 1 Foundation</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Placeholder controls ready. In Phase 2, this panel will bind directly
            to Supabase real-time subscriptions and filter reactive markers.
          </p>
        </div>
      </div>
    </aside>
  );
}
