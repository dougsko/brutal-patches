import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(): void {
    window.location.href = '/auth/google';
  }

  getUserFromCookie(): { email?: string; username?: string } | null {
    const m = document.cookie.match(/jwt=([^;]+)/);
    if (!m) return null;
    try {
      const payload = JSON.parse(atob(m[1].split('.')[1]));
      return { email: payload.email, username: payload.username };
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getUserFromCookie();
  }
}
