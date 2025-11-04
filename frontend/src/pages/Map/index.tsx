/**
 * Map Page - Real-time party member tracking with live map
 * Epic 3: Live Map Integration - IMPLEMENTED
 */

import MapView from '@/components/map/MapView';
import LocationControls from '@/components/map/LocationControls';

export default function Map() {
  return (
    <div style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
      <MapView />
      <LocationControls />
    </div>
  );
}
