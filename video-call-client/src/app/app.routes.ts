import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { JoinComponent } from './pages/join/join.component';
import { RoomComponent } from './pages/room/room.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'join', component: JoinComponent },
    { path: 'room', component: RoomComponent },
    { path: '**', redirectTo: '' }
];
