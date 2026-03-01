import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateRoomResponse {
    roomId: string;
    secretCode: string;
    joinUrl: string;
}

export interface VerifyCodeResponse {
    success: boolean;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class RoomService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    createRoom(): Observable<CreateRoomResponse> {
        return this.http.post<CreateRoomResponse>(`${this.apiUrl}/room/create`, {});
    }

    verifyCode(roomId: string, secretCode: string): Observable<VerifyCodeResponse> {
        return this.http.post<VerifyCodeResponse>(`${this.apiUrl}/room/verify`, {
            roomId,
            secretCode
        });
    }

    checkRoom(roomId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/room/check/${roomId}`);
    }
}
