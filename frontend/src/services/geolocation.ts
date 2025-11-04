/**
 * Geolocation Service
 * Wrapper for browser Geolocation API with error handling
 */

import { LOCATION_UPDATE_INTERVAL } from '@/utils/constants';

export interface GeolocationPosition {
  lat: number;
  lon: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

class GeolocationService {
  private watchId: number | null = null;
  private isTracking = false;

  /**
   * Check if Geolocation API is available
   */
  isAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get current position (one-time)
   */
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject({
          code: 0,
          message: 'Geolocation API not available in this browser',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(this.transformPosition(position));
        },
        (error) => {
          reject(this.transformError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Start watching position (continuous updates)
   */
  watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationError) => void
  ): void {
    if (!this.isAvailable()) {
      onError?.({
        code: 0,
        message: 'Geolocation API not available in this browser',
      });
      return;
    }

    if (this.isTracking) {
      console.warn('Position tracking already started');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        onSuccess(this.transformPosition(position));
      },
      (error) => {
        onError?.(this.transformError(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: LOCATION_UPDATE_INTERVAL,
      }
    );

    this.isTracking = true;
  }

  /**
   * Stop watching position
   */
  clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  /**
   * Get tracking status
   */
  getTrackingStatus(): boolean {
    return this.isTracking;
  }

  /**
   * Transform native GeolocationPosition to our interface
   */
  private transformPosition(position: globalThis.GeolocationPosition): GeolocationPosition {
    return {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp,
    };
  }

  /**
   * Transform native GeolocationPositionError to our interface
   */
  private transformError(error: GeolocationPositionError): GeolocationError {
    const messages: Record<number, string> = {
      1: 'Location access denied. Please enable location permissions.',
      2: 'Unable to determine location. Check your device settings.',
      3: 'Location request timed out. Please try again.',
    };

    return {
      code: error.code,
      message: messages[error.code] ?? error.message,
    };
  }
}

// Export singleton instance
export const geolocationService = new GeolocationService();
export default geolocationService;
