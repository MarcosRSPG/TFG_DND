import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Monster } from '../interfaces/monster';
import { TokenHashService } from './token-hash.service';

@Injectable({
  providedIn: 'root',
})
export class MonstersService {
  private readonly apiUrl = environment.API_URL;
  private readonly apiToken = environment.API_TOKEN;
  private readonly tokenHashService = new TokenHashService();
  private cache: Monster[] | null = null;

  async getMonsters(onItemLoaded?: (value: Monster) => void): Promise<Monster[]> {
    if (this.cache) {
      const cached = [...this.cache];
      if (onItemLoaded) {
        for (const monster of cached) {
          onItemLoaded(monster);
        }
      }
      return cached;
    }

    const response = await fetch(`${this.apiUrl}/monsters/`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se han podido cargar los monsters: ${response.status} ${response.statusText}`);
    }

    const monsters = (await response.json()) as Monster[];
    monsters.sort((a, b) => a.name.localeCompare(b.name));
    this.cache = [...monsters];
    if (onItemLoaded) {
      for (const monster of monsters) {
        onItemLoaded(monster);
      }
    }
    return monsters;
  }

  async getMonster(id: string): Promise<Monster> {
    const response = await fetch(`${this.apiUrl}/monsters/${id}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se ha podido cargar el monster ${id}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Monster;
  }

  private buildHeaders(): HeadersInit {
    return {
      'X-API-Token': this.tokenHashService.generateHash(this.apiToken),
    };
  }
}