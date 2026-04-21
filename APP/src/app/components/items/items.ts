import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Item } from '../../interfaces/item';
import { AdventuringGear } from '../../interfaces/items/adventuring-gear';
import { Armor } from '../../interfaces/items/armor';
import { Weapon } from '../../interfaces/items/weapon';
import { MagicItem } from '../../interfaces/items/magic-item';
import { Tool } from '../../interfaces/items/tool';
import { Mount } from '../../interfaces/items/mount';
import { ItemsService, ItemType, ItemSpecific } from '../../services/items-service';
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
  imports: [
    CommonModule,
    FormsModule,
    FilterModalComponent,
  ],
  templateUrl: './items.html',
  styleUrl: './items.css',
})
export class Items implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('typesModal') typesModal!: FilterModalComponent;

  allItems = signal<Item[]>([]);
  filteredItems = signal<Item[]>([]);
  paginatedItems = signal<Item[]>([]);
  currentPage = signal(1);
  readonly pageSize = 10;

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

  selectedItem: ItemSpecific | null = null;
  selectedType: ItemType | null = null;
  loadingDetail = signal(false);
  errorDetail = signal<string | null>(null);

  // For create button
  selectedCreateType: string = '';

  // Expose Array constructor for template
  Array = Array;

  get paginationPages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage();

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (current > 3) pages.push(1);
    if (current > 4) pages.push('...');

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }

    if (current < total - 3) pages.push('...');
    if (current < total - 2) pages.push(total);

    return pages;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItems().length / this.pageSize) || 1;
  }

  get selectedWeapon(): Weapon | null {
    return this.selectedType === 'weapon' ? (this.selectedItem as Weapon) : null;
  }

  get selectedArmor(): Armor | null {
    return this.selectedType === 'armor' ? (this.selectedItem as Armor) : null;
  }

  get selectedGear(): AdventuringGear | null {
    return this.selectedType === 'adventuringgear'
      ? (this.selectedItem as AdventuringGear)
      : null;
  }

  get selectedMagicItem(): MagicItem | null {
    return this.selectedType === 'magicitem'
      ? (this.selectedItem as MagicItem)
      : null;
  }

  get selectedTool(): Tool | null {
    return this.selectedType === 'tool' ? (this.selectedItem as Tool) : null;
  }

  get selectedMount(): Mount | null {
    return this.selectedType === 'mount' ? (this.selectedItem as Mount) : null;
  }

  async ngOnInit(): Promise<void> {
    this.loadFiltersFromUrl();
    await this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.loading.set(true);
    this.indexSet.clear();

    try {
      const items = await this.itemsService.getItems();

      const uniqueItems: Item[] = [];

      for (const item of items) {
        const id = this.itemsService.getIdentifier(item);

        if (this.indexSet.has(id)) {
          continue;
        }

        this.indexSet.add(id);
        uniqueItems.push(item);
      }

      uniqueItems.sort((a, b) => a.name.localeCompare(b.name));
      this.allItems.set(uniqueItems);

      this.updateItemTypes();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading items:', error);
      this.error.set('No se han podido cargar los items.');
    } finally {
      this.loading.set(false);
    }
  }

  private loadFiltersFromUrl(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const searchName = queryParams.get('searchName') || '';
    const types = queryParams.get('types');
    const source = queryParams.get('source') || 'all';
    const costMin = queryParams.get('costMin') || '';
    const costMax = queryParams.get('costMax') || '';
    const page = queryParams.get('page');

    this.filters.set({
      searchName,
      types: types ? types.split(',') : [],
      source,
      costMin: costMin ? Number(costMin) : '',
      costMax: costMax ? Number(costMax) : '',
    });

    if (page) {
      this.currentPage.set(Number(page) || 1);
    }

    this.applyFilters();
  }

  private updateUrlWithFilters(): void {
    const f = this.filters();
    this.router.navigate([], {
      queryParams: {
        searchName: f.searchName || null,
        types: f.types.length > 0 ? f.types.join(',') : null,
        source: f.source !== 'all' ? f.source : null,
        costMin: f.costMin || null,
        costMax: f.costMax || null,
        page: this.currentPage() > 1 ? this.currentPage() : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  onSelectItem(item: Item): void {
    const type = this.itemsService.inferType(item);
    const id = this.itemsService.getIdentifier(item);
    console.log('Navigating to item:', type, id);
    if (!type || !id) {
      this.errorDetail.set('No se pudo determinar el tipo o id del item.');
      console.error('No type or id:', type, id);
      return;
    }
    const f = this.filters();
    this.router.navigate([`/items/${type}/${id}`], {
      queryParams: {
        searchName: f.searchName || undefined,
        types: f.types.length > 0 ? f.types.join(',') : undefined,
        source: f.source !== 'all' ? f.source : undefined,
        costMin: f.costMin || undefined,
        costMax: f.costMax || undefined,
        page: this.currentPage() > 1 ? this.currentPage() : undefined,
      },
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.applyFilters();
    this.updateUrlWithFilters();
  }

  onTypesConfirmed(types: string[]): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, types });
    this.onFilterChange();
  }

  updatePaginatedItems(): void {
    const filtered = this.filteredItems();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedItems.set(filtered.slice(start, end));
  }

  goToPage(page: number): void {
    if (page < 1) {
      return;
    }

    this.currentPage.set(page);
    this.updatePaginatedItems();
    this.updateUrlWithFilters();
  }

  getIdentifier(item: Item): string {
    return this.itemsService.getIdentifier(item);
  }

  getType(item: Item): string | null {
    return this.itemsService.inferType(item);
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
      filtered = filtered.filter((item) =>
        filters.types.includes(item.equipment_category?.name || 'Desconocido')
      );
    }

    if (filters.costMin !== '') {
      const minCost = Number(filters.costMin);
      filtered = filtered.filter((item) => (item.cost?.quantity || 0) >= minCost);
    }

    if (filters.costMax !== '') {
      const maxCost = Number(filters.costMax);
      filtered = filtered.filter((item) => (item.cost?.quantity || 0) <= maxCost);
    }

    if (filters.source === 'official') {
      filtered = filtered.filter((item) => !item['created_by']);
    }

    this.filteredItems.set(filtered);
    this.updatePaginatedItems();
  }

  navigateToCreate(): void {
    if (this.selectedCreateType) {
      this.router.navigate(['/items', this.selectedCreateType, 'new']);
    }
  }
}