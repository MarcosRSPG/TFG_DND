import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Background } from '../interfaces/background';
import { TokenHashService } from './token-hash-service';

@Injectable({ providedIn: 'root' })
export class BackgroundsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);

  // === SIGNALS ===
  private _backgrounds = signal<Background[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly backgrounds = this._backgrounds.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async getBackgrounds(): Promise<Background[]> {
    // Retorna cache si ya existe
    if (this._backgrounds().length > 0) {
      return [...this._backgrounds()];
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const backgrounds = await firstValueFrom(
        this.http.get<Background[]>(`${this.apiUrl}/backgrounds`, {
          headers: this.buildHeaders(),
        })
      );

      backgrounds.sort((a, b) => a.name.localeCompare(b.name));
      this._backgrounds.set([...backgrounds]);

      return backgrounds;
    } catch (err) {
      this._error.set('Failed to load backgrounds');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  async getBackground(id: string): Promise<Background> {
    return firstValueFrom(
      this.http.get<Background>(`${this.apiUrl}/backgrounds/${id}`, {
        headers: this.buildHeaders(),
      })
    );
  }

  private buildHeaders(): { [header: string]: string } {
    return {
      'X-API-Token': this.tokenHashService.generateHash(environment.API_TOKEN),
    };
  }
}