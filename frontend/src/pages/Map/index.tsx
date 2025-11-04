/**
 * Map Page - Main view with party members and alerts
 * TODO: Implement real-time party member markers and alerts (Epic 3)
 */

import MapView from '@/components/map/MapView';

export default function Map() {
  return (
    <div style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
      <MapView />
      
      {/* TODO: Add party member markers, alert overlays, and real-time updates */}
    </div>
  );
}
