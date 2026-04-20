import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenHashService } from './token-hash.service';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly apiToken = environment.API_TOKEN;
  private readonly tokenHashService = inject(TokenHashService);

  async getUserRole(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;
    const user = await this.verifyToken(token);
    return user ? user.role : null;
  }

  async login(email: string, password: string) {
    const hashedToken = this.tokenHashService.generateHash(this.apiToken);

    const user = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/auth/login`,
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken
          }
        }
      )
    );

    if (user && user.access_token) {
      localStorage.setItem('token', user.access_token);
    }

    return user;
  }

  async register(name: string, email: string, password: string) {
    const hashedToken = this.tokenHashService.generateHash(this.apiToken);

    return firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/users`,
        { username: name, email, password },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken
          }
        }
      )
    );
  }

  async verifyToken(token: string) {
    const hashedToken = this.tokenHashService.generateHash(this.apiToken);

    const data = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/auth/verify`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken,
            'Authorization': `Bearer ${token}`
          }
        }
      )
    );

    return data.valid ? data.user : null;
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  async getUserId(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    const user = await this.verifyToken(token);
    return user ? user._id : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}