import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { TokenHashService } from './token-hash.service';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private url = environment.API_URL;
  private apiToken = environment.API_TOKEN;
  private tokenHashService: TokenHashService = new TokenHashService();
  constructor() {}

  async login(email: string, password: string) {
    try {
      const hashedToken = this.tokenHashService.generateHash(this.apiToken);
      const response = await fetch(this.url + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': hashedToken
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Invalid credentials');
      }

      const user = await response.json();

      // Guardar solo el token en localStorage
      if (user && user.access_token) {
        localStorage.setItem('token', user.access_token);
      }

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  async register(name: string, email: string, password: string) {
    try {
      const hashedToken = this.tokenHashService.generateHash(this.apiToken);
      const response = await fetch(this.url + '/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': hashedToken
        },
        body: JSON.stringify({
          username: name,
          email: email,
          password: password,
        }),
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }




  async verifyToken(token: string) {
    try {
      const response = await fetch(this.url + `/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': this.tokenHashService.generateHash(this.apiToken),
          'Authorization': `Bearer ${token}`,
        },
      });
    
      if (response.status !== 200 && response.status !== 201) {
        return null;
      }

      const data = await response.json();
      return data.valid ? data.user : null;
    } catch (error) {
      console.error('Verify token error:', error);
      return null;
    }
  }

  async logout() {
    try {
      const token = this.getToken();

      if (!token) {
        throw new Error('No token found');
      }
      const user = await this.verifyToken(token);

      if (!user || !user.user_id) {
        throw new Error('Cannot get user ID from token');
      }


        localStorage.removeItem('token');
        return true;
    
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
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
