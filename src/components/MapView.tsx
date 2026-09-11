import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoLocationData, ClassLocation } from '../types';
import { PKBM_CONFIG } from '../data/mockData';

interface MapViewProps {
  currentLocation?: GeoLocationData | null;
  locations?: ClassLocation[];
  onRefreshLocation?: () => void;
  isLoadingLocation?: boolean;
  selectedLocationId?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  locations,
  onRefreshLocation,
  isLoadingLocation = false,
  selectedLocationId
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map if not initialized
    if (!mapInstanceRef.current) {
      const defaultLat = currentLocation?.latitude || PKBM_CONFIG.centerCoordinates.latitude;
      const defaultLng = currentLocation?.longitude || PKBM_CONFIG.centerCoordinates.longitude;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 12,
        zoomControl: true
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const allLatWaypoints: [number, number][] = [];

    // 1. Render Registered Locations if provided, otherwise render default PKBM Center
    const activeLocations = locations && locations.length > 0
      ? locations.filter(l => l.active)
      : [{
          id: 'default-pkbm',
          name: PKBM_CONFIG.name,
          address: PKBM_CONFIG.address,
          latitude: PKBM_CONFIG.centerCoordinates.latitude,
          longitude: PKBM_CONFIG.centerCoordinates.longitude,
          radiusMeters: PKBM_CONFIG.allowedRadiusMeters,
          isMainBranch: true,
          active: true
        }];

    activeLocations.forEach((loc) => {
      allLatWaypoints.push([loc.latitude, loc.longitude]);

      const isMain = loc.isMainBranch;
      const isSelected = selectedLocationId === loc.id;

      const locIcon = L.divIcon({
        className: 'custom-class-pin',
        html: `<div class="${
          isMain 
            ? 'bg-amber-500 text-slate-950 font-black' 
            : isSelected 
              ? 'bg-indigo-600 text-white font-bold' 
              : 'bg-emerald-700 text-white font-semibold'
        } px-2 py-1 rounded-xl shadow-lg border-2 border-white flex items-center justify-center text-[10px] whitespace-nowrap gap-1">
          <span>${isMain ? '🏢' : '📍'}</span>
          <span>${loc.name}</span>
        </div>`,
        iconSize: [120, 28],
        iconAnchor: [60, 14]
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: locIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 2px;">
            <b style="color: #0f172a; font-size: 13px;">${loc.name}</b><br/>
            <span style="font-size: 11px; color: #475569;">${loc.address}</span><br/>
            <span style="font-size: 11px; font-weight: bold; color: #059669;">Radius Geofence: ${loc.radiusMeters}m</span>
          </div>
        `);
      markersGroup.addLayer(marker);

      // Circle radius around location
      const radiusCircle = L.circle([loc.latitude, loc.longitude], {
        color: isMain ? '#d97706' : '#059669',
        fillColor: isMain ? '#f59e0b' : '#10b981',
        fillOpacity: 0.12,
        radius: loc.radiusMeters
      });
      markersGroup.addLayer(radiusCircle);
    });

    // 2. Add Current Tutor Location if available
    if (currentLocation) {
      const userLat = currentLocation.latitude;
      const userLng = currentLocation.longitude;
      allLatWaypoints.push([userLat, userLng]);

      const userIcon = L.divIcon({
        className: 'custom-user-pin',
        html: `<div class="relative flex items-center justify-center">
                 <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                 <div class="bg-blue-600 text-white p-2 rounded-full shadow-xl border-2 border-white w-9 h-9 flex items-center justify-center font-bold text-xs">📍</div>
               </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const userMarker = L.marker([userLat, userLng], { icon: userIcon })
        .bindPopup(`<b>Posisi Real-time Tutor</b><br/>Presisi GPS: ±${currentLocation.accuracy}m<br/>Status: ${currentLocation.isWithinRadius ? 'Dalam Radius Valid' : 'Luar Radius (Presensi Lapangan)'}`);
      markersGroup.addLayer(userMarker);
    }

    // Adjust Map Bounds to include all points
    if (allLatWaypoints.length > 1) {
      const bounds = L.latLngBounds(allLatWaypoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (allLatWaypoints.length === 1) {
      map.setView(allLatWaypoints[0], 14);
    }

    // Force map resize check
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [currentLocation, locations, selectedLocationId]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-[320px] z-0" />

      {/* Control Overlay */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {onRefreshLocation && (
          <button
            type="button"
            onClick={onRefreshLocation}
            disabled={isLoadingLocation}
            className="bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg shadow-md border border-slate-200 flex items-center gap-2 backdrop-blur transition-all active:scale-95 disabled:opacity-50"
          >
            <span className={isLoadingLocation ? "animate-spin text-emerald-600" : "text-emerald-600"}>
              🔄
            </span>
            {isLoadingLocation ? 'Mendeteksi GPS...' : 'Update GPS Lokasi'}
          </button>
        )}
      </div>

      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-md border border-slate-200 text-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
          <span className="font-medium text-slate-700">Gedung Utama</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white"></span>
          <span className="font-medium text-slate-700">Titik Kelas / Pondok</span>
        </div>
        {currentLocation && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white animate-pulse"></span>
            <span className="font-medium text-slate-700">
              Posisi Anda
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
