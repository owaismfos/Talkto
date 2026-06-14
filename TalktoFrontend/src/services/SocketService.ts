// src/services/socketService.ts
import { AppState } from 'react-native';
import CONFIG from '../config';

class SocketService {
    private socket: WebSocket | null = null;
    private listeners: Set<(data: any) => void> = new Set();
    private userId: string | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private shouldReconnect = false;

    connect(userId: string) {
        if (this.socket && this.userId === userId) return; // Already connected
        if (this.socket && this.userId !== userId) {
            this.disconnect();
        }

        this.userId = userId;
        this.shouldReconnect = true;

        const socket = new WebSocket(`${CONFIG.WS_URL}/ws/${userId}`);
        this.socket = socket;

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.listeners.forEach((listener) => listener(data));
            } catch (error) {
                console.log("Socket message parse error:", error);
            }
        };

        socket.onclose = () => {
            if (this.socket === socket) {
                this.socket = null;
            }
            if (!this.socket && this.shouldReconnect && this.userId && !this.reconnectTimer) {
                this.reconnectTimer = setTimeout(() => {
                    this.reconnectTimer = null;
                    if (this.userId) {
                        this.connect(this.userId);
                    }
                }, 2000);
            }
        };

        socket.onerror = () => {
            socket.close();
        };
    }

    // Screens "Subscribe" to messages when they open
    subscribe(callback: (data: any) => void) {
        this.listeners.add(callback);
        
        // Wrap the delete call so the return type is () => void
        return () => {
            this.listeners.delete(callback);
        };
    }

    send(data: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    disconnect() {
        this.shouldReconnect = false;
        this.userId = null;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.socket?.close();
        this.socket = null;
    }
    // Inside your SocketService class
    setupAppStateListener() {
        AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active' && !this.socket) {
                // Logic to auto-reconnect if it dropped while in background
            }
        });
    }
}

export const socketService = new SocketService();
