import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Navigation, X, CheckCircle } from 'lucide-react';

interface ContributeSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ContributeSpotModal({ isOpen, onClose, onSubmitted }: ContributeSpotModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Food' | 'Study' | 'Relaxation' | 'Recreation' | 'Shopping' | 'Essentials' | 'Other'>('Food');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [hours, setHours] = useState('8:00 AM - 5:00 PM');
  const [openTime, setOpenTime] = useState('08:00:00');
  const [closeTime, setCloseTime] = useState('17:00:00');
  const [budgetRange, setBudgetRange] = useState('Php 50 - 100');

  // Amenities
  const [hasOutlets, setHasOutlets] = useState(false);
  const [isShaded, setIsShaded] = useState(false);
  const [isQuiet, setIsQuiet] = useState(false);

  // Client-side GPS detection
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      detectCurrentLocation();
    } else {
      setIsSuccess(false);
    }
  }, [isOpen]);

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('GPS not supported by your browser.');
      setLatitude(14.7937);
      setLongitude(120.8735);
      return;
    }

    setIsDetectingLocation(true);
    setLocationStatus('Getting your GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsDetectingLocation(false);
        setLocationStatus('Location detected successfully.');
      },
      () => {
        setIsDetectingLocation(false);
        setLocationStatus('Could not read GPS. Using campus default.');
        // Default to Meneses Campus if location permission denied
        setLatitude(14.7937);
        setLongitude(120.8735);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!latitude || !longitude) {
      alert('Location coordinates are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submits to Supabase with approved = false (Visitor submission)
      const { error } = await supabase.from('spots').insert([
        {
          name,
          category,
          description,
          location_description: locationDescription,
          latitude,
          longitude,
          hours,
          open_time: openTime,
          close_time: closeTime,
          budget_range: budgetRange,
          has_outlets: hasOutlets,
          is_shaded: isShaded,
          is_quiet: isQuiet,
          approved: false, // Enforced by RLS security policy
        },
      ]);

      if (error) throw error;

      setIsSuccess(true);
      onSubmitted();
    } catch (err: any) {
      alert(err.message || 'Error submitting spot.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-deep-crimson" />
            <h2 className="text-base font-bold text-slate-900">Share a Campus Spot</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Spot Submitted!</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your submission was saved to the review queue. It will appear on the map once verified by an admin.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-slate-900 px-6 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {/* GPS Location Status Box */}
            <div className="rounded-xl border border-gold/40 bg-gold/15 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-deep-maroon flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-deep-crimson" />
                  Current Location (Client-side)
                </span>
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  className="text-[11px] font-semibold text-deep-crimson underline hover:opacity-80"
                >
                  {isDetectingLocation ? 'Reading...' : 'Refresh GPS'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                {latitude && longitude
                  ? `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`
                  : locationStatus}
              </p>
            </div>

            {/* Spot Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Place Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IT Building Study Nook"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Category and Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-800 bg-white"
                >
                  <option value="Food">Food</option>
                  <option value="Study">Study</option>
                  <option value="Relaxation">Relaxation</option>
                  <option value="Recreation">Recreation</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Essentials">Essentials</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Budget Range</label>
                <input
                  type="text"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                  placeholder="e.g. Free or Php 40-80"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Operating Hours</label>
              <input
                required
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 8:00 AM - 5:00 PM"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
              />
            </div>

            {/* Specific Landmark / Directions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Landmark / Floor</label>
              <input
                type="text"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="e.g. 2nd floor, beside the stairs"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
              />
            </div>

            {/* Amenities Checkboxes */}
            <div className="pt-1">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">Amenities Available</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOutlets}
                    onChange={(e) => setHasOutlets(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Has Outlets
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isShaded}
                    onChange={(e) => setIsShaded(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Shaded
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isQuiet}
                    onChange={(e) => setIsQuiet(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Quiet Area
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Tips / Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Good airflow, fast Wi-Fi, etc."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !latitude}
                className="rounded-xl bg-deep-crimson px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-dark-burgundy disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}