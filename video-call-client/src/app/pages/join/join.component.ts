import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-join',
  standalone: true,
  template: `
    <div class="join-container">
      <div class="join-card">
        <div class="shield-icon">🛡️</div>
        <h2>Join Secure Call</h2>
        <p class="description">Enter the 6-digit secret code to access this encrypted video consultation.</p>

        @if (errorMsg()) {
          <div class="error-banner">⚠️ {{ errorMsg() }}</div>
        }

        <label class="field-label">SECRET CODE</label>
        <input
          id="secretCode"
          type="text"
          maxlength="6"
          placeholder="Enter 6-digit code"
          [value]="secretCode()"
          (input)="onCodeInput($event)"
          [class.error-input]="errorMsg()"
          autocomplete="off"
        />

        <button
          class="verify-btn"
          [disabled]="isVerifying() || secretCode().length !== 6"
          (click)="verifyCode()"
        >
          @if (isVerifying()) {
            <span class="spinner"></span> Verifying...
          } @else {
            🔐 Verify & Join Call
          }
        </button>

        <div class="compliance-badges">
          <span>� End-to-end encrypted</span>
          <span>🚫 No data stored</span>
          <span>📋 Access attempts logged</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .join-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .join-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
      text-align: center;
      backdrop-filter: blur(20px);
    }

    .shield-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    h2 {
      color: #f0f0f5;
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .description {
      color: #94a3b8;
      font-size: 0.88rem;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .field-label {
      display: block;
      text-align: left;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    input {
      width: 100%;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1.5px solid rgba(99, 102, 241, 0.2);
      border-radius: 14px;
      color: #f0f0f5;
      font-size: 1.4rem;
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.4em;
      outline: none;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 1.25rem;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    input:focus {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
    }

    input.error-input {
      border-color: rgba(239, 68, 68, 0.5);
      animation: shake 0.4s ease;
    }

    .error-banner {
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      color: #f87171;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      animation: fadeIn 0.3s ease;
    }

    .verify-btn {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      margin-bottom: 1.5rem;
    }

    .verify-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
    }

    .verify-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .compliance-badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 1.25rem;
    }

    .compliance-badges span {
      font-size: 0.72rem;
      color: #64748b;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class JoinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private roomService = inject(RoomService);

  readonly secretCode = signal('');
  readonly isVerifying = signal(false);
  readonly errorMsg = signal<string | null>(null);

  private roomId = '';

  ngOnInit(): void {
    this.roomId = this.route.snapshot.queryParams['room'] || '';
    if (!this.roomId) {
      this.router.navigate(['/']);
    }
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Only allow digits
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    this.secretCode.set(digits);
    input.value = digits;
    this.errorMsg.set(null);
  }

  verifyCode(): void {
    if (this.secretCode().length !== 6) return;

    this.isVerifying.set(true);
    this.errorMsg.set(null);

    this.roomService.verifyCode(this.roomId, this.secretCode()).subscribe({
      next: (res) => {
        this.isVerifying.set(false);
        if (res.success) {
          this.router.navigate(['/room'], { queryParams: { room: this.roomId } });
        } else {
          this.errorMsg.set(res.message || 'Verification failed.');
        }
      },
      error: () => {
        this.isVerifying.set(false);
        this.errorMsg.set('Invalid secret code or room has expired.');
      }
    });
  }
}
