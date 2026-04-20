import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Spell } from '../interfaces/spell';
import { TokenHashService } from './token-hash.service';

@Injectable({ providedIn: 'root' })
export class SpellsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);
  private loadedPages = new Map<string, Spell[]>();

  async getSpells(page: number = 1, pageSize: number = 25): Promise<Spell[]> {
    const cacheKey = `${page}-${pageSize}`;
    
    if (this.loadedPages.has(cacheKey)) {
      return this.loadedPages.get(cacheKey)!;
    }

    const spells = await firstValueFrom(
      this.http.get<Spell[]>(`${this.apiUrl}/spells/`, {
        params: { page: page.toString(), page_size: pageSize.toString() },
        headers: this.buildHeaders()
      })
    );

    spells.sort((a, b) => a.name.localeCompare(b.name));
    this.loadedPages.set(cacheKey, [...spells]);
    return spells;
  }

  async getAllSpells(): Promise<Spell[]> {
    return await this.getSpells(1, 999);
  }

  async getSpell(id: string): Promise<Spell> {
    return firstValueFrom(
      this.http.get<Spell>(`${this.apiUrl}/spells/${id}`, {
        headers: this.buildHeaders()
      })
    );
  }

  private buildHeaders(): { [header: string]: string } {
    return {
      'X-API-Token': this.tokenHashService.generateHash(environment.API_TOKEN),
    };
  }
}