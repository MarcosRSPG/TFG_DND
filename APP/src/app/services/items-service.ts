
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Item } from '../interfaces/item';
import { AdventuringGear } from '../interfaces/items/adventuring-gear';
import { Armor } from '../interfaces/items/armor';
import { Weapon } from '../interfaces/items/weapon';
import { MagicItem } from '../interfaces/items/magic-item';
import { Tool } from '../interfaces/items/tool';
import { Mount } from '../interfaces/items/mount';
import { TokenHashService } from './token-hash.service';

// 🔹 Tipo de item
export type ItemType =
  | 'adventuringgear'
  | 'armor'
  | 'weapon'
  | 'magicitem'
  | 'tool'
  | 'mount';

// 🔹 Unión de tipos específicos
export type ItemSpecific =
  | AdventuringGear
  | Armor
  | Weapon
  | MagicItem
  | Tool
  | Mount;

@Injectable({
  providedIn: 'root',
})
export class ItemsService {
  private readonly apiUrl = environment.API_URL;
  private readonly apiToken = environment.API_TOKEN;
  private readonly tokenHashService = new TokenHashService();

  private cache: Item[] | null = null;

  // 🔹 Obtener lista (genérica)
  async getItems(): Promise<Item[]> {
    if (this.cache) {
      return [...this.cache];
    }

    const response = await fetch(`${this.apiUrl}/items`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `No se han podido cargar los items: ${response.status} ${response.statusText}`
      );
    }

    const items = (await response.json()) as Item[];

    items.sort((a, b) => a.name.localeCompare(b.name));

    this.cache = [...items];

    return items;
  }

  // 🔥 MÉTODO CLAVE → tipado real por tipo

  async getItem(id: string, type: ItemType): Promise<ItemSpecific> {
    // El backend espera 'magicItem' (I mayúscula) como type
      let apiType: string = type;
    if (type === 'magicitem') {
      apiType = 'magicitem';
    }
    const response = await fetch(
      `${this.apiUrl}/items/${id}?type=${encodeURIComponent(apiType)}`,
      {
        headers: this.buildHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `No se ha podido cargar el item ${id}: ${response.status} ${response.statusText}`
      );
    }

    const raw = await response.json();

    // 🔥 discriminación por tipo (correcta)
    switch (type) {
      case 'weapon':
        return raw as Weapon;

      case 'armor':
        return raw as Armor;

      case 'adventuringgear':
        return raw as AdventuringGear;

      case 'magicitem':
        return raw as MagicItem;

      case 'tool':
        return raw as Tool;

      case 'mount':
        return raw as Mount;

      default:
        throw new Error('Tipo no soportado: ' + type);
    }
  }

  // 🔹 Obtener ID seguro
  getIdentifier(item: Item): string {
    return item['id'] || item.index;
  }

  // 🔹 Inferir tipo desde datos (para listado)
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

  // 🔹 Headers API
  private buildHeaders(): HeadersInit {
    return {
      'X-API-Token': this.tokenHashService.generateHash(this.apiToken),
    };
  }
    // Obtener todos los ids válidos de magic items
  async getMagicItemIds(): Promise<string[]> {
    // El backend espera 'magicItem' (I mayúscula)
    const response = await fetch(`${this.apiUrl}/items/type/magicitem`, {
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      throw new Error(`No se han podido cargar los magic items: ${response.status} ${response.statusText}`);
    }
    const items = await response.json();
    // Devuelve el id o index según lo que tenga cada item
    return items.map((item: any) => item.id || item.index);
  }
}

