import { Component, Input, signal, inject, effect, viewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { FileUploadComponent } from '../file-upload/file-upload.component';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, FileUploadComponent],
    template: `
    <div class="chat-container">
      <div class="chat-header">
        <h3>Room Chat</h3>
      </div>
      
      <div class="messages-list" #scrollContainer>
        @for (msg of messages(); track msg.id) {
          <div class="message-wrapper" [class.own]="msg.senderConnectionId === myConnectionId()">
            <div class="message-bubble">
              @if (isUrl(msg.content)) {
                <a [href]="msg.content" target="_blank" class="file-link">
                  <span class="file-icon">📎</span>
                  <span class="file-name">{{ getFileName(msg.content) }}</span>
                </a>
              } @else {
                <p>{{ msg.content }}</p>
              }
              <span class="timestamp">{{ msg.timestamp | date:'shortTime' }}</span>
            </div>
          </div>
        }
      </div>

      <div class="chat-input-area">
        <app-file-upload (fileUploaded)="onFileUploaded($event)"></app-file-upload>
        <input 
          type="text" 
          [(ngModel)]="newMessageText" 
          (keydown.enter)="sendMessage()" 
          placeholder="Type a message..." 
        />
        <button class="send-btn" (click)="sendMessage()" [disabled]="!newMessageText.trim()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: rgba(15, 23, 42, 0.95);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
    }

    .chat-header {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .chat-header h3 { color: #f1f5f9; margin: 0; font-size: 1rem; }

    .messages-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .message-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .message-wrapper.own {
      align-items: flex-end;
    }

    .message-bubble {
      max-width: 85%;
      padding: 0.75rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      position: relative;
    }

    .own .message-bubble {
      background: #4f46e5;
      color: white;
    }

    .message-bubble p { margin: 0; font-size: 0.9rem; line-height: 1.4; word-break: break-all; }
    
    .timestamp {
      font-size: 0.65rem;
      color: #94a3b8;
      display: block;
      margin-top: 0.25rem;
      text-align: right;
    }

    .own .timestamp { color: rgba(255, 255, 255, 0.7); }

    .chat-input-area {
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
    }

    .chat-input-area input {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.6rem 1rem;
      color: white;
      outline: none;
    }

    .send-btn {
      background: #4f46e5;
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
    }

    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .file-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: inherit;
      text-decoration: none;
      font-size: 0.9rem;
    }

    .file-icon { font-size: 1.2rem; }
  `]
})
export class ChatComponent implements OnInit {
    @Input({ required: true }) roomId!: string;
    @Input({ required: true }) myConnectionId!: () => string;

    private chatService = inject(ChatService);
    private scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

    messages = this.chatService.messages;
    newMessageText = '';

    constructor() {
        // Auto-scroll to bottom when messages change
        effect(() => {
            this.messages();
            setTimeout(() => this.scrollToBottom(), 50);
        });
    }

    ngOnInit() {
        this.chatService.joinRoom(this.roomId);
    }

    sendMessage() {
        if (!this.newMessageText.trim()) return;
        this.chatService.sendMessage(this.roomId, this.newMessageText);
        this.newMessageText = '';
    }

    onFileUploaded(url: string) {
        this.chatService.sendMessage(this.roomId, url);
    }

    isUrl(text: string) {
        return text.startsWith('http');
    }

    getFileName(url: string) {
        const parts = url.split('/');
        return parts[parts.length - 1];
    }

    private scrollToBottom() {
        const el = this.scrollContainer();
        if (el) {
            el.nativeElement.scrollTop = el.nativeElement.scrollHeight;
        }
    }
}
