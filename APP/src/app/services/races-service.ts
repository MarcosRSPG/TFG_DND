import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Race, RaceListResponse, RaceTraitDetail } from '../interfaces/race';
import { Subrace } from '../interfaces/subrace';

@Injectable({
  providedIn: 'root',
})
export class RacesService {
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

    const response = await fetch(this.apiUrl + '/races');

    if (!response.ok) {
      throw new Error(`No se han podido cargar las razas: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as RaceListResponse;

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
      }),
    );

    races.sort((a, b) => a.name.localeCompare(b.name));
    this.racesCache = [...races];

    return races;
  }

  async getRace(index: string): Promise<Race> {
    const response = await fetch(this.apiUrl + `/races/${index}`);

    if (!response.ok) {
      throw new Error(`No se ha podido cargar la raza ${index}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Race;
  }

  async getSubrace(index: string): Promise<Subrace> {
    const response = await fetch(this.apiUrl + `/subraces/${index}`);

    if (!response.ok) {
      throw new Error(`No se ha podido cargar la subraza ${index}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Subrace;
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

    const response = await fetch(this.apiUrl + `/traits/${index}`);

    if (!response.ok) {
      throw new Error(`No se ha podido cargar el rasgo ${index}: ${response.status} ${response.statusText}`);
    }

    const trait = (await response.json()) as RaceTraitDetail;
    this.traitCache.set(index, trait);

    return trait;
  }
}
