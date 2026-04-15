import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Race, RaceListResponse } from '../interfaces/race';
import { Subrace } from '../interfaces/subrace';

@Injectable({
  providedIn: 'root',
})
export class RacesService {
  private readonly apiUrl = environment.API_DND_OFICIAL;

  async getRaces(): Promise<Race[]> {
    const response = await fetch(this.apiUrl + '/races');

    if (!response.ok) {
      throw new Error(`No se han podido cargar las razas: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as RaceListResponse;

    if (!data.results?.length) {
      return [];
    }
    const races: Race[] = [];
    for (const racePreview of data.results) {
      try {        
        const race = await this.getRace(racePreview.index);
        races.push(race);
      } catch (error) {
        console.error(`Error loading race ${racePreview.index}:`, error);
      }
    }
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
}
