/**
 * Location Service
 * Handles GPS tracking with adaptive sampling for battery optimization
 * 
 * Features:
 * - High-accuracy GPS positioning
 * - Adaptive sampling (2s moving, 10s stationary)
 * - Motion detection for battery optimization
 * - Permission management
 * - Error handling and recovery
 */

export interface LocationPosition {
  latitude: number;
  longitude: number;
  speed: number | null; // m/s
  heading: number | null; // degrees (0-360)
  accuracy: number; // meters
  timestamp: number;
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  message: string;
}

export type LocationCallback = (position: LocationPosition) => void;
export type LocationErrorCallback = (error: LocationError) => void;

interface LocationServiceConfig {
  movingSampleInterval: number; // ms
  stationarySampleInterval: number; // ms
  motionThreshold: number; // m/s
  enableHighAccuracy: boolean;
  timeout: number; // ms
  maximumAge: number; // ms
}

const DEFAULT_CONFIG: LocationServiceConfig = {
  movingSampleInterval: 2000, // 2 seconds when moving
  stationarySampleInterval: 10000, // 10 seconds when stationary
  motionThreshold: 1.5, // ~5.4 km/h threshold for considering as "moving"
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

class LocationService {
  private watchId: number | null = null;
  private isWatching = false;
  private lastPosition: LocationPosition | null = null;
  private isMoving = false;
  private callbacks: Set<LocationCallback> = new Set();
  private errorCallbacks: Set<LocationErrorCallback> = new Set();
  private config: LocationServiceConfig = DEFAULT_CONFIG;
  private adaptiveWatchId: number | null = null;
  private sampleTimer: NodeJS.Timeout | null = null;

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check current permission state
   */
  async checkPermission(): Promise<PermissionState | 'not-supported'> {
    if (!('permissions' in navigator)) {
      return 'not-supported';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state;
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      return 'not-supported';
    }
  }

  /**
   * Request location permission and get current position
   */
  async requestPermission(): Promise<LocationPosition> {
    if (!this.isSupported()) {
      throw this.createError('NOT_SUPPORTED', 'Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationPosition = this.parsePosition(position);
          resolve(locationPosition);
        },
        (error) => {
          reject(this.parseGeolocationError(error));
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        }
      );
    });
  }

  /**
   * Start watching position with adaptive sampling
   */
  startWatching(callback: LocationCallback, errorCallback?: LocationErrorCallback): void {
    if (!this.isSupported()) {
      const error = this.createError('NOT_SUPPORTED', 'Geolocation is not supported');
      errorCallback?.(error);
      this.notifyErrorCallbacks(error);
      return;
    }

    if (this.isWatching) {
      console.warn('Location watching already active');
      return;
    }

    this.callbacks.add(callback);
    if (errorCallback) {
      this.errorCallbacks.add(errorCallback);
    }

    this.isWatching = true;
    this.startAdaptiveSampling();
  }

  /**
   * Stop watching position
   */
  stopWatching(callback?: LocationCallback): void {
    if (callback) {
      this.callbacks.delete(callback);
    } else {
      this.callbacks.clear();
    }

    if (this.callbacks.size === 0) {
      this.isWatching = false;
      this.cleanup();
    }
  }

  /**
   * Get last known position
   */
  getLastPosition(): LocationPosition | null {
    return this.lastPosition;
  }

  /**
   * Check if currently moving
   */
  getIsMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LocationServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart sampling if watching
    if (this.isWatching) {
      this.cleanup();
      this.startAdaptiveSampling();
    }
  }

  /**
   * Start adaptive sampling based on motion detection
   */
  private startAdaptiveSampling(): void {
    const getPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationPosition = this.parsePosition(position);
          this.updateMotionState(locationPosition);
          this.lastPosition = locationPosition;
          this.notifyCallbacks(locationPosition);

          // Schedule next sample
          if (this.isWatching) {
            const nextInterval = this.isMoving 
              ? this.config.movingSampleInterval 
              : this.config.stationarySampleInterval;
            
            this.sampleTimer = setTimeout(getPosition, nextInterval);
          }
        },
        (error) => {
          const locationError = this.parseGeolocationError(error);
          this.notifyErrorCallbacks(locationError);

          // Retry on error
          if (this.isWatching) {
            this.sampleTimer = setTimeout(getPosition, 5000); // Retry after 5s
          }
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        }
      );
    };

    // Start first sample immediately
    getPosition();
  }

  /**
   * Update motion state based on speed
   */
  private updateMotionState(position: LocationPosition): void {
    const previouslyMoving = this.isMoving;
    
    // Determine if moving based on speed or distance
    if (position.speed !== null && position.speed >= this.config.motionThreshold) {
      this.isMoving = true;
    } else if (this.lastPosition) {
      // Calculate speed from distance if GPS speed not available
      const distance = this.calculateDistance(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        position.latitude,
        position.longitude
      );
      const timeDelta = (position.timestamp - this.lastPosition.timestamp) / 1000; // seconds
      const calculatedSpeed = timeDelta > 0 ? distance / timeDelta : 0;
      
      this.isMoving = calculatedSpeed >= this.config.motionThreshold;
    } else {
      this.isMoving = false;
    }

    // Log motion state changes
    if (previouslyMoving !== this.isMoving) {
      console.log(`Motion state changed: ${this.isMoving ? 'Moving' : 'Stationary'}`);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Parse GeolocationPosition to LocationPosition
   */
  private parsePosition(position: GeolocationPosition): LocationPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: position.coords.speed, // null if not available
      heading: position.coords.heading, // null if not available
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  }

  /**
   * Parse GeolocationPositionError to LocationError
   */
  private parseGeolocationError(error: GeolocationPositionError): LocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return this.createError('PERMISSION_DENIED', 'Location permission denied by user');
      case error.POSITION_UNAVAILABLE:
        return this.createError('POSITION_UNAVAILABLE', 'Location information unavailable');
      case error.TIMEOUT:
        return this.createError('TIMEOUT', 'Location request timed out');
      default:
        return this.createError('POSITION_UNAVAILABLE', 'Unknown geolocation error');
    }
  }

  /**
   * Create LocationError object
   */
  private createError(code: LocationError['code'], message: string): LocationError {
    return { code, message };
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(position: LocationPosition): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(position);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  /**
   * Notify all error callbacks
   */
  private notifyErrorCallbacks(error: LocationError): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in location error callback:', err);
      }
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.sampleTimer !== null) {
      clearTimeout(this.sampleTimer);
      this.sampleTimer = null;
    }

    if (this.adaptiveWatchId !== null) {
      navigator.geolocation.clearWatch(this.adaptiveWatchId);
      this.adaptiveWatchId = null;
    }
  }
}

// Export singleton instance
export const locationService = new LocationService();
