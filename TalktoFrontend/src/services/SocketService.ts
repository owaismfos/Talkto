// src/services/socketService.ts
import { AppState } from 'react-native';
import CONFIG from '../config';

class SocketService {
    private socket: WebSocket | null = null;
    private listeners: Set<(data: any) => void> = new Set();

    connect(userId: string) {
        if (this.socket) return; // Already connected

        this.socket = new WebSocket(`${CONFIG.WS_URL}/ws/${userId}`);

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // Notify all UI listeners (screens) that a message arrived
            console.log("Received message via socket:", data);
            this.listeners.forEach((listener) => listener(data));
        };

        this.socket.onclose = () => {
            this.socket = null;
            console.log("Socket closed. Attempting reconnect...");
            // Add exponential backoff logic here
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
