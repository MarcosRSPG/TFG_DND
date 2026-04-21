import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Monster } from '../interfaces/monster';
import { TokenHashService } from './token-hash-service';

@Injectable({ providedIn: 'root' })
export class MonstersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);

  // === SIGNALS ===
  private _monsters = signal<Monster[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly monsters = this._monsters.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async getMonsters(): Promise<Monster[]> {
    // Retorna cache si ya existe
    if (this._monsters().length > 0) {
      return [...this._monsters()];
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const monsters = await firstValueFrom(
        this.http.get<Monster[]>(`${this.apiUrl}/monsters/`, {
          headers: this.buildHeaders(),
        })
      );

      monsters.sort((a, b) => a.name.localeCompare(b.name));
      this._monsters.set([...monsters]);

      return monsters;
    } catch (err) {
      this._error.set('Failed to load monsters');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  async getMonster(id: string): Promise<Monster> {
    return firstValueFrom(
      this.http.get<Monster>(`${this.apiUrl}/monsters/${id}`, {
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