import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getUser(): { username?: string; email?: string } | null {
    try {
      const cookie = document.cookie.split('; ').find(r => r.startsWith('jwt='));
      if (!cookie) return null;
      const payload = JSON.parse(atob(cookie.split('.')[1]));
      return { username: payload.username, email: payload.email };
    } catch {
      return null;
    }
  }
  signOut(): void {
    document.cookie = 'jwt=; Max-Age=0; path=/; SameSite=Lax';
  }
}
