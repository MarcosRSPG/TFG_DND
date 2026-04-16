import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Background } from '../interfaces/background';
import { TokenHashService } from './token-hash.service';

@Injectable({
  providedIn: 'root',
})
export class BackgroundsService {
  private readonly apiUrl = environment.API_URL;
  private readonly apiToken = environment.API_TOKEN;
  private readonly tokenHashService = new TokenHashService();
  private cache: Background[] | null = null;

  async getBackgrounds(onItemLoaded?: (value: Background) => void): Promise<Background[]> {
    if (this.cache) {
      const cached = [...this.cache];
      onItemLoaded?.(cached[0]);
      if (onItemLoaded) {
        for (const item of cached.slice(1)) {
          onItemLoaded(item);
        }
      }
      return cached;
    }

    const response = await fetch(`${this.apiUrl}/backgrounds`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se han podido cargar los backgrounds: ${response.status} ${response.statusText}`);
    }

    const backgrounds = (await response.json()) as Background[];
    backgrounds.sort((a, b) => a.name.localeCompare(b.name));
    this.cache = [...backgrounds];
    if (onItemLoaded) {
      for (const bg of backgrounds) {
        onItemLoaded(bg);
      }
    }
    return backgrounds;
  }

  async getBackground(id: string): Promise<Background> {
    const response = await fetch(`${this.apiUrl}/backgrounds/${id}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se ha podido cargar el background ${id}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Background;
  }

  private buildHeaders(): HeadersInit {
    return {
      'X-API-Token': this.tokenHashService.generateHash(this.apiToken),
    };
  }
}