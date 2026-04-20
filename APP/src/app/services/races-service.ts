import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Race, RaceListResponse, RaceTraitDetail } from '../interfaces/race';
import { Subrace } from '../interfaces/subrace';

@Injectable({ providedIn: 'root' })
export class RacesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_DND_OFICIAL;
  private racesCache: Race[] | null = null;
  private readonly traitCache = new Map<string, RaceTraitDetail>();

  async getRaces(onItemLoaded?: (value: Race) => void): Promise<Race[]> {
    if (this.racesCache) {
      const cached = [...this.racesCache];
      if (onItemLoaded) {
        for (const item of cached) {
          onItemLoaded(item);
        }
      }
      return cached;
    }

    const data = await firstValueFrom(
      this.http.get<RaceListResponse>(`${this.apiUrl}/races`)
    );

    if (!data.results?.length) {
      return [];
    }

    const races: Race[] = [];
    await Promise.all(
      data.results.map(async (racePreview) => {
        try {
          const race = await this.getRace(racePreview.index);
          races.push(race);
          onItemLoaded?.(race);
        } catch (error) {
          console.error(`Error loading race ${racePreview.index}:`, error);
        }
      })
    );

    races.sort((a, b) => a.name.localeCompare(b.name));
    this.racesCache = [...races];

    return races;
  }

  async getRace(index: string): Promise<Race> {
    return firstValueFrom(
      this.http.get<Race>(`${this.apiUrl}/races/${index}`)
    );
  }

  async getSubrace(index: string): Promise<Subrace> {
    return firstValueFrom(
      this.http.get<Subrace>(`${this.apiUrl}/subraces/${index}`)
    );
  }

  async getSubracesByRace(raceIndex: string): Promise<Subrace[]> {
    const race = await this.getRace(raceIndex);

    if (!race.subraces?.length) {
      return [];
    }

    const subraces: Subrace[] = [];
    for (const subraceRef of race.subraces) {
      try {
        const subrace = await this.getSubrace(subraceRef.index);
        subraces.push(subrace);
      } catch (error) {
        console.error(`Error loading subrace ${subraceRef.index}:`, error);
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