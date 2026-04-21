import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Item } from '../interfaces/item';
import { AdventuringGear } from '../interfaces/items/adventuring-gear';
import { Armor } from '../interfaces/items/armor';
import { Weapon } from '../interfaces/items/weapon';
import { MagicItem } from '../interfaces/items/magic-item';
import { Tool } from '../interfaces/items/tool';
import { Mount } from '../interfaces/items/mount';
import { TokenHashService } from './token-hash-service';

export type ItemType =
  | 'adventuringgear'
  | 'armor'
  | 'weapon'
  | 'magicitem'
  | 'tool'
  | 'mount';

export type ItemSpecific =
  | AdventuringGear
  | Armor
  | Weapon
  | MagicItem
  | Tool
  | Mount;

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;
  private readonly tokenHashService = inject(TokenHashService);

  // === SIGNALS ===
  private _items = signal<Item[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly items = this._items.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async getItems(): Promise<Item[]> {
    // Retorna cache si ya existe
    if (this._items().length > 0) {
      return [...this._items()];
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const items = await firstValueFrom(
        this.http.get<Item[]>(`${this.apiUrl}/items`, {
          headers: this.buildHeaders(),
        })
      );

      items.sort((a, b) => a.name.localeCompare(b.name));
      this._items.set([...items]);

      return items;
    } catch (err) {
      this._error.set('Failed to load items');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  async getItem(id: string, type: ItemType): Promise<ItemSpecific> {
    return firstValueFrom(
      this.http.get<ItemSpecific>(`${this.apiUrl}/items/${id}?type=${encodeURIComponent(type)}`, {
        headers: this.buildHeaders(),
      })
    );
  }

  getIdentifier(item: Item): string {
    return item['id'] || item['index'];
  }

  async getAll(): Promise<Item[]> {
    return this.getItems();
  }

  inferType(item: Item): ItemType | null {
    const rawType = (item['type'] || '').toLowerCase();

    if (rawType === 'magicitem') return 'magicitem';

    const category = item.equipment_category?.index || '';

    if (category === 'armor') return 'armor';
    if (category === 'weapon') return 'weapon';
    if (category === 'tool') return 'tool';
    if (category === 'adventuring-gear') return 'adventuringgear';
    if (category === 'mounts-and-vehicles') return 'mount';

    if (item['rarity']?.name) return 'magicitem';

    return null;
  }

  async getMagicItemIds(): Promise<string[]> {
    const items = await firstValueFrom(
      this.http.get<any[]>(`${this.apiUrl}/items/type/magicitem`, {
        headers: this.buildHeaders(),
      })
    );
    return items.map((item: any) => item.id || item.index);
  }

  async create(item: Partial<ItemSpecific>, type: ItemType): Promise<ItemSpecific> {
    return firstValueFrom(
      this.http.post<ItemSpecific>(`${this.apiUrl}/items?type=${type}`, item, {
        headers: this.buildHeaders(),
      })
    );
  }

  private buildHeaders(): { [header: string]: string } {
    return {
      'X-API-Token': this.tokenHashService.generateHash(environment.API_TOKEN),
    };
  }
}