# Live Map Integration - Developer Guide

## Quick Start

### Prerequisites
- Mapbox account with API token
- Redis server running
- PostgreSQL database configured
- Node.js 20+ installed

### Environment Setup

1. **Frontend (.env)**
```env
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_WS_URL=ws://localhost:3001
```

2. **Backend (.env)**
```env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/speedlink
```

### Running the Application

```bash
# Start backend services
cd backend
npm run docker:up  # Start Redis & PostgreSQL
npm run dev:realtime  # Start WebSocket server

# Start frontend (separate terminal)
cd frontend
npm run dev
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  MapView     │───▶│ LocationCtrl │                  │
│  │  Component   │    │  Component   │                  │
│  └──────┬───────┘    └──────────────┘                  │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ PartyContext │───▶│  Location    │                  │
│  │   (State)    │    │  Service     │                  │
│  └──────┬───────┘    └──────────────┘                  │
│         │                      │                         │
└─────────┼──────────────────────┼─────────────────────────┘
          │                      │
          │ WebSocket            │ Geolocation API
          │                      │
┌─────────▼──────────────────────▼─────────────────────────┐
│                    BACKEND LAYER                         │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  Socket.IO   │───▶│ PartyService │                  │
│  │   Server     │    │              │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                    │                          │
│         ▼                    ▼                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │    Redis     │    │  PostgreSQL  │                  │
│  │  (Locations) │    │  (Metadata)  │                  │
│  └──────────────┘    └──────────────┘                  │
└──────────────────────────────────────────────────────────┘
```

## Key Components

### Frontend

#### 1. LocationService
**File:** `frontend/src/services/location.service.ts`

**Responsibilities:**
- GPS position tracking
- Adaptive sampling (battery optimization)
- Motion detection
- Permission management

**Usage:**
```typescript
import { locationService } from '@/services/location.service';

// Start watching position
locationService.startWatching(
  (position) => {
    console.log('New position:', position);
  },
  (error) => {
    console.error('Location error:', error);
  }
);

// Stop watching
locationService.stopWatching();

// Check permission
const permission = await locationService.checkPermission();
```

**Configuration:**
```typescript
locationService.updateConfig({
  movingSampleInterval: 2000,      // 2s when moving
  stationarySampleInterval: 10000, // 10s when stationary
  motionThreshold: 1.5,            // m/s threshold
  enableHighAccuracy: true,
  timeout: 10000,
});
```

#### 2. PartyContext
**File:** `frontend/src/contexts/PartyContext.tsx`

**State Management:**
```typescript
const {
  currentParty,              // Current party data
  isLocationSharing,         // Location sharing status
  currentUserLocation,       // Current GPS position
  startLocationSharing,      // Start sharing function
  stopLocationSharing,       // Stop sharing function
  isConnected,               // WebSocket connection status
} = useParty();
```

**Auto-Start Behavior:**
Location sharing automatically starts when joining a party and stops when leaving.

#### 3. MapView Component
**File:** `frontend/src/components/map/MapView.tsx`

**Features:**
- Real-time party member visualization
- Three auto-center modes
- Smooth marker animations
- Stale location detection

**Center Modes:**
1. **Follow Me:** Centers on current user
2. **Follow Party:** Shows all members
3. **Free:** Manual navigation

**Usage:**
```tsx
import MapView from '@/components/map/MapView';

function App() {
  return <MapView />;
}
```

#### 4. Map Markers
**File:** `frontend/src/utils/mapMarkers.ts`

**Marker Customization:**
```typescript
import { createMarkerElement, updateMarkerElement } from '@/utils/mapMarkers';

// Create custom marker
const element = createMarkerElement(
  userId,
  displayName,
  'motorcycle',  // vehicle type
  270,          // heading (degrees)
  15.5,         // speed (m/s)
  false         // isCurrentUser
);

// Update existing marker
updateMarkerElement(element, 280, 16.2);
```

### Backend

#### 1. Real-Time Server
**File:** `backend/src/realtime/server.ts`

**WebSocket Events:**

**Client → Server:**
```typescript
// Join party
socket.emit('party:join', { code: '123456' });

// Send location update
socket.emit('party:update', {
  partyId: 1,
  location: {
    latitude: 34.0522,
    longitude: -118.2437,
    speed: 15.5,
    heading: 270,
    accuracy: 10,
  },
});
```

**Server → Client:**
```typescript
// Receive location update
socket.on('party:location-update', (data) => {
  console.log('Member location:', data);
});

// Member joined
socket.on('party:member-joined', (data) => {
  console.log('New member:', data.userId);
});
```

#### 2. Party Service
**File:** `backend/src/services/party.service.ts`

**Location Management:**
```typescript
// Store location (5-minute TTL)
await PartyService.storeLocationUpdate({
  userId: 1,
  partyId: 123,
  latitude: 34.0522,
  longitude: -118.2437,
  speed: 15.5,
  heading: 270,
  accuracy: 10,
  timestamp: new Date(),
});

// Get all party locations
const locations = await PartyService.getPartyLocations(partyId);
```

## Data Flow

### Location Update Flow

```
1. GPS Sample (every 2-10s)
   └─▶ LocationService.startWatching()

2. Update Local State
   └─▶ PartyContext.setCurrentUserLocation()

3. Throttle (max 1/second)
   └─▶ PartyContext.updateLocation()

4. WebSocket Emit
   └─▶ socket.emit('party:update', {...})

5. Server Validation
   ├─▶ Rate Limiting Check (1/sec)
   ├─▶ Coordinate Validation
   └─▶ Party Membership Check

6. Store in Redis
   └─▶ PartyService.storeLocationUpdate()

7. Broadcast to Party
   └─▶ io.to(`party:${id}`).emit('party:location-update', {...})

8. Receive on Clients
   └─▶ PartyContext: update member location

9. Update Map Marker
   ├─▶ Animate position (800ms)
   ├─▶ Update heading arrow
   └─▶ Update speed badge
```

## Performance Optimization

### Battery Optimization

**Adaptive GPS Sampling:**
```typescript
// Motion detection
const isMoving = speed >= 1.5; // m/s

// Sample intervals
const interval = isMoving ? 2000 : 10000; // ms
```

**Best Practices:**
- Use `enableHighAccuracy: true` only when needed
- Stop watching when app is backgrounded
- Implement proper cleanup in useEffect

### Network Optimization

**Client-Side Throttling:**
```typescript
// Max 1 update per second
if (lastUpdate && Date.now() - lastUpdate < 1000) {
  return; // Skip update
}
```

**Server-Side Rate Limiting:**
```typescript
// Silently drop excessive updates
if (socket.lastLocationUpdate && 
    Date.now() - socket.lastLocationUpdate < 1000) {
  return;
}
```

### Rendering Optimization

**Marker Animation:**
```typescript
// Smooth 800ms transition
const duration = 800;
const steps = 30;
const easeProgress = 1 - Math.pow(1 - progress, 3);
```

**Stale Detection:**
```typescript
// Check every 5 seconds
setInterval(() => {
  const age = Date.now() - timestamp;
  if (age > 30000) markAsStale();
}, 5000);
```

## Debugging

### Enable Debug Logging

**Frontend:**
```typescript
// In browser console
localStorage.setItem('debug', 'speedlink:*');
```

**Backend:**
```bash
# Set LOG_LEVEL environment variable
export LOG_LEVEL=debug
```

### Monitor WebSocket Events

**Chrome DevTools:**
1. Open DevTools → Network
2. Filter: WS (WebSocket)
3. Click on connection
4. View Messages tab

### Check Redis Data

```bash
# Connect to Redis
redis-cli

# View location keys
KEYS party:*:location:*

# Get specific location
GET party:123:location:456
```

### Monitor Latency

**Frontend:**
```typescript
const startTime = Date.now();
socket.emit('party:update', data);

socket.on('party:location-update', () => {
  console.log('Latency:', Date.now() - startTime, 'ms');
});
```

**Backend:**
```typescript
logger.debug({
  type: 'location_update',
  latency: Date.now() - startTime,
});
```

## Testing

### Unit Tests

```typescript
// Test location service
describe('LocationService', () => {
  it('should detect motion correctly', () => {
    const position1 = { lat: 34.0522, lng: -118.2437 };
    const position2 = { lat: 34.0532, lng: -118.2447 };
    
    const distance = calculateDistance(position1, position2);
    expect(distance).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// Test WebSocket flow
describe('Location Broadcasting', () => {
  it('should broadcast location to party members', async () => {
    const socket = io('ws://localhost:3001');
    
    socket.emit('party:join', { code: '123456' });
    
    await new Promise(resolve => {
      socket.on('party:joined', resolve);
    });
    
    socket.emit('party:update', { ... });
    
    // Verify broadcast received
  });
});
```

## Common Issues

### Issue: Location not updating

**Symptoms:** Marker doesn't move on map

**Solutions:**
1. Check location permission granted
2. Verify WebSocket connection
3. Check GPS signal strength
4. Verify party membership

### Issue: High battery drain

**Symptoms:** Device battery depletes quickly

**Solutions:**
1. Verify adaptive sampling is working
2. Check if motion detection is accurate
3. Reduce GPS accuracy if acceptable
4. Implement background throttling

### Issue: Stale locations

**Symptoms:** Markers showing outdated positions

**Solutions:**
1. Check network connectivity
2. Verify WebSocket connection stable
3. Check Redis TTL configuration
4. Monitor server load

### Issue: Markers not animating smoothly

**Symptoms:** Choppy marker movement

**Solutions:**
1. Reduce animation steps
2. Use requestAnimationFrame
3. Implement frame skipping
4. Check device performance

## Security Considerations

### Location Privacy

1. **User Consent:** Always request permission explicitly
2. **Data Retention:** 5-minute TTL in Redis
3. **Access Control:** Only party members see locations
4. **Transmission:** HTTPS/WSS encryption required

### Input Validation

```typescript
// Validate coordinates
if (lat < -90 || lat > 90) throw new Error('Invalid latitude');
if (lng < -180 || lng > 180) throw new Error('Invalid longitude');

// Validate party membership
const isMember = await PartyService.isUserInParty(partyId, userId);
if (!isMember) throw new Error('Not authorized');
```

## Future Enhancements

### Planned Features

1. **Route Visualization**
   - Trail rendering
   - Historical path playback
   - Route optimization

2. **Advanced Markers**
   - Custom vehicle icons
   - User avatars
   - Status indicators

3. **Offline Support**
   - Map tile caching
   - Queue location updates
   - Sync on reconnect

4. **Performance**
   - WebGL marker rendering
   - Location compression
   - Server-side clustering

## Resources

### Documentation
- [Mapbox GL JS API](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

### Tools
- [Mapbox Studio](https://studio.mapbox.com/) - Map styling
- [Redis Commander](https://github.com/joeferner/redis-commander) - Redis GUI
- [Socket.IO Admin UI](https://socket.io/docs/v4/admin-ui/) - WebSocket monitoring

## Support

For issues or questions:
1. Check this guide first
2. Review implementation summary
3. Check Git commit history
4. Contact development team

---

**Last Updated:** November 4, 2025  
**Version:** 1.0  
**Author:** SpeedLink Development Team
