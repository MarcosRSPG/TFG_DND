import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Item } from '../../interfaces/item';
import { ItemsService } from '../../services/items-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';

interface ItemFilters {
  searchName: string;
  types: string[];
  source: string;
  costMin: number | '';
  costMax: number | '';
}

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FilterModalComponent],
  templateUrl: './items.html',
  styleUrl: './items.css',
})
export class Items implements OnInit {
  private readonly itemsService = inject(ItemsService);

  @ViewChild('typesModal') typesModal!: FilterModalComponent;

  allItems = signal<Item[]>([]);
  filteredItems = signal<Item[]>([]);
  filters = signal<ItemFilters>({
    searchName: '',
    types: [],
    source: 'all',
    costMin: '',
    costMax: '',
  });
  private indexSet = new Set<string>();
  loading = signal(true);
  error = signal<string | null>(null);
  itemTypes = signal<Set<string>>(new Set());
  
  // Expose Array constructor for template
  Array = Array;

  async ngOnInit(): Promise<void> {
    try {
      await this.itemsService.getItems((item) => {
        const id = this.itemsService.getIdentifier(item);
        if (this.indexSet.has(id)) {
          return;
        }
        this.indexSet.add(id);
        const sorted = [...this.allItems(), item].sort((a, b) => a.name.localeCompare(b.name));
        this.allItems.set(sorted);
        this.updateItemTypes();
        this.applyFilters();
        this.loading.set(false);
      });
    } catch (error) {
      console.error('Error loading items:', error);
      this.error.set('No se han podido cargar los items.');
    } finally {
      if (!this.error()) {
        this.loading.set(false);
      }
      this.indexSet.clear();
    }
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private updateItemTypes(): void {
    const types = new Set<string>();
    this.allItems().forEach((item) => {
      const typeName = item.equipment_category?.name || 'Desconocido';
      types.add(typeName);
    });
    this.itemTypes.set(types);
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allItems();
    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter((item) => item.name.toLowerCase().includes(search));
    }
    if (filters.types.length > 0) {
      filtered = filtered.filter((item) => filters.types.includes(item.equipment_category?.name || 'Desconocido'));
    }
    if (filters.costMin !== '') {
      const minCost = Number(filters.costMin);
      filtered = filtered.filter((item) => (item.cost?.quantity || 0) >= minCost);
    }
    if (filters.costMax !== '') {
      const maxCost = Number(filters.costMax);
      filtered = filtered.filter((item) => (item.cost?.quantity || 0) <= maxCost);
    }
    this.filteredItems.set(filtered);
  }

  onTypesConfirmed(types: string[]): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, types });
    this.onFilterChange();
  }

  getIdentifier(item: Item): string {
    return this.itemsService.getIdentifier(item);
  }

  getType(item: Item): string | null {
    return this.itemsService.inferType(item);
  }
}