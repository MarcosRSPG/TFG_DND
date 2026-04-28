import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Race, RaceListResponse, RaceTraitDetail } from '../interfaces/race';
import { Subrace } from '../interfaces/subrace';

@Injectable({ providedIn: 'root' })
export class RacesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  // === SIGNALS ===
  private _races = signal<Race[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Cache para traits
  private readonly traitCache = new Map<string, RaceTraitDetail>();

  // Readonly signals
  readonly races = this._races.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async getRaces(onItemLoaded?: (value: Race) => void): Promise<Race[]> {
    // Retorna cache si ya existe
    if (this._races().length > 0) {
      const cached = [...this._races()];
      if (onItemLoaded) {
        for (const item of cached) {
          onItemLoaded(item);
        }
      }
      return cached;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<RaceListResponse>(`${this.apiUrl}/races`)
      );

      if (!data.results?.length) {
        this._races.set([]);
        return [];
      }

      const races: Race[] = [];

      await Promise.all(
        data.results.map(async (racePreview) => {
          try {
            const race = await this.getRace(racePreview.id || racePreview.index || '');
            races.push(race);
            onItemLoaded?.(race);
          } catch (error) {
            console.error(`Error loading race ${racePreview.id || racePreview.index}:`, error);
          }
        })
      );

      races.sort((a, b) => a.name.localeCompare(b.name));
      this._races.set([...races]);

      return races;
    } catch (err) {
      this._error.set('Failed to load races');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  async getRace(id: string): Promise<Race> {
    return firstValueFrom(
      this.http.get<Race>(`${this.apiUrl}/races/${id}`)
    );
  }

  async getSubrace(id: string): Promise<Subrace> {
    return firstValueFrom(
      this.http.get<Subrace>(`${this.apiUrl}/subraces/${id}`)
    );
  }

  async getSubracesByRace(raceId: string): Promise<Subrace[]> {
    const race = await this.getRace(raceId);

    if (!race.subraces?.length) {
      return [];
    }

    const subraces: Subrace[] = [];

    for (const subraceRef of race.subraces) {
      try {
        const subrace = await this.getSubrace(subraceRef.id || subraceRef.index);
        subraces.push(subrace);
      } catch (error) {
        console.error(`Error loading subrace ${subraceRef.id || subraceRef.index}:`, error);
      }
    }

    return subraces;
  }

  async getTrait(index: string): Promise<RaceTraitDetail> {
    const cached = this.traitCache.get(index);
    if (cached) {
      return cached;
    }

    const trait = await firstValueFrom(
      this.http.get<RaceTraitDetail>(`${this.apiUrl}/traits/${index}`)
    );
    this.traitCache.set(index, trait);

    return trait;
  }
}