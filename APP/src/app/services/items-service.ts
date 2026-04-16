import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Item, ItemType } from '../interfaces/item';
import { TokenHashService } from './token-hash.service';

@Injectable({
  providedIn: 'root',
})
export class ItemsService {
  private readonly apiUrl = environment.API_URL;
  private readonly apiToken = environment.API_TOKEN;
  private readonly tokenHashService = new TokenHashService();
  private cache: Item[] | null = null;

  async getItems(onItemLoaded?: (value: Item) => void): Promise<Item[]> {
    if (this.cache) {
      const cached = [...this.cache];
      if (onItemLoaded) {
        for (const item of cached) {
          onItemLoaded(item);
        }
      }
      return cached;
    }

    const response = await fetch(`${this.apiUrl}/items`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se han podido cargar los items: ${response.status} ${response.statusText}`);
    }

    const items = (await response.json()) as Item[];
    items.sort((a, b) => a.name.localeCompare(b.name));
    this.cache = [...items];
    if (onItemLoaded) {
      for (const item of items) {
        onItemLoaded(item);
      }
    }
    return items;
  }

  async getItem(id: string, type: ItemType | null): Promise<Item> {
    const effectiveType = type || null;

    if (!effectiveType) {
      const cached = this.cache?.find((item) => this.getIdentifier(item) === id);
      if (cached) {
        return cached;
      }
      throw new Error('No se ha podido determinar el tipo del item.');
    }

    const response = await fetch(`${this.apiUrl}/items/${id}?type=${encodeURIComponent(effectiveType)}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`No se ha podido cargar el item ${id}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Item;
  }

  getIdentifier(item: Item): string {
    return item.id || item.index;
  }

  inferType(item: Item): ItemType | null {
    const rawType = (item.type || '').toLowerCase();
    if (rawType === 'magicitem') {
      return 'magicitem';
    }

    const category = item.equipment_category?.index || '';
    if (category === 'armor') {
      return 'armor';
    }
    if (category === 'weapon') {
      return 'weapon';
    }
    if (category === 'tool') {
      return 'tool';
    }
    if (category === 'adventuring-gear') {
      return 'adventuringgear';
    }
    if (category === 'mounts-and-vehicles') {
      return 'mount';
    }
    if (item.rarity?.name) {
      return 'magicitem';
    }

    return null;
  }

  private buildHeaders(): HeadersInit {
    return {
      'X-API-Token': this.tokenHashService.generateHash(this.apiToken),
    };
  }
}