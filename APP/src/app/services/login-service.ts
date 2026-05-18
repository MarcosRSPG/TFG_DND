import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenHashService } from './token-hash-service';

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  current_password?: string;
}

export interface UpdateUserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  access_token: string;
}

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

  async verifyToken(token: string) {
    const hashedToken = this.tokenHashService.generateHash(this.apiToken);

    console.log('DEBUG verifyToken - token exists:', !!token);
    console.log('DEBUG verifyToken - apiUrl:', this.apiUrl);

    try {
      const data = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/verify`, {}, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken,
            Authorization: `Bearer ${token}`,
          },
        })
      );

      console.log('DEBUG verifyToken - FULL data:', JSON.stringify(data, null, 2));
      console.log('DEBUG verifyToken - data.valid:', data?.valid);
      console.log('DEBUG verifyToken - data.user:', JSON.stringify(data?.user, null, 2));
      
      if (data?.user) {
        console.log('DEBUG verifyToken - user.user_id:', data.user.user_id);
        console.log('DEBUG verifyToken - user.isAdmin:', data.user.isAdmin);
        console.log('DEBUG verifyToken - user keys:', Object.keys(data.user));
      }
      
      return data.valid ? data.user : null;
    } catch (error) {
      console.error('DEBUG verifyToken - error:', error);
      return null;
    }
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

  logout(): void {
    localStorage.removeItem('token');
    this._isLoggedIn.set(false);
    this._currentUser.set(null);
    window.location.href = '/login';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  async getUserId(): Promise<string | null> {
    const token = this.getToken();
    if (!token) {
      console.log('DEBUG getUserId - No token');
      return null;
    }

    const user = await this.verifyToken(token);
    console.log('DEBUG getUserId - user from verifyToken:', user);
    console.log('DEBUG getUserId - user.user_id:', user?.user_id);
    return user?.user_id ?? null;
  }

  async getUserRole(): Promise<string | null> {
    const token = this.getToken();
    if (!token) {
      console.log('DEBUG getUserRole - No token');
      return null;
    }

    const user = await this.verifyToken(token);
    console.log('DEBUG getUserRole - user from verifyToken:', user);
    // API returns `isAdmin: true`, not `role: 'admin'`
    // Convert isAdmin boolean to role string
    const role = user?.isAdmin ? 'admin' : 'user';
    console.log('DEBUG getUserRole - computed role:', role);
    return role;
  }

  async updateUser(id: string, data: UpdateUserPayload): Promise<UpdateUserResponse> {
    this._isLoading.set(true);
    try {
      const hashedToken = this.tokenHashService.generateHash(this.apiToken);
      const token = localStorage.getItem('token');
      const res = await firstValueFrom(
        this.http.put<UpdateUserResponse>(`${this.apiUrl}/users/${id}`, data, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken,
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      if (res?.access_token) {
        localStorage.setItem('token', res.access_token);
      }
      return res;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteAccount(id: string): Promise<void> {
    this._isLoading.set(true);
    try {
      const hashedToken = this.tokenHashService.generateHash(this.apiToken);
      const token = localStorage.getItem('token');
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/users/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token': hashedToken,
            Authorization: `Bearer ${token}`,
          },
        }),
      );
    } finally {
      this._isLoading.set(false);
    }
  }
}
