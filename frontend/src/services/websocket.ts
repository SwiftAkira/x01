/**
 * WebSocket Service
 * Socket.IO client for real-time updates
 */

import { io, Socket } from 'socket.io-client';
import { WS_URL, STORAGE_KEYS, MAX_RECONNECT_ATTEMPTS } from '@/utils/constants';
import { getStorageItem } from '@/utils/storage';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private isIntentionalDisconnect = false;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const token = getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      console.error('No auth token available for WebSocket connection');
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    });

    this.setupEventListeners();
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      
      // Auto-reconnect unless it was intentional
      if (!this.isIntentionalDisconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.isIntentionalDisconnect = true;
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Join a party room
   */
  joinParty(partyId: string): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('party:join', { partyId });
  }

  /**
   * Leave a party room
   */
  leaveParty(partyId: string): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('party:leave', { partyId });
  }

  /**
   * Send location update
   */
  sendLocationUpdate(data: { lat: number; lon: number; speed: number; heading: number }): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('location:update', data);
  }

  /**
   * Listen for party member updates
   */
  onPartyUpdate(callback: (data: unknown) => void): void {
    if (!this.socket) return;
    this.socket.on('party:update', callback);
  }

  /**
   * Listen for location updates
   */
  onLocationUpdate(callback: (data: unknown) => void): void {
    if (!this.socket) return;
    this.socket.on('location:update', callback);
  }

  /**
   * Listen for alerts
   */
  onAlert(callback: (data: unknown) => void): void {
    if (!this.socket) return;
    this.socket.on('alert:new', callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance (use sparingly, prefer specific methods)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
