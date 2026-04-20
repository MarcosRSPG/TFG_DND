import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Monster } from '../interfaces/monster';
import { TokenHashService } from './token-hash.service';

@Injectable({ providedIn: 'root' })
export class MonstersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);
  private loadedPages = new Map<string, Monster[]>();

  async getMonsters(page: number = 1, pageSize: number = 25): Promise<Monster[]> {
    const cacheKey = `${page}-${pageSize}`;
    
    if (this.loadedPages.has(cacheKey)) {
      return this.loadedPages.get(cacheKey)!;
    }

    // Fetch full data for this page - API returns full monsters
    const monsters = await firstValueFrom(
      this.http.get<Monster[]>(`${this.apiUrl}/monsters/`, {
        params: { page: page.toString(), page_size: pageSize.toString() },
        headers: this.buildHeaders()
      })
    );

    monsters.sort((a, b) => a.name.localeCompare(b.name));
    this.loadedPages.set(cacheKey, [...monsters]);
    return monsters;
  }

  async getAllMonsters(): Promise<Monster[]> {
    // Fetch ALL at once with page_size=999 to get full data
    return await this.getMonsters(1, 999);
  }

  async getMonster(id: string): Promise<Monster> {
    return firstValueFrom(
      this.http.get<Monster>(`${this.apiUrl}/monsters/${id}`, {
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