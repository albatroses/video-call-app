import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="home-container">
      <div class="hero">
        <div class="badge">🔒 HIPAA Compliant</div>
        <h1>Secure <span class="gradient-text">Video Call</span></h1>
        <p class="subtitle">End-to-end encrypted peer-to-peer video consultations. No data stored. No recordings. Complete privacy.</p>

        <div class="features">
          <div class="feature-card">
            <span class="feature-icon">🛡️</span>
            <h3>End-to-End Encrypted</h3>
            <p>WebRTC DTLS/SRTP encryption — media never touches our servers</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🔑</span>
            <h3>Secret Code Access</h3>
            <p>Each room requires a unique 6-digit code to join</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📋</span>
            <h3>Audit Logging</h3>
            <p>All access attempts are logged for HIPAA compliance</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">⏰</span>
            <h3>Auto-Expiring Rooms</h3>
            <p>Rooms automatically expire after 2 hours for security</p>
          </div>
        </div>

        @if (!roomData()) {
          <button class="create-btn" [disabled]="isCreating()" (click)="createRoom()">
            @if (isCreating()) {
              <span class="spinner"></span> Creating...
            } @else {
              📹 Create Secure Room
            }
          </button>
        }

        @if (roomData(); as room) {
          <div class="room-created">
            <div class="created-header">✅ Room Created</div>

            <label class="field-label">SHARE THIS LINK</label>
            <div class="copy-field">
              <span>{{ room.joinUrl }}</span>
              <button class="copy-btn" (click)="copyToClipboard(room.joinUrl)">📋</button>
            </div>

            <label class="field-label">SECRET CODE</label>
            <div class="copy-field code-field">
              <span class="secret-code">{{ room.secretCode }}</span>
              <button class="copy-btn" (click)="copyToClipboard(room.secretCode)">📋</button>
            </div>

            <div class="security-note">
              ⚠️ Share the secret code through a separate secure channel (not in the same message as the link).
            </div>

            <button class="join-btn" (click)="joinOwnRoom()">Join My Room →</button>
          </div>
        }

        @if (errorMsg()) {
          <div class="error-banner">⚠️ {{ errorMsg() }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .hero {
      text-align: center;
      max-width: 800px;
      width: 100%;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1.25rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 100px;
      color: #10b981;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 3.5rem;
      font-weight: 800;
      color: #f0f0f5;
      margin-bottom: 1rem;
      line-height: 1.1;
    }

    .gradient-text {
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 1.1rem;
      margin-bottom: 3rem;
      line-height: 1.6;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2.5rem;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 1.5rem;
      text-align: center;
      transition: all 0.3s ease;
    }

    .feature-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(99, 102, 241, 0.2);
      transform: translateY(-2px);
    }

    .feature-icon {
      font-size: 1.8rem;
      display: block;
      margin-bottom: 0.75rem;
    }

    .feature-card h3 {
      color: #e2e8f0;
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 0.4rem;
    }

    .feature-card p {
      color: #64748b;
      font-size: 0.78rem;
      line-height: 1.5;
    }

    .create-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2.5rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
    }

    .create-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
    }

    .create-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .room-created {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 2rem;
      margin-top: 2rem;
      text-align: left;
      animation: fadeIn 0.4s ease;
    }

    .created-header {
      font-size: 1.25rem;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 1.5rem;
    }

    .field-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }

    .copy-field {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      margin-bottom: 1.25rem;
    }

    .copy-field span {
      flex: 1;
      color: #e2e8f0;
      font-size: 0.9rem;
      font-family: 'JetBrains Mono', monospace;
      word-break: break-all;
    }

    .code-field {
      border-color: rgba(16, 185, 129, 0.2);
      background: rgba(16, 185, 129, 0.05);
    }

    .secret-code {
      font-size: 1.8rem !important;
      font-weight: 700;
      letter-spacing: 0.4em;
      color: #10b981 !important;
    }

    .copy-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      border-radius: 8px;
      padding: 0.4rem 0.6rem;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .copy-btn:hover {
      background: rgba(99, 102, 241, 0.2);
      color: white;
    }

    .security-note {
      padding: 0.75rem 1rem;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 10px;
      color: #fbbf24;
      font-size: 0.8rem;
      margin-bottom: 1.5rem;
    }

    .join-btn {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .join-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
    }

    .error-banner {
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      color: #f87171;
      font-size: 0.85rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 600px) {
      h1 { font-size: 2.2rem; }
      .features { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class HomeComponent {
  private roomService = inject(RoomService);
  private router = inject(Router);

  readonly isCreating = signal(false);
  readonly roomData = signal<{ roomId: string; secretCode: string; joinUrl: string } | null>(null);
  readonly errorMsg = signal<string | null>(null);

  createRoom(): void {
    this.isCreating.set(true);
    this.errorMsg.set(null);

    this.roomService.createRoom().subscribe({
      next: (data) => {
        this.roomData.set(data);
        this.isCreating.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Failed to create room. Please try again.');
        this.isCreating.set(false);
        console.error('[Home] Create room error:', err);
      }
    });
  }

  joinOwnRoom(): void {
    const room = this.roomData();
    if (room) {
      this.router.navigate(['/room'], { queryParams: { room: room.roomId } });
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('[Home] Copied to clipboard');
    });
  }
}
