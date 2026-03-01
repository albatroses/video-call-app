import { Injectable, signal } from '@angular/core';
import { SignalrService } from './signalr.service';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

@Injectable({
    providedIn: 'root'
})
export class WebrtcService {
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private localStream: MediaStream | null = null;
    private roomId = '';

    // Signals for stream state
    readonly remoteStream = signal<{ peerId: string; stream: MediaStream } | null>(null);
    readonly peerDisconnected = signal<string | null>(null);
    readonly connectionState = signal<{ peerId: string; state: string } | null>(null);

    constructor(private signalrService: SignalrService) {
        this.setupSignalrCallbacks();
    }

    async initLocalStream(): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('[WebRTC] Local stream acquired:', this.localStream.getTracks().map(t => `${t.kind}:${t.label}`));
            return this.localStream;
        } catch (error) {
            console.error('[WebRTC] Failed to get local stream:', error);
            throw error;
        }
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    setRoomId(roomId: string): void {
        this.roomId = roomId;
    }

    toggleAudio(enabled: boolean): void {
        this.localStream?.getAudioTracks().forEach(track => track.enabled = enabled);
    }

    toggleVideo(enabled: boolean): void {
        this.localStream?.getVideoTracks().forEach(track => track.enabled = enabled);
    }

    async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
        // Close any existing connection to this peer
        this.removePeer(peerId);

        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.peerConnections.set(peerId, pc);

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream!);
            });
            console.log('[WebRTC] Added local tracks to peer connection for', peerId);
        }

        // Handle incoming remote tracks
        pc.ontrack = (event) => {
            console.log(`[WebRTC] *** Received remote track from ${peerId}: ${event.track.kind} ***`);
            if (event.streams[0]) {
                this.remoteStream.set({ peerId, stream: event.streams[0] });
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await this.signalrService.sendIceCandidate(this.roomId, peerId, event.candidate);
            }
        };

        // Monitor connection state
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            console.log(`[WebRTC] Peer ${peerId} connection state: ${state}`);
            this.connectionState.set({ peerId, state });

            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.peerDisconnected.set(peerId);
                this.removePeer(peerId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE state for ${peerId}: ${pc.iceConnectionState}`);
        };

        return pc;
    }

    async createAndSendOffer(peerId: string): Promise<void> {
        console.log('[WebRTC] Creating offer for', peerId);
        const pc = await this.createPeerConnection(peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.signalrService.sendOffer(this.roomId, peerId, offer);
        console.log('[WebRTC] Offer sent to', peerId);
    }

    async handleOffer(fromId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
        console.log('[WebRTC] Handling offer from', fromId);
        const pc = await this.createPeerConnection(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.signalrService.sendAnswer(this.roomId, fromId, answer);
        console.log('[WebRTC] Answer sent to', fromId);
    }

    async handleAnswer(fromId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
        const pc = this.peerConnections.get(fromId);
        if (pc) {
            console.log('[WebRTC] Setting remote description (answer) from', fromId);
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    }

    async handleIceCandidate(fromId: string, candidate: RTCIceCandidateInit): Promise<void> {
        const pc = this.peerConnections.get(fromId);
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    removePeer(peerId: string): void {
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(peerId);
        }
    }

    cleanup(): void {
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Reset signals
        this.remoteStream.set(null);
        this.peerDisconnected.set(null);
        this.connectionState.set(null);
    }

    private setupSignalrCallbacks(): void {
        // Use imperative callbacks for immediate WebRTC handling
        this.signalrService.onOffer = (fromId, sdp) => {
            this.handleOffer(fromId, sdp);
        };

        this.signalrService.onAnswer = (fromId, sdp) => {
            this.handleAnswer(fromId, sdp);
        };

        this.signalrService.onIceCandidate = (fromId, candidate) => {
            this.handleIceCandidate(fromId, candidate);
        };
    }
}
