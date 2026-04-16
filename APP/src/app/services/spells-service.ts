import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Spell } from '../interfaces/spell';
import { TokenHashService } from './token-hash.service';

@Injectable({
  providedIn: 'root',
})
export class SpellsService {
  private readonly apiUrl = environment.API_URL;
  private readonly apiToken = environment.API_TOKEN;
  private readonly tokenHashService = new TokenHashService();
  private cache: Spell[] | null = null;

  async getSpells(onItemLoaded?: (value: Spell) => void): Promise<Spell[]> {
    if (this.cache) {
      const cached = [...this.cache];
      if (onItemLoaded) {
        for (const spell of cached) {
          onItemLoaded(spell);
        }
      }
      return cached;
    }

    const response = await fetch(`${this.apiUrl}/spells/`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se han podido cargar los spells: ${response.status} ${response.statusText}`);
    }

    const spells = (await response.json()) as Spell[];
    spells.sort((a, b) => a.name.localeCompare(b.name));
    this.cache = [...spells];
    if (onItemLoaded) {
      for (const spell of spells) {
        onItemLoaded(spell);
      }
    }
    return spells;
  }

  async getSpell(id: string): Promise<Spell> {
    const response = await fetch(`${this.apiUrl}/spells/${id}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se ha podido cargar el spell ${id}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Spell;
  }

  private buildHeaders(): HeadersInit {
    return {
      'X-API-Token': this.tokenHashService.generateHash(this.apiToken),
    };
  }
}