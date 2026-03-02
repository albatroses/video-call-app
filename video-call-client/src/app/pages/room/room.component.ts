import { Component, OnInit, OnDestroy, viewChild, ElementRef, signal, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SignalrService } from '../../services/signalr.service';
import { WebrtcService } from '../../services/webrtc.service';
import { ChatComponent } from '../../components/chat/chat.component';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [ChatComponent],
  template: `
    <div class="room-container">
      <!-- Pre-call Lobby Overlay -->
      @if (isInLobby()) {
        <div class="lobby-overlay">
          <div class="lobby-card">
            <h2>Ready to join?</h2>
            <p>Check your camera and microphone before entering the room.</p>
            
            <div class="lobby-video-container">
              <video #lobbyVideo autoplay playsinline muted></video>
              @if (!isVideoEnabled()) {
                <div class="no-video-overlay"><div class="avatar">Y</div></div>
              }
            </div>

            <div class="lobby-controls">
              <button class="control-btn" [class.off]="!isAudioEnabled()" (click)="toggleAudio()" title="Toggle Microphone">
                @if (isAudioEnabled()) {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                } @else {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                }
              </button>

              <button class="control-btn" [class.off]="!isVideoEnabled()" (click)="toggleVideo()" title="Toggle Camera">
                @if (isVideoEnabled()) {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 7l-7 5 7 5V7z"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                } @else {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                }
              </button>
            </div>
            
            <button class="join-btn" (click)="joinCall()">Join Now</button>
          </div>
        </div>
      }

      <!-- Connection overlay -->
      @if (isConnecting()) {
        <div class="connecting-overlay">
          <div class="connecting-card">
            <div class="pulse-ring"></div>
            <div class="connecting-icon">📡</div>
            <h2>{{ isInLobby() ? 'Getting Camera...' : 'Connecting...' }}</h2>
            <p>{{ isInLobby() ? 'Please allow access to your camera and microphone' : 'Setting up your encrypted connection' }}</p>
          </div>
        </div>
      }

      <!-- Top bar -->
      <div class="top-bar">
        <div class="room-info">
          <span class="encrypt-badge">🔒 Encrypted</span>
          <span class="room-id">Room: {{ roomId() }}</span>
        </div>
        <div class="participant-count">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
          {{ participantCount() }}
        </div>
        <div class="call-timer">{{ callDuration() }}</div>
      </div>

      <!-- Video grid -->
      <div class="video-grid" [class.single]="participantCount() < 2" [class.multi]="participantCount() >= 2">
        <!-- Remote video — always in DOM, CSS controlled -->
        <div class="video-wrapper remote-video" [class.visible]="participantCount() >= 2" [class.hidden]="participantCount() < 2">
          <video #remoteVideo autoplay playsinline></video>
          <div class="video-label">
            <span class="dot online"></span>
            Participant
          </div>
          @if (!hasRemoteStream() && participantCount() >= 2) {
            <div class="no-video-overlay">
              <div class="avatar">P</div>
            </div>
          }
        </div>

        <!-- Local video -->
        <div class="video-wrapper local-video" [class.pip]="participantCount() >= 2">
          <video #localVideo autoplay playsinline muted></video>
          <div class="video-label">
            <span class="dot online"></span>
            You {{ !isAudioEnabled() ? '(Muted)' : '' }}
          </div>
          @if (!isVideoEnabled()) {
            <div class="no-video-overlay">
              <div class="avatar">Y</div>
            </div>
          }
        </div>

        <!-- Waiting state -->
        @if (participantCount() < 2 && !isConnecting() && !isInLobby()) {
          <div class="waiting-panel">
            <div class="waiting-content">
              <div class="waiting-animation">
                <div class="wave-circle"></div>
                <div class="wave-circle delay-1"></div>
                <div class="wave-circle delay-2"></div>
                <span class="waiting-icon">👥</span>
              </div>
              <h3>Waiting for participant</h3>
              <p>Share the room link and secret code to invite someone</p>
            </div>
          </div>
        }
      </div>

      <!-- Controls -->
      <div class="controls-bar">
        <button class="control-btn" [class.off]="!isAudioEnabled()" (click)="toggleAudio()" title="Toggle Microphone">
          @if (isAudioEnabled()) {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          } @else {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
              <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          }
        </button>

        <button class="control-btn" [class.off]="!isVideoEnabled()" (click)="toggleVideo()" title="Toggle Camera">
          @if (isVideoEnabled()) {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          } @else {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          }
        </button>

        <button class="control-btn end-call" (click)="endCall()" title="End Call">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l-3.41-2.6z"/>
          </svg>
        </button>

        <button class="control-btn" [class.on]="isChatOpen()" (click)="toggleChat()" title="Toggle Chat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>

      <!-- Chat Sidebar -->
      @if (isChatOpen()) {
        <div class="chat-sidebar">
          <app-chat [roomId]="roomId()" [myConnectionId]="getMyConnectionId"></app-chat>
        </div>
      }
    </div>
  `,
  styles: [`
    .room-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .lobby-overlay {
      position: fixed;
      inset: 0;
      z-index: 90;
      background: rgba(5, 5, 20, 0.98);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .lobby-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 2.5rem;
      width: 100%;
      max-width: 600px;
      text-align: center;
    }

    .lobby-card h2 { color: #f0f0f5; font-size: 1.8rem; margin-bottom: 0.5rem; }
    .lobby-card p { color: #94a3b8; margin-bottom: 2rem; }

    .lobby-video-container {
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 1.5rem;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .lobby-video-container video {
      width: 100%; height: 100%; object-fit: cover;
    }

    .lobby-controls {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .join-btn {
      width: 100%;
      padding: 1rem;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .join-btn:hover { background: linear-gradient(135deg, #4f46e5, #4338ca); transform: translateY(-2px); }

    .connecting-overlay {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(5, 5, 20, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .connecting-card { text-align: center; position: relative; }

    .pulse-ring {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -80%);
      width: 80px; height: 80px;
      border-radius: 50%;
      border: 2px solid rgba(99, 102, 241, 0.3);
      animation: pulse 1.5s ease-out infinite;
    }

    .connecting-icon { font-size: 3rem; margin-bottom: 1rem; }
    .connecting-card h2 { color: #f0f0f5; font-size: 1.5rem; margin-bottom: 0.5rem; }
    .connecting-card p { color: #94a3b8; font-size: 0.9rem; }

    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      background: rgba(0, 0, 0, 0.4);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      z-index: 10;
    }

    .room-info { display: flex; align-items: center; gap: 1rem; }

    .encrypt-badge {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0.3rem 0.75rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 100px;
      color: #10b981;
      font-size: 0.72rem; font-weight: 600;
    }

    .room-id { color: #64748b; font-size: 0.8rem; font-family: monospace; }
    .participant-count { display: flex; align-items: center; gap: 0.4rem; color: #94a3b8; font-size: 0.85rem; }
    .call-timer { color: #94a3b8; font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; }

    .video-grid {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem; gap: 1rem;
      position: relative;
    }

    .video-grid.multi {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }

    .video-wrapper {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      background: rgba(15, 15, 30, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .video-wrapper video {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
    }

    .remote-video { width: 100%; height: 100%; }
    .remote-video.hidden { display: none; }
    .remote-video.visible { display: block; animation: fadeIn 0.5s ease; }

    .local-video { width: 100%; max-width: 640px; aspect-ratio: 16/9; }

    .local-video.pip {
      position: absolute;
      bottom: 1.5rem; right: 1.5rem;
      width: 240px; max-width: 30%;
      aspect-ratio: 16/9;
      z-index: 20;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      cursor: grab;
    }

    .local-video.pip:hover {
      border-color: rgba(99, 102, 241, 0.4);
      transform: scale(1.02);
    }

    .video-label {
      position: absolute;
      bottom: 0.75rem; left: 0.75rem;
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 0.75rem; font-weight: 500;
    }

    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot.online { background: #10b981; box-shadow: 0 0 6px #10b981; }

    .no-video-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15, 23, 42, 0.9);
    }

    .avatar {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem; font-weight: 700; color: white;
    }

    .waiting-panel {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center; z-index: 5;
    }

    .waiting-content h3 { color: #e2e8f0; font-size: 1.3rem; margin-bottom: 0.5rem; }
    .waiting-content p { color: #64748b; font-size: 0.85rem; }

    .waiting-animation {
      position: relative;
      width: 100px; height: 100px;
      margin: 0 auto 1.5rem;
      display: flex; align-items: center; justify-content: center;
    }

    .wave-circle {
      position: absolute; width: 100%; height: 100%;
      border-radius: 50%;
      border: 2px solid rgba(99, 102, 241, 0.2);
      animation: wave 2s ease-out infinite;
    }

    .wave-circle.delay-1 { animation-delay: 0.5s; }
    .wave-circle.delay-2 { animation-delay: 1s; }
    .waiting-icon { font-size: 2.5rem; position: relative; z-index: 2; }

    .controls-bar {
      display: flex; align-items: center; justify-content: center;
      gap: 1rem; padding: 1.25rem;
      background: rgba(0, 0, 0, 0.5);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .control-btn {
      width: 56px; height: 56px;
      border-radius: 50%; border: none;
      background: rgba(255, 255, 255, 0.08);
      color: #f0f0f5;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s ease;
    }

    .control-btn:hover { background: rgba(255, 255, 255, 0.15); transform: scale(1.05); }
    .control-btn.off { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .control-btn.off:hover { background: rgba(239, 68, 68, 0.3); }
    .control-btn.end-call { background: #ef4444; width: 64px; height: 64px; }
    .control-btn.end-call:hover { background: #dc2626; transform: scale(1.08); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse {
      0% { transform: translate(-50%, -80%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -80%) scale(2); opacity: 0; }
    }
    @keyframes wave {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }

    @media (max-width: 640px) {
      .local-video.pip { width: 140px; }
      .top-bar { padding: 0.5rem 1rem; }
      .room-id { display: none; }
    }

    .chat-sidebar {
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 350px;
      max-width: 100%;
      z-index: 50;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .control-btn.on {
      background: #4f46e5;
      color: white;
    }
  `]
})
export class RoomComponent implements OnInit, OnDestroy {
  // Signal-based viewChild queries (Angular 20)
  private localVideoEl = viewChild<ElementRef<HTMLVideoElement>>('localVideo');
  private remoteVideoEl = viewChild<ElementRef<HTMLVideoElement>>('remoteVideo');
  private lobbyVideoEl = viewChild<ElementRef<HTMLVideoElement>>('lobbyVideo');

  // DI via inject()
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private signalrService = inject(SignalrService);
  private webrtcService = inject(WebrtcService);
  private chatService = inject(ChatService);

  // Component state — all signals
  readonly roomId = signal('');
  readonly isInLobby = signal(true);
  readonly isConnecting = signal(false);
  readonly isAudioEnabled = signal(true);
  readonly isVideoEnabled = signal(true);
  readonly hasRemoteStream = signal(false);
  readonly participantCount = signal(1);
  readonly callDuration = signal('00:00');
  readonly isChatOpen = signal(false);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private callStartTime: Date | null = null;
  private pendingLocalStream: MediaStream | null = null;
  private pendingRemoteStream: MediaStream | null = null;

  constructor() {
    // Effect: attach local stream to video element when both are available
    effect(() => {
      const el = this.localVideoEl();
      const lobbyEl = this.lobbyVideoEl();

      if (this.pendingLocalStream) {
        if (this.isInLobby() && lobbyEl) {
          console.log('[Room] Effect: attaching local stream to lobby video');
          lobbyEl.nativeElement.srcObject = this.pendingLocalStream;
          lobbyEl.nativeElement.play().catch(e => console.warn('Lobby autoplay:', e));
        } else if (!this.isInLobby() && el) {
          console.log('[Room] Effect: attaching local stream to room grid video');
          el.nativeElement.srcObject = this.pendingLocalStream;
          el.nativeElement.play().catch(e => console.warn('Local autoplay:', e));
        }
      }
    });

    // Effect: attach remote stream to video element when it appears
    effect(() => {
      const el = this.remoteVideoEl();
      const streamData = this.webrtcService.remoteStream();
      if (el && streamData) {
        console.log('[Room] Effect: attaching remote stream from', streamData.peerId);
        el.nativeElement.srcObject = streamData.stream;
        el.nativeElement.play().catch(e => console.warn('Remote autoplay:', e));
      }
    });

    // Effect: react to remote stream signal
    effect(() => {
      const streamData = this.webrtcService.remoteStream();
      if (streamData) {
        console.log(`[Room] *** Remote stream received from ${streamData.peerId} ***`);
        this.hasRemoteStream.set(true);
        this.pendingRemoteStream = streamData.stream;
      }
    });

    // Effect: react to user joined signal
    effect(() => {
      const joined = this.signalrService.userJoined();
      if (joined) {
        console.log(`[Room] User joined: ${joined.connectionId}, count: ${joined.userCount}`);
        this.participantCount.set(joined.userCount);
        this.webrtcService.createAndSendOffer(joined.connectionId);
      }
    });

    // Effect: react to user left signal
    effect(() => {
      const left = this.signalrService.userLeft();
      if (left) {
        console.log(`[Room] User left: ${left.connectionId}, count: ${left.userCount}`);
        this.participantCount.set(left.userCount);
        this.webrtcService.removePeer(left.connectionId);
        if (left.userCount <= 1) {
          this.hasRemoteStream.set(false);
          this.pendingRemoteStream = null;
        }
      }
    });

    // Effect: react to room joined confirmation
    effect(() => {
      const room = this.signalrService.roomJoined();
      if (room) {
        console.log(`[Room] Joined room: ${room.roomId}, count: ${room.userCount}`);
        this.participantCount.set(room.userCount);
      }
    });

    // Effect: react to peer disconnection
    effect(() => {
      const peerId = this.webrtcService.peerDisconnected();
      if (peerId) {
        console.log(`[Room] Peer disconnected: ${peerId}`);
        this.hasRemoteStream.set(false);
        this.pendingRemoteStream = null;
      }
    });

    // Effect: react to errors
    effect(() => {
      const err = this.signalrService.error();
      if (err) {
        console.error('[Room] SignalR error:', err);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const roomId = this.route.snapshot.queryParams['room'] || '';
    if (!roomId) {
      this.router.navigate(['/']);
      return;
    }
    this.roomId.set(roomId);
    await this.initializeCall();
  }

  private async initializeCall(): Promise<void> {
    this.isConnecting.set(true);
    try {
      // 1. Get local media (non-blocking) - wait for camera before entering lobby
      console.log('[Room] Requesting camera/mic access...');
      try {
        const stream = await this.webrtcService.initLocalStream();
        this.pendingLocalStream = stream;
      } catch (mediaError) {
        console.warn('[Room] Could not get camera/mic. Joining without media.', mediaError);
        this.isVideoEnabled.set(false);
        this.isAudioEnabled.set(false);
      }

      this.isConnecting.set(false); // Stop "Getting Camera" spinner, show lobby
      this.webrtcService.setRoomId(this.roomId());
    } catch (error: any) {
      console.error('[Room] Init media failed:', error);
      this.isConnecting.set(false);
      alert('Failed to initialize media stream. Error: ' + (error.message || 'Unknown error'));
      this.router.navigate(['/']);
    }
  }

  async joinCall(): Promise<void> {
    this.isInLobby.set(false);
    this.isConnecting.set(true);

    try {
      // 2. Connect SignalR
      console.log('[Room] Connecting to SignalR...');
      this.signalrService.buildConnection();
      await this.signalrService.startConnection();

      // 3. Join room
      console.log('[Room] Joining room:', this.roomId());
      await this.signalrService.joinRoom(this.roomId());

      this.isConnecting.set(false);
      this.startTimer();
      console.log('[Room] Join complete.');
    } catch (error: any) {
      console.error('[Room] Init failed:', error);

      // Try SignalR-only fallback (no camera)
      try {
        console.log('[Room] Attempting SignalR fallback...');
        this.signalrService.buildConnection();
        await this.signalrService.startConnection();
        await this.signalrService.joinRoom(this.roomId());
        this.isConnecting.set(false);
        this.startTimer();
      } catch (innerError: any) {
        console.error('[Room] SignalR fallback also failed:', innerError);
        this.isConnecting.set(false);
        alert('Failed to connect to the video call server. Please check your network and try again. Error: ' + (error.message || innerError.message || 'Unknown error'));
        this.router.navigate(['/']);
      }
    }
  }

  toggleAudio(): void {
    this.isAudioEnabled.update(v => !v);
    this.webrtcService.toggleAudio(this.isAudioEnabled());
  }

  toggleVideo(): void {
    this.isVideoEnabled.update(v => !v);
    this.webrtcService.toggleVideo(this.isVideoEnabled());
  }

  endCall(): void {
    this.cleanup();
    this.router.navigate(['/']);
  }

  toggleChat(): void {
    this.isChatOpen.update(v => !v);
  }

  getMyConnectionId = () => {
    return this.signalrService.getConnectionId() || '';
  };

  private startTimer(): void {
    this.callStartTime = new Date();
    this.timerInterval = setInterval(() => {
      if (this.callStartTime) {
        const diff = Math.floor((Date.now() - this.callStartTime.getTime()) / 1000);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        this.callDuration.set(`${mins}:${secs}`);
      }
    }, 1000);
  }

  private cleanup(): void {
    this.webrtcService.cleanup();
    this.signalrService.stopConnection();
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
