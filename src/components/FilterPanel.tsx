import React from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterPanelProps {
  className?: string;
  id: string;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function FilterPanel({
  className = '',
  id,
  categories,
  selectedCategory,
  onCategoryChange,
}: FilterPanelProps) {
  return (
    <aside
      className={`flex flex-col bg-white p-5 lg:p-6 border-r border-slate-200 ${className}`}
      aria-label="Place filters"
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900">Where should I go?</h2>
        <p className="mt-1 text-xs text-slate-500">
          Find places around BulSU Meneses Campus by category.
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
            className="min-h-[44px] w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 pr-9 text-sm text-slate-800 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          >
            <option value="__all__">All categories</option>
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
    </aside>
  );
}
