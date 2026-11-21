import AsyncStorage from '@react-native-async-storage/async-storage';

type EventCallback = (data: any) => void;

class RealtimeWebSocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private listeners = new Map<string, Set<EventCallback>>();
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isConnecting = false;
  private shouldStayConnected = false;

  public async init(token?: string) {
    if (token) {
      this.token = token;
    } else {
      this.token = await AsyncStorage.getItem('auth_token');
    }
    if (!this.token) return;

    this.shouldStayConnected = true;
    this.connect();
  }

  public disconnect() {
    this.shouldStayConnected = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting || !this.token) return;

    this.isConnecting = true;
    const baseApi = process.env.EXPO_PUBLIC_API_URL || 'https://open-strava-backend.rakib2020-tkg.workers.dev/api/v1';
    const wsUrl = baseApi.replace(/^http/, 'ws') + `/messages/ws?token=${encodeURIComponent(this.token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        // Heartbeat ping every 25s
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
          if (!data || !data.type) return;

          const callbacks = this.listeners.get(data.type);
          if (callbacks) {
            callbacks.forEach((cb) => cb(data));
          }
        } catch (err) {
          console.warn('Realtime message parse error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error, reconnecting:', err);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.shouldStayConnected) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), 3000);
        }
      };
    } catch (err) {
      this.isConnecting = false;
      if (this.shouldStayConnected) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 4000);
      }
    }
  }

  public addListener(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public sendTyping(recipientId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'typing', recipientId }));
    }
  }
}

export const realtimeWs = new RealtimeWebSocketService();
