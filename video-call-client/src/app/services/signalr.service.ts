import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

export interface SignalrEvent<T> {
    data: T;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class SignalrService {
    private hubConnection!: signalR.HubConnection;

    // Signals for hub events — each increments a counter to trigger reactivity
    readonly userJoined = signal<{ connectionId: string; userCount: number } | null>(null);
    readonly userLeft = signal<{ connectionId: string; userCount: number } | null>(null);
    readonly roomJoined = signal<{ roomId: string; userCount: number } | null>(null);
    readonly receiveOffer = signal<{ fromId: string; sdp: any } | null>(null);
    readonly receiveAnswer = signal<{ fromId: string; sdp: any } | null>(null);
    readonly receiveIceCandidate = signal<{ fromId: string; candidate: any } | null>(null);
    readonly error = signal<string | null>(null);
    readonly connected = signal(false);

    // Callbacks for WebRTC service (imperative events that need immediate handling)
    onOffer: ((fromId: string, sdp: any) => void) | null = null;
    onAnswer: ((fromId: string, sdp: any) => void) | null = null;
    onIceCandidate: ((fromId: string, candidate: any) => void) | null = null;

    buildConnection(): void {
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(environment.hubUrl)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.registerEvents();
    }

    async startConnection(): Promise<void> {
        try {
            await this.hubConnection.start();
            this.connected.set(true);
            console.log('[SignalR] Connected. ID:', this.hubConnection.connectionId);
        } catch (err) {
            console.error('[SignalR] Connection error:', err);
            setTimeout(() => this.startConnection(), 3000);
        }
    }

    getConnectionId(): string | null {
        return this.hubConnection?.connectionId ?? null;
    }

    async joinRoom(roomId: string): Promise<void> {
        await this.hubConnection.invoke('JoinRoom', roomId);
    }

    async sendOffer(roomId: string, targetConnectionId: string, sdp: any): Promise<void> {
        await this.hubConnection.invoke('SendOffer', roomId, targetConnectionId, sdp);
    }

    async sendAnswer(roomId: string, targetConnectionId: string, sdp: any): Promise<void> {
        await this.hubConnection.invoke('SendAnswer', roomId, targetConnectionId, sdp);
    }

    async sendIceCandidate(roomId: string, targetConnectionId: string, candidate: any): Promise<void> {
        await this.hubConnection.invoke('SendIceCandidate', roomId, targetConnectionId, candidate);
    }

    async stopConnection(): Promise<void> {
        if (this.hubConnection) {
            await this.hubConnection.stop();
            this.connected.set(false);
        }
    }

    private registerEvents(): void {
        this.hubConnection.on('UserJoined', (connectionId: string, userCount: number) => {
            console.log('[SignalR] UserJoined:', connectionId, 'count:', userCount);
            this.userJoined.set({ connectionId, userCount });
        });

        this.hubConnection.on('UserLeft', (connectionId: string, userCount: number) => {
            console.log('[SignalR] UserLeft:', connectionId, 'count:', userCount);
            this.userLeft.set({ connectionId, userCount });
        });

        this.hubConnection.on('RoomJoined', (roomId: string, userCount: number) => {
            console.log('[SignalR] RoomJoined:', roomId, 'count:', userCount);
            this.roomJoined.set({ roomId, userCount });
        });

        this.hubConnection.on('ReceiveOffer', (fromId: string, sdp: any) => {
            console.log('[SignalR] ReceiveOffer from:', fromId);
            this.receiveOffer.set({ fromId, sdp });
            this.onOffer?.(fromId, sdp);
        });

        this.hubConnection.on('ReceiveAnswer', (fromId: string, sdp: any) => {
            console.log('[SignalR] ReceiveAnswer from:', fromId);
            this.receiveAnswer.set({ fromId, sdp });
            this.onAnswer?.(fromId, sdp);
        });

        this.hubConnection.on('ReceiveIceCandidate', (fromId: string, candidate: any) => {
            this.receiveIceCandidate.set({ fromId, candidate });
            this.onIceCandidate?.(fromId, candidate);
        });

        this.hubConnection.on('Error', (message: string) => {
            console.error('[SignalR] Error:', message);
            this.error.set(message);
        });
    }
}
