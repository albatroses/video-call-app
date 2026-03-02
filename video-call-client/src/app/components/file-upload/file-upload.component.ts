import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService, UploadResult } from '../../services/upload.service';
import { HttpEventType } from '@angular/common/http';

@Component({
    selector: 'app-file-upload',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="upload-container">
      <input type="file" #fileInput (change)="onFileSelected($event)" style="display: none" />
      
      @if (!isUploading()) {
        <button class="upload-btn" (click)="fileInput.click()" title="Upload File">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </button>
      } @else {
        <div class="progress-circle" [style.--progress]="progress() + '%'">
          <span class="progress-text">{{ progress() }}%</span>
        </div>
      }
    </div>
  `,
    styles: [`
    .upload-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .upload-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .upload-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .progress-circle {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: conic-gradient(#4f46e5 var(--progress), rgba(255, 255, 255, 0.1) 0deg);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .progress-circle::after {
      content: '';
      position: absolute;
      inset: 4px;
      background: #0f172a;
      border-radius: 50%;
    }

    .progress-text {
      position: relative;
      z-index: 1;
      font-size: 0.65rem;
      font-weight: 600;
      color: #94a3b8;
    }
  `]
})
export class FileUploadComponent {
    @Output() fileUploaded = new EventEmitter<string>();

    private uploadService = inject(UploadService);

    isUploading = signal(false);
    progress = signal(0);

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    private uploadFile(file: File) {
        this.isUploading.set(true);
        this.progress.set(0);

        this.uploadService.upload(file).subscribe({
            next: (event) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    this.progress.set(Math.round((100 * event.loaded) / event.total));
                } else if (event.type === HttpEventType.Response) {
                    const result = event.body as UploadResult;
                    this.fileUploaded.emit(result.url);
                    this.isUploading.set(false);
                }
            },
            error: (err) => {
                console.error('Upload failed:', err);
                alert('File upload failed. Please try again.');
                this.isUploading.set(false);
            }
        });
    }
}
