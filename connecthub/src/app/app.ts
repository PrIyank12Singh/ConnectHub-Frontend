import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { StompService } from './core/services/stomp.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(private authService: AuthService, private stompService: StompService) {}

  ngOnInit(): void {
    const token = this.authService.getToken();
    const user = this.authService.getCurrentUser();
    if (token && user) {
      try { this.stompService.connect(token, user.userId); } catch (err) { console.warn('[App] STOMP connect failed', err); }
    }
  }
}
