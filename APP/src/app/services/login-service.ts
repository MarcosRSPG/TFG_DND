import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenHashService } from './token-hash-service';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly apiToken = environment.API_TOKEN;
  private readonly tokenHashService = inject(TokenHashService);

  // === SIGNALS ===
  private _isLoggedIn = signal<boolean>(!!localStorage.getItem('token'));
  private _currentUser = signal<any>(null);
  private _isLoading = signal<boolean>(false);

  // Readonly signals
  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  async getUserRole(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;
    const user = await this.verifyToken(token);
    return user?.role ?? null;
  }

  async login(email: string, password: string) {
    this._isLoading.set(true);
    try {
      const hashedToken = this.tokenHashService.generateHash(this.apiToken);

      const user = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken,
          },
        })
      );

      if (user && user.access_token) {
        localStorage.setItem('token', user.access_token);
        this._isLoggedIn.set(true);
        this._currentUser.set(user);
      }

      return user;
    } finally {
      this._isLoading.set(false);
    }
  }

  async register(name: string, email: string, password: string) {
    this._isLoading.set(true);
    try {
      const hashedToken = this.tokenHashService.generateHash(this.apiToken);

      return firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/users`, { username: name, email, password }, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken,
          },
        })
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  async verifyToken(token: string) {
    const hashedToken = this.tokenHashService.generateHash(this.apiToken);

    const data = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/auth/verify`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': hashedToken,
          Authorization: `Bearer ${token}`,
        },
      })
    );

    return data.valid ? data.user : null;
  }

  logout(): void {
    localStorage.removeItem('token');
    this._isLoggedIn.set(false);
    this._currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  async getUserId(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    const user = await this.verifyToken(token);
    return user?._id ?? null;
  }
}
