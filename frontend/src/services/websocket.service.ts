import type { Socket } from 'socket.io-client';

import { io } from 'socket.io-client';

import { CONFIG } from 'src/config-global';

class WebSocketService {
  private socket: Socket | null = null;

  private isConnected = false;

  private reconnectAttempts = 0;

  private maxReconnectAttempts = 5;

  private reconnectDelay = 1000;

  connect(accessToken: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    // Prefer dedicated notification backend URL if provided, else fall back to API backend URL
    const baseUrl = (CONFIG.notificationBackendUrl || CONFIG.backendUrl || '').trim();
    // Derive Socket.IO endpoint base by stripping trailing /api/v1 if present
    const wsUrl = baseUrl ? baseUrl.replace(/\/api\/v1\/?$/, '') : window.location.origin;

    this.socket = io(wsUrl, {
      auth: {
        token: `Bearer ${accessToken}`,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts += 1;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Listen for session invalidation events
    this.socket.on('session:invalidated', (data: { sessionId: string; reason: string; timestamp: number }) => {
      console.log('Session invalidated:', data);
      
      // Get current session ID from JWT token
      const accessToken = localStorage.getItem('jwt_access_token');
      if (accessToken) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          if (payload.sessionId === data.sessionId) {
            // This session has been invalidated
            console.log('Current session invalidated, logging out...');
            
            // Clear all auth data
            localStorage.removeItem('jwt_access_token');
            localStorage.removeItem('jwt_refresh_token');
            localStorage.removeItem('deviceId');
            sessionStorage.removeItem('sessionToken');
            
            // Redirect to login
            window.location.href = '/auth/sign-in';
          }
        } catch (error) {
          console.error('Error parsing JWT token:', error);
        }
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Method to emit custom events if needed
  emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Method to listen to custom events
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Method to remove event listeners
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService(); 