import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Background } from '../interfaces/background';
import { TokenHashService } from './token-hash.service';

@Injectable({ providedIn: 'root' })
export class BackgroundsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);
  private loadedPages = new Map<string, Background[]>();

  async getBackgrounds(page: number = 1, pageSize: number = 25): Promise<Background[]> {
    const cacheKey = `${page}-${pageSize}`;
    
    if (this.loadedPages.has(cacheKey)) {
      return this.loadedPages.get(cacheKey)!;
    }

    const backgrounds = await firstValueFrom(
      this.http.get<Background[]>(`${this.apiUrl}/backgrounds`, {
        params: { page: page.toString(), page_size: pageSize.toString() },
        headers: this.buildHeaders()
      })
    );

    backgrounds.sort((a, b) => a.name.localeCompare(b.name));
    this.loadedPages.set(cacheKey, [...backgrounds]);
    return backgrounds;
  }

  async getAllBackgrounds(): Promise<Background[]> {
    return await this.getBackgrounds(1, 999);
  }

  async getBackground(id: string): Promise<Background> {
    return firstValueFrom(
      this.http.get<Background>(`${this.apiUrl}/backgrounds/${id}`, {
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