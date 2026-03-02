import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResult {
    url: string;
}

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    private uploadUrl = `${environment.apiUrl}/upload`;

    constructor(private http: HttpClient) { }

    /**
     * Upload a file to the server.
     * Returns an observable that emits the upload progress and finally the result URL.
     */
    upload(file: File): Observable<HttpEvent<UploadResult>> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        const headers = new HttpHeaders({}); // No special headers needed for multipart/form-data
        return this.http.post<UploadResult>(this.uploadUrl, formData, {
            headers,
            reportProgress: true,
            observe: 'events'
        });
    }
}
