import { Injectable, signal, computed } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { environment } from '../../environments/environment';

export interface ChatMessage {
    id: string;
    roomId: string;
    senderConnectionId: string;
    content: string;
    timestamp: string; // ISO string
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private connection: HubConnection | null = null;
    private _messages = signal<ChatMessage[]>([]);

    // Public signal for components to consume
    readonly messages = computed(() => this._messages());

    constructor() { }

    async startConnection() {
        if (this.connection) return;

        const url = environment.chatHubUrl;
        this.connection = new HubConnectionBuilder()
            .withUrl(url)
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        this.connection.on('ReceiveMessage', (msg: ChatMessage) => {
            this._messages.update(prev => [...prev, msg]);
        });

        this.connection.on('ReceiveHistory', (history: ChatMessage[]) => {
            this._messages.set(history);
        });

        try {
            await this.connection.start();
            console.log('[ChatService] Connected to ChatHub');
        } catch (err) {
            console.error('[ChatService] Connection error', err);
            throw err;
        }
    }

    async joinRoom(roomId: string) {
        if (!this.connection) await this.startConnection();
        await this.connection?.invoke('JoinRoom', roomId);
    }

    async sendMessage(roomId: string, content: string): Promise<void> {
        if (!this.connection) {
            console.warn('Chat connection not ready');
            return;
        }
        await this.connection.invoke('SendMessage', roomId, content);
    }

    async stopConnection() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}
