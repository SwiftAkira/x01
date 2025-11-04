/**
 * Map Marker Utilities
 * Custom markers for party members with vehicle icons and direction indicators
 */

import type { VehicleType } from '@/types/party.types';

const MARKER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#52C41A',
];

/**
 * Get color for a user (consistent per userId)
 */
export function getMarkerColor(userId: number): string {
  const color = MARKER_COLORS[userId % MARKER_COLORS.length];
  return color !== undefined ? color : MARKER_COLORS[0] as string;
}

/**
 * Get vehicle icon based on type
 */
export function getVehicleIcon(vehicleType: VehicleType): string {
  const icons: Record<VehicleType, string> = {
    motorcycle: '🏍️',
    car: '🚗',
    truck: '🚚',
    other: '🚙',
  };
  return icons[vehicleType] || icons.other;
}

/**
 * Create HTML for custom marker with direction arrow
 */
export function createMarkerElement(
  userId: number,
  displayName: string,
  vehicleType: VehicleType,
  heading: number | null,
  speed: number | null,
  isCurrentUser: boolean = false
): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.style.cssText = `
    position: relative;
    width: 50px;
    height: 50px;
    cursor: pointer;
    transform-origin: center;
    ${heading !== null ? `transform: rotate(${heading}deg);` : ''}
  `;

  const color = getMarkerColor(userId);
  const icon = getVehicleIcon(vehicleType);
  
  // Direction arrow (pointing up when heading is 0)
  const arrow = document.createElement('div');
  arrow.style.cssText = `
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 12px solid ${color};
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    ${heading === null ? 'display: none;' : ''}
  `;
  el.appendChild(arrow);

  // Main marker circle
  const marker = document.createElement('div');
  marker.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) ${heading !== null ? 'rotate(' + (-heading) + 'deg)' : ''};
    width: 40px;
    height: 40px;
    background: ${isCurrentUser ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : color};
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  `;
  marker.textContent = icon;
  el.appendChild(marker);

  // Speed badge
  if (speed !== null && speed > 0) {
    const speedBadge = document.createElement('div');
    speedBadge.style.cssText = `
      position: absolute;
      bottom: -5px;
      right: -5px;
      background: rgba(0,0,0,0.8);
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: bold;
      white-space: nowrap;
      transform: ${heading !== null ? 'rotate(' + (-heading) + 'deg)' : ''};
    `;
    speedBadge.textContent = `${Math.round(speed * 3.6)} km/h`; // Convert m/s to km/h
    el.appendChild(speedBadge);
  }

  // Label
  const label = document.createElement('div');
  label.style.cssText = `
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%) ${heading !== null ? 'rotate(' + (-heading) + 'deg)' : ''};
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    margin-top: 8px;
    pointer-events: none;
  `;
  label.textContent = isCurrentUser ? 'You' : displayName;
  el.appendChild(label);

  return el;
}

/**
 * Update existing marker element
 */
export function updateMarkerElement(
  el: HTMLDivElement,
  heading: number | null,
  speed: number | null
): void {
  // Update rotation
  if (heading !== null) {
    el.style.transform = `rotate(${heading}deg)`;
    
    // Show arrow
    const arrow = el.querySelector('div:first-child') as HTMLDivElement;
    if (arrow) {
      arrow.style.display = 'block';
    }

    // Counter-rotate marker and label to keep them upright
    const marker = el.querySelectorAll('div')[1] as HTMLDivElement;
    const label = el.querySelector('div:last-child') as HTMLDivElement;
    
    if (marker) {
      const currentTransform = marker.style.transform;
      marker.style.transform = currentTransform.replace(/rotate\([^)]+\)/, '') + ` rotate(${-heading}deg)`;
    }
    if (label) {
      const currentTransform = label.style.transform;
      label.style.transform = currentTransform.replace(/rotate\([^)]+\)/, '') + ` rotate(${-heading}deg)`;
    }
  } else {
    el.style.transform = '';
    const arrow = el.querySelector('div:first-child') as HTMLDivElement;
    if (arrow) {
      arrow.style.display = 'none';
    }
  }

  // Update speed badge
  let speedBadge = Array.from(el.children).find(
    (child) => child.textContent?.includes('km/h')
  ) as HTMLDivElement;

  if (speed !== null && speed > 0) {
    if (!speedBadge) {
      speedBadge = document.createElement('div');
      speedBadge.style.cssText = `
        position: absolute;
        bottom: -5px;
        right: -5px;
        background: rgba(0,0,0,0.8);
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        white-space: nowrap;
      `;
      el.appendChild(speedBadge);
    }
    speedBadge.textContent = `${Math.round(speed * 3.6)} km/h`;
    if (heading !== null) {
      speedBadge.style.transform = `rotate(${-heading}deg)`;
    }
  } else if (speedBadge) {
    speedBadge.remove();
  }
}

/**
 * Create accuracy circle indicator
 */
export function createAccuracyCircle(
  map: any,
  sourceId: string,
  layerId: string,
  center: [number, number],
  accuracy: number
): void {
  // Remove existing source and layer
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }

  // Create circle
  const radiusInKm = accuracy / 1000;
  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: center,
      },
      properties: {},
    },
  });

  map.addLayer({
    id: layerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': {
        stops: [
          [0, 0],
          [20, radiusInKm * 100000],
        ],
        base: 2,
      },
      'circle-color': '#007cbf',
      'circle-opacity': 0.1,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#007cbf',
      'circle-stroke-opacity': 0.3,
    },
  });
}

/**
 * Create stale location indicator (grey overlay)
 */
export function markMarkerAsStale(el: HTMLDivElement): void {
  const marker = el.querySelectorAll('div')[1] as HTMLDivElement;
  if (marker) {
    marker.style.filter = 'grayscale(70%) opacity(0.6)';
  }

  // Add "stale" badge
  let staleBadge = Array.from(el.children).find(
    (child) => child.textContent === 'STALE'
  ) as HTMLDivElement;

  if (!staleBadge) {
    staleBadge = document.createElement('div');
    staleBadge.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      background: #FF4444;
      color: white;
      border-radius: 3px;
      padding: 2px 4px;
      font-size: 9px;
      font-weight: bold;
      z-index: 10;
    `;
    staleBadge.textContent = 'STALE';
    el.appendChild(staleBadge);
  }
}

/**
 * Remove stale indicator
 */
export function unmarkMarkerAsStale(el: HTMLDivElement): void {
  const marker = el.querySelectorAll('div')[1] as HTMLDivElement;
  if (marker) {
    marker.style.filter = '';
  }

  // Remove stale badge
  const staleBadge = Array.from(el.children).find(
    (child) => child.textContent === 'STALE'
  ) as HTMLDivElement;
  if (staleBadge) {
    staleBadge.remove();
  }
}
