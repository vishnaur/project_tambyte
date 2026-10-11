import React, { useEffect, useState } from 'react';
import { supabase, Spot } from '../lib/supabase';
import { CheckCircle2, Trash2, Plus, Clock, MapPin, X, AlertTriangle, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

// Click listener to pick coordinates on the map
function MapPicker({ coords, onPick }: { coords: [number, number]; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={coords} />;
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSpotsUpdated: () => void;
}

export function AdminDashboard({ isOpen, onClose, onSpotsUpdated }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'add'>('pending');
  const [pendingSpots, setPendingSpots] = useState<Spot[]>([]);
  const [approvedSpots, setApprovedSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  // Form state for adding a verified spot directly
  const [formData, setFormData] = useState({
    name: '',
    category: 'Food',
    description: '',
    location_description: '',
    latitude: 14.7937,
    longitude: 120.8735,
    hours: '8:00 AM - 5:00 PM',
    open_time: '08:00:00',
    close_time: '17:00:00',
    budget_range: 'Php 50 - 100',
    has_outlets: false,
    is_shaded: false,
    is_quiet: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadSpots();
    }
  }, [isOpen]);

  async function loadSpots() {
    setLoading(true);
    try {
      // 1. Fetch pending spots (Student submissions)
      const { data: pending } = await supabase
        .from('spots')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      // 2. Fetch approved spots
      const { data: approved } = await supabase
        .from('spots')
        .select('*')
        .eq('approved', true)
        .order('name', { ascending: true });

      setPendingSpots((pending as Spot[]) || []);
      setApprovedSpots((approved as Spot[]) || []);
    } catch (err) {
      console.error('Error loading spots:', err);
    } finally {
      setLoading(false);
    }
  }

  // Action: Approve student submission
  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('spots')
      .update({ approved: true })
      .eq('id', id);

    if (!error) {
      setActionMessage('Spot approved and added to the live map!');
      loadSpots();
      onSpotsUpdated();
    }
  }

  // Action: Reject or Delete spot
  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this spot?')) return;

    const { error } = await supabase
      .from('spots')
      .delete()
      .eq('id', id);

    if (!error) {
      setActionMessage('Spot removed successfully.');
      loadSpots();
      onSpotsUpdated();
    }
  }

  // Action: Admin manually adding a verified spot
  async function handleCreateSpot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('spots').insert([
      {
        ...formData,
        approved: true, // Directly approved since admin created it
      },
    ]);

    setLoading(false);
    if (!error) {
      setActionMessage('New spot added directly to map!');
      setFormData({
        name: '',
        category: 'Food',
        description: '',
        location_description: '',
        latitude: 14.7937,
        longitude: 120.8735,
        hours: '8:00 AM - 5:00 PM',
        open_time: '08:00:00',
        close_time: '17:00:00',
        budget_range: 'Php 50 - 100',
        has_outlets: false,
        is_shaded: false,
        is_quiet: false,
      });
      setActiveTab('approved');
      loadSpots();
      onSpotsUpdated();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </button>
          <h1 className="text-lg font-bold text-slate-900">Tambyte Admin Management</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-dark-burgundy shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contributions ({pendingSpots.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'approved'
                ? 'bg-white text-dark-burgundy shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Places ({approvedSpots.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'add'
                ? 'bg-dark-burgundy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add New Spot
          </button>
        </div>
      </header>

      {/* Action Notification */}
      {actionMessage && (
        <div className="bg-dark-burgundy px-6 py-2 text-center text-xs font-semibold text-white">
          {actionMessage}
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {loading ? (
          <p className="text-center text-sm text-slate-500 py-10">Loading database records...</p>
        ) : activeTab === 'pending' ? (
          /* TAB 1: PENDING STUDENT CONTRIBUTIONS */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Student Submissions Awaiting Approval
                </h2>
                <p className="text-xs text-slate-500">
                  Review student-contributed spots before publishing to the live campus map.
                </p>
              </div>
              <span className="rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-deep-maroon border border-gold/40">
                {pendingSpots.length} Pending
              </span>
            </div>

            {pendingSpots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-500">No pending student contributions to review.</p>
              </div>
            ) : (
              /* 3 Columns Responsive Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingSpots.map((spot: any) => {
                  // Checks for matching name or coordinates within ~30 meters
                  const duplicateMatch = approvedSpots.find(
                    (app) =>
                      app.name.trim().toLowerCase() === spot.name.trim().toLowerCase() ||
                      Math.hypot(Number(app.latitude) - Number(spot.latitude), Number(app.longitude) - Number(spot.longitude)) < 0.0003
                  );

                  return (
                    <div
                      key={spot.id}
                      className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
                        duplicateMatch ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Duplicate Alert Banner */}
                        {duplicateMatch && (
                          <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800 border border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>Possible duplicate of "{duplicateMatch.name}"</span>
                          </div>
                        )}

                        {/* Card Header: Title & Category */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">{spot.name}</h3>
                          {spot.location_description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{spot.location_description}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-md bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-deep-maroon border border-gold/30">
                          {spot.category}
                        </span>
                      </div>

                      {/* Info Badges */}
                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{spot.hours}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px]">
                            {Number(spot.latitude).toFixed(5)}, {Number(spot.longitude).toFixed(5)}
                          </span>
                        </div>
                        {spot.budget_range && (
                          <div className="text-[11px] text-slate-600 font-medium">
                            Budget: <span className="text-slate-800">{spot.budget_range}</span>
                          </div>
                        )}
                      </div>

                      {/* Amenities Chips */}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                          Amenities Tagged
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {spot.has_outlets && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Outlets
                            </span>
                          )}
                          {spot.has_wifi && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                              Free Wi-Fi
                            </span>
                          )}
                          {spot.has_aircon && (
                            <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 border border-cyan-200">
                              Aircon
                            </span>
                          )}
                          {spot.is_shaded && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              Shaded
                            </span>
                          )}
                          {spot.is_quiet && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
                              Quiet
                            </span>
                          )}
                          {spot.has_restroom && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200">
                              Restroom
                            </span>
                          )}
                          {!spot.has_outlets && !spot.has_wifi && !spot.has_aircon && !spot.is_shaded && !spot.is_quiet && !spot.has_restroom && (
                            <span className="text-[11px] text-slate-400 italic">None tagged</span>
                          )}
                        </div>
                      </div>

                      {/* Student Description / Tips */}
                      {spot.description && (
                        <div className="text-xs text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100 italic">
                          "{spot.description}"
                        </div>
                      )}
                    </div>

                    {/* Actions: Approve / Reject Buttons */}
                    <div className="flex items-center gap-2 pt-4 mt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleDelete(spot.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(spot.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-dark-burgundy py-2 text-xs font-semibold text-white hover:bg-deep-maroon shadow-sm transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          
        ) : activeTab === 'approved' ? (
          /* TAB 2: CURRENT ACTIVE SPOTS */
          <div className="space-y-4">
            {/* Tab Header with Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Published Campus Places ({approvedSpots.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Spots currently visible to all students on the live map.
                </p>
              </div>
              <input
                type="text"
                placeholder="Search active spots..."
                value={activeSearchQuery}
                onChange={(e) => setActiveSearchQuery(e.target.value)}
                className="w-full sm:w-64 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-dark-burgundy focus:outline-none focus:ring-1 focus:ring-dark-burgundy/30 bg-white"
              />
            </div>

            {/* 3-Column Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedSpots
                .filter((spot) =>
                  spot.name.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
                  spot.category.toLowerCase().includes(activeSearchQuery.toLowerCase())
                )
                .map((spot: any) => (
                  <div
                    key={spot.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="space-y-3">
                      {/* Card Title & Category */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Live on Map" />
                            <h3 className="font-bold text-sm text-slate-900 leading-snug">{spot.name}</h3>
                          </div>
                          {spot.location_description && (
                            <p className="text-[11px] text-slate-500 mt-1 pl-3.5">{spot.location_description}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-md bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-deep-maroon border border-gold/30">
                          {spot.category}
                        </span>
                      </div>

                      {/* Info Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{spot.hours}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px]">
                            {Number(spot.latitude).toFixed(5)}, {Number(spot.longitude).toFixed(5)}
                          </span>
                        </div>
                        {spot.budget_range && (
                          <div className="text-[11px] text-slate-600 font-medium">
                            Budget: <span className="text-slate-800">{spot.budget_range}</span>
                          </div>
                        )}
                      </div>

                      {/* Amenities Badges */}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                          Amenities
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {spot.has_outlets && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Outlets
                            </span>
                          )}
                          {spot.has_wifi && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                              Wi-Fi
                            </span>
                          )}
                          {spot.has_aircon && (
                            <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 border border-cyan-200">
                              Aircon
                            </span>
                          )}
                          {spot.is_shaded && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              Shaded
                            </span>
                          )}
                          {spot.is_quiet && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
                              Quiet
                            </span>
                          )}
                          {spot.has_restroom && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200">
                              Restroom
                            </span>
                          )}
                          {!spot.has_outlets && !spot.has_wifi && !spot.has_aircon && !spot.is_shaded && !spot.is_quiet && !spot.has_restroom && (
                            <span className="text-[11px] text-slate-400 italic">None tagged</span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {spot.description && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                          {spot.description}
                        </p>
                      )}
                    </div>

                    {/* Card Action: Delete Button */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDelete(spot.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Spot
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          /* TAB 3: ADMIN ADD NEW SPOT FORM */
          <form onSubmit={handleCreateSpot} className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Add Verified Campus Spot</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700">Place Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., College of Engineering Gazebo"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm bg-white"
                >
                  {['Food', 'Study', 'Relaxation', 'Recreation', 'Shopping', 'Essentials', 'Other'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Operating Hours</label>
                <input
                  required
                  type="text"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="7:00 AM - 6:00 PM"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                />
              </div>
            </div>

            {/* Interactive Map Coordinate Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Location on Map (Click anywhere to set pin)
                </label>
                <span className="text-[11px] font-medium text-dark-burgundy">
                  {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                </span>
              </div>
              <div className="h-44 w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner">
                <MapContainer
                  center={[formData.latitude, formData.longitude]}
                  zoom={16}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapPicker
                    coords={[formData.latitude, formData.longitude]}
                    onPick={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                  />
                </MapContainer>
              </div>
            </div>

            {/* Checkbox Amenities */}
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_outlets}
                  onChange={(e) => setFormData({ ...formData, has_outlets: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Has Outlets
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_shaded}
                  onChange={(e) => setFormData({ ...formData, is_shaded: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Shaded
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_quiet}
                  onChange={(e) => setFormData({ ...formData, is_quiet: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Quiet Area
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-dark-burgundy py-2.5 text-xs font-semibold text-white hover:bg-deep-maroon shadow-sm"
            >
              Save and Publish to Live Map
            </button>
          </form>
        )}
      </main>
    </div>
  );
}