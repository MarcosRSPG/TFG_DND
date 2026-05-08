import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Character } from '../interfaces/Character';
import { TokenHashService } from './token-hash-service';

@Injectable({ providedIn: 'root' })
export class CharactersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);

  async getCharacters(): Promise<Character[]> {
    const data = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(`${this.apiUrl}/characters`, {
        headers: this.buildHeaders(),
      })
    );
    return data.map(item => this.fromApiResponse(item));
  }

  async getCharacter(id: string): Promise<Character> {
    const data = await firstValueFrom(
      this.http.get<Record<string, unknown>>(`${this.apiUrl}/characters/${id}`, {
        headers: this.buildHeaders(),
      })
    );
    return this.fromApiResponse(data);
  }

  async createCharacter(character: Partial<Character>): Promise<Character> {
    const data = await firstValueFrom(
      this.http.post<Record<string, unknown>>(
        `${this.apiUrl}/characters`,
        this.toApiPayload(character),
        { headers: this.buildHeaders() }
      )
    );
    return this.fromApiResponse(data);
  }

  async updateCharacter(id: string, character: Partial<Character>): Promise<Character> {
    const data = await firstValueFrom(
      this.http.put<Record<string, unknown>>(
        `${this.apiUrl}/characters/${id}`,
        this.toApiPayload(character),
        { headers: this.buildHeaders() }
      )
    );
    return this.fromApiResponse(data);
  }

  async deleteCharacter(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.apiUrl}/characters/${id}`, {
        headers: this.buildHeaders(),
      })
    );
  }

  async uploadImage(id: string, file: File): Promise<{ image: string }> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    return firstValueFrom(
      this.http.post<{ image: string }>(
        `${this.apiUrl}/characters/${id}/image`,
        formData,
        { headers: this.buildHeaders() },
      )
    );
  }

  private toApiPayload(character: Partial<Character>): Record<string, unknown> {
    // Strip character_class (renamed to 'class') and _id (not allowed in MongoDB $set)
    const { character_class, _id, id, ...rest } = character as Record<string, unknown>;
    return {
      ...rest,
      ...(character_class !== undefined && { class: character_class }),
    };
  }

  private fromApiResponse(data: Record<string, unknown>): Character {
    const { class: character_class, _id, ...rest } = data as Record<string, unknown>;
    return {
      ...rest,
      ...(character_class !== undefined && { character_class }),
      ...(_id !== undefined && { _id: String(_id), id: String(_id) }),
    } as Character;
  }

  private buildHeaders(): { [header: string]: string } {
    const headers: { [header: string]: string } = {
      'X-API-Token': this.tokenHashService.generateHash(environment.API_TOKEN),
    };
    const userToken = localStorage.getItem('token');
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
    return headers;
  }
}
