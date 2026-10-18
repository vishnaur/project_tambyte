import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, X, CheckCircle, MapPin } from 'lucide-react';
import type { SpotRow } from '../types/database';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: readonly SpotRow[];
  preselectedSpot?: SpotRow | null;
}

const REPORT_REASONS = [
  'Wrong Location',
  'Permanently Closed',
  'Incorrect Hours',
  'Broken Outlets or Wi-Fi',
  'Other',
];

function ReportMapPicker({ coords, onPick }: { coords: [number, number]; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={coords} />;
}

export function ReportModal({ isOpen, onClose, spots, preselectedSpot }: ReportModalProps) {
  // Put this right here!
  if (!isOpen) return null;

  const [selectedSpotId, setSelectedSpotId] = useState<string>(preselectedSpot?.id || '');
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  
  // Suggested correct coordinates for "Wrong Location" reports
  const [suggestedLat, setSuggestedLat] = useState<number>(BULSU_MENESES_CAMPUS.latitude);
  const [suggestedLng, setSuggestedLng] = useState<number>(BULSU_MENESES_CAMPUS.longitude);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (preselectedSpot) {
        setSelectedSpotId(preselectedSpot.id);
        if (Number.isFinite(preselectedSpot.latitude) && Number.isFinite(preselectedSpot.longitude)) {
          setSuggestedLat(preselectedSpot.latitude);
          setSuggestedLng(preselectedSpot.longitude);
        }
      }
      setIsSuccess(false);
      setDescription('');
    }
  }, [preselectedSpot, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const spot = spots.find((s) => s.id === selectedSpotId) || preselectedSpot;
    if (!spot) {
      alert('Please select a spot to report.');
      return;
    }

    setIsSubmitting(true);
    try {
      // If "Wrong Location", attach the GPS coordinates to the report details
      const finalDescription = reason === 'Wrong Location'
        ? `[Suggested Correct Coordinates: Lat ${suggestedLat.toFixed(5)}, Lng ${suggestedLng.toFixed(5)}] ${description.trim()}`
        : description.trim();

      const { error } = await supabase.from('reports').insert([
        {
          spot_id: spot.id,
          spot_name: spot.name,
          reason,
          description: finalDescription,
          status: 'pending',
        },
      ]);

      if (error) throw error;
      setIsSuccess(true);
    } catch {
      alert('Unable to submit this report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2500] flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto sm:items-center">
      <div className="my-0 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:my-8 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">Report an Issue</h2>
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
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />s
            <h3 className="text-base font-bold text-slate-900">Report Submitted</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Thank you! Our campus admins have been notified and will verify this spot.
            </p>
            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="mt-2 rounded-xl bg-dark-burgundy px-6 py-2.5 text-xs font-semibold text-white hover:bg-deep-maroon shadow-sm"
            >
              Back to Map
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {/* Spot Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Which spot has an issue?</label>
              <select
                required
                value={selectedSpotId}
                onChange={(e) => setSelectedSpotId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white"
              >
                <option value="">-- Choose a spot --</option>
                {spots.map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.name} ({spot.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Issue Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Issue Type</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* IF WRONG LOCATION: Show Interactive Map Picker */}
            {reason === 'Wrong Location' && (
              <div className="space-y-1.5 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-rose-900 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                    Tap the correct location on the map:
                  </label>
                  <span className="font-mono text-[11px] font-medium text-rose-700">
                    {suggestedLat.toFixed(5)}, {suggestedLng.toFixed(5)}
                  </span>
                </div>
                <div className="h-40 w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner">
                  <MapContainer
                    center={[suggestedLat, suggestedLng]}
                    zoom={16}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ReportMapPicker
                      coords={[suggestedLat, suggestedLng]}
                      onPick={(lat, lng) => {
                        setSuggestedLat(lat);
                        setSuggestedLng(lng);
                      }}
                    />
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Details / What's wrong? <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  reason === 'Wrong Location'
                    ? 'e.g., Actually located beside the 2nd gate entrance...'
                    : 'e.g., Sockets near the back table are not working, or store was closed at 3 PM.'
                }
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-deep-crimson focus:outline-none focus:ring-1 focus:ring-deep-crimson/30"
              />
            </div>

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
                disabled={isSubmitting || !selectedSpotId}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}