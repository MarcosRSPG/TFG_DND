import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Spell } from '../interfaces/spell';
import { TokenHashService } from './token-hash-service';

@Injectable({ providedIn: 'root' })
export class SpellsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);

  // === SIGNALS ===
  private _spells = signal<Spell[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly spells = this._spells.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async getSpells(): Promise<Spell[]> {
    // Retorna cache si ya existe
    if (this._spells().length > 0) {
      return [...this._spells()];
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const spells = await firstValueFrom(
        this.http.get<Spell[]>(`${this.apiUrl}/spells/`, {
          headers: this.buildHeaders(),
        })
      );

      spells.sort((a, b) => a.name.localeCompare(b.name));
      this._spells.set([...spells]);

      return spells;
    } catch (err) {
      this._error.set('Failed to load spells');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  // Alias for getSpells (used in monster form)
  async getAll(): Promise<Spell[]> {
    return this.getSpells();
  }

  async getSpell(id: string): Promise<Spell> {
    return firstValueFrom(
      this.http.get<Spell>(`${this.apiUrl}/spells/${id}`, {
        headers: this.buildHeaders(),
      })
    );
  }

  async create(spell: Partial<Spell> | FormData): Promise<Spell> {
    const isFormData = spell instanceof FormData;
    
    if (isFormData) {
      return firstValueFrom(
        this.http.post<Spell>(`${this.apiUrl}/spells`, spell)
      ) as Promise<Spell>;
    } else {
      return firstValueFrom(
        this.http.post<Spell>(`${this.apiUrl}/spells`, spell, { headers: this.buildHeaders() })
      );
    }
  }

  private buildHeaders(): { [header: string]: string } {
    return {
      'X-API-Token': this.tokenHashService.generateHash(environment.API_TOKEN),
    };
  }
}