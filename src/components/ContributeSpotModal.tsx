import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadSpotImage } from '../lib/supabase';
import { validateSpotSubmission } from '../lib/spotValidation';
import { MapPin, Navigation, X, CheckCircle, Map as MapIcon, ImagePlus } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';

function LocationPicker({ coords, onPick }: { coords: [number, number]; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={coords} />;
}

interface ContributeSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ContributeSpotModal({ isOpen, onClose, onSubmitted }: ContributeSpotModalProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Food' | 'Study' | 'Relaxation' | 'Recreation' | 'Shopping' | 'Essentials' | 'Other'>('Food');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [hours, setHours] = useState('8:00 AM - 5:00 PM');
  const [openTime, setOpenTime] = useState('08:00:00');
  const [closeTime, setCloseTime] = useState('17:00:00');
  const [budgetRange, setBudgetRange] = useState('Php 50 - 100');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Amenities
  const [hasOutlets, setHasOutlets] = useState(false);
  const [isShaded, setIsShaded] = useState(false);
  const [isQuiet, setIsQuiet] = useState(false);
  const [hasWifi, setHasWifi] = useState(false);
  const [hasAircon, setHasAircon] = useState(false);
  const [hasRestroom, setHasRestroom] = useState(false);

  // Client-side GPS detection
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapSelection, setMapSelection] = useState<[number, number]>([
    BULSU_MENESES_CAMPUS.latitude,
    BULSU_MENESES_CAMPUS.longitude,
  ]);
  const [locationMode, setLocationMode] = useState<'gps' | 'map'>('gps');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

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
      setLatitude(BULSU_MENESES_CAMPUS.latitude);
      setLongitude(BULSU_MENESES_CAMPUS.longitude);
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
        setLatitude(BULSU_MENESES_CAMPUS.latitude);
        setLongitude(BULSU_MENESES_CAMPUS.longitude);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (latitude === null || longitude === null) {
      alert('Location coordinates are required.');
      return;
    }

    const validationError = validateSpotSubmission({
      name,
      category,
      description,
      locationDescription,
      hours,
      budgetRange,
      latitude,
      longitude,
    });
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if a spot with this name already exists (case-insensitive)
      const { data: existingSpot, error: duplicateCheckError } = await supabase
        .from('spots')
        .select('id, name')
        .ilike('name', name.trim())
        .maybeSingle();

      if (duplicateCheckError) {
        throw new Error('Unable to check for duplicate places. Please try again.');
      }
      if (existingSpot) {
        alert(`A spot named "${name}" is already registered on the map! Please check existing spots.`);
        setIsSubmitting(false);
        return;
      }

      const imagePath = imageFile ? await uploadSpotImage(imageFile) : null;

      // Visitor submissions, including their photos, remain hidden until approved.
      const { error } = await supabase.from('spots').insert([
        {
          name: name.trim(),
          category,
          description: description.trim(),
          location_description: locationDescription.trim(),
          latitude,
          longitude,
          hours: hours.trim(),
          open_time: openTime,
          close_time: closeTime,
          budget_range: budgetRange.trim(),
          has_outlets: hasOutlets,
          is_shaded: isShaded,
          is_quiet: isQuiet,
          has_wifi: hasWifi,
          has_aircon: hasAircon,
          has_restroom: hasRestroom,
          image_path: imagePath,
        },
      ]);

      if (error) throw error;

      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      setIsSuccess(true);
      onSubmitted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to submit this place. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="my-0 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:my-6 sm:p-6">
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
            {/* Location Mode Selector (GPS vs Pick on Map) */}
            <div className="space-y-2">
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setLocationMode('gps');
                    detectCurrentLocation();
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                    locationMode === 'gps'
                      ? 'bg-white text-deep-maroon shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Navigation className="h-3.5 w-3.5 text-deep-crimson" />
                  <span>Use My GPS</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const campusCoordinates: [number, number] = [
                      BULSU_MENESES_CAMPUS.latitude,
                      BULSU_MENESES_CAMPUS.longitude,
                    ];
                    setLocationMode('map');
                    setMapSelection(campusCoordinates);
                    setLatitude(campusCoordinates[0]);
                    setLongitude(campusCoordinates[1]);
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                    locationMode === 'map'
                      ? 'bg-white text-deep-maroon shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5 text-deep-crimson" />
                  <span>Pick on Map</span>
                </button>
              </div>

              {locationMode === 'gps' ? (
                <div className="rounded-xl border border-gold/40 bg-gold/15 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-deep-maroon">Detected GPS Location</span>
                    <button
                      type="button"
                      onClick={detectCurrentLocation}
                      className="text-[11px] font-semibold text-deep-crimson underline"
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
              ) : (
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">
                  Map starts at BulSU Meneses Campus. Click anywhere to set the spot pin:
                  </p>
                  <div className="h-36 w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner">
                    <MapContainer
                    center={[BULSU_MENESES_CAMPUS.latitude, BULSU_MENESES_CAMPUS.longitude]}
                      zoom={16}
                      className="h-full w-full"
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationPicker
                        coords={mapSelection}
                        onPick={(lat, lng) => {
                          setMapSelection([lat, lng]);
                          setLatitude(lat);
                          setLongitude(lng);
                        }}
                      />
                    </MapContainer>
                  </div>
                </div>
              )}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Spot display image (optional)
              </label>
              <input
                ref={imageInputRef}
                id="contribution-spot-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] ?? null);
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-semibold text-dark-burgundy transition-colors hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy"
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {imageFile ? 'Change image' : 'Add spot image'}
              </button>
              <p className="mt-1 text-[11px] text-slate-500">
                JPEG, PNG, or WebP, up to 5 MB. An admin must approve your image before it appears on the spot.
              </p>
              {imageFile && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2">
                  <img
                    src={imagePreviewUrl ?? ''}
                    alt="Preview of selected spot image"
                    className="h-14 w-20 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{imageFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      if (imageInputRef.current) imageInputRef.current.value = '';
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    aria-label="Remove selected spot image"
                  >
                    Remove
                  </button>
                </div>
              )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOutlets}
                    onChange={(e) => setHasOutlets(e.target.checked)}
                    className="rounded accent-deep-crimson"
                  />
                  Outlets
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasWifi}
                    onChange={(e) => setHasWifi(e.target.checked)}
                    className="rounded accent-deep-crimson"
                  />
                  Free Wi-Fi
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAircon}
                    onChange={(e) => setHasAircon(e.target.checked)}
                    className="rounded accent-deep-crimson"
                  />
                  Air-Conditioned
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isShaded}
                    onChange={(e) => setIsShaded(e.target.checked)}
                    className="rounded accent-deep-crimson"
                  />
                  Shaded
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isQuiet}
                    onChange={(e) => setIsQuiet(e.target.checked)}
                    className="rounded accent-deep-crimson"
                  />
                  Quiet Area
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRestroom}
                    onChange={(e) => setHasRestroom(e.target.checked)}
                    className="rounded accent-deep-crimson"
                  />
                  Restroom Nearby
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