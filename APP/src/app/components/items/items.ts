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
import { LoginService } from '../../services/login-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';
import { Alerts, AlertVariant } from '../alerts/alerts';

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
    Alerts,
  ],
  templateUrl: './items.html',
  styleUrl: './items.css',
})
export class Items implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('typesModal') typesModal!: FilterModalComponent;

  // 🔹 User info for permissions
  userId = signal<string | null>(null);
  userRole = signal<string | null>(null);
  permissionsLoaded = signal(false);

  alertOpen = signal(false);
  alertTitle = signal('');
  alertMessage = signal('');
  alertVariant = signal<AlertVariant>('error');

  showAlert(title: string, message: string, variant: AlertVariant = 'error'): void {
    this.alertTitle.set(title);
    this.alertMessage.set(message);
    this.alertVariant.set(variant);
    this.alertOpen.set(true);
  }

  private getSourceLabel(item: Item): string {
    const cb = (item as any).created_by;
    if (!cb) return 'official';
    if (cb === 'oficial') return 'official';
    if (cb === this.userId()) return 'own';
    return 'community';
  }

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

    // Load user info for permissions FIRST
    this.userId.set(await this.loginService.getUserId());
    this.userRole.set(await this.loginService.getUserRole());
    
    // Set permissionsLoaded BEFORE loading items so buttons render correctly
    this.permissionsLoaded.set(true);

    await this.loadItems();
  }

  canEdit(item: Item): boolean {
    const currentUserId = this.userId();
    const role = this.userRole();

    // Admin can edit everything (including official items without created_by)
    if (role === 'admin') return true;

    // Creator can edit their own items
    if (currentUserId && (item as any).created_by && currentUserId === (item as any).created_by) {
      return true;
    }

    return false;
  }

  async deleteItem(item: Item): Promise<void> {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) {
      return;
    }

    try {
      const itemType = this.itemsService.inferType(item);
        // Use MongoDB id first (ObjectId required by PUT/DELETE)
        const itemId = item['id'] || item['index'] || '';
      await this.itemsService.delete(itemId, itemType || undefined);
      // Remove from lists
      const currentAll = this.allItems();
      const currentFiltered = this.filteredItems();
      this.allItems.set(currentAll.filter(i => i !== item));
      this.filteredItems.set(currentFiltered.filter(i => i !== item));
      this.updatePaginatedItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      this.showAlert('Error', 'Failed to delete item');
    }
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
    // Use D&D index (e.g., "abacus") - that's what the backend expects
    return item['index'] || (item as any).id || (item as any)['_id'] || '';
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

    if (filters.source !== 'all') {
      filtered = filtered.filter((item) => this.getSourceLabel(item) === filters.source);
    }

    this.filteredItems.set(filtered);
    this.updatePaginatedItems();
  }

  // ── Selection mode ──────────────────────────────────────────────
  selectionMode = signal(false);
  selectedIds   = signal<Set<string>>(new Set());
  toggleSelectionMode(): void { this.selectionMode.update(v => !v); if (!this.selectionMode()) this.selectedIds.set(new Set()); }
  toggleSelect(id: string, event: Event): void { event.stopPropagation(); event.preventDefault(); this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  isSelected(id: string): boolean { return this.selectedIds().has(id); }
  exportSelection(): void { const ids = Array.from(this.selectedIds()).join(','); if (!ids) return; this.router.navigate(['/manual/print'], { queryParams: { type: 'items', ids } }); }

  navigateToCreate(): void {
    if (this.selectedCreateType) {
      const returnUrl = window.location.pathname + window.location.search;
      this.router.navigate(['/items', this.selectedCreateType, 'new'], { queryParams: { returnUrl } });
    }
  }

  navigateToEdit(item: Item): void {
    const itemType = this.itemsService.inferType(item);
    const itemId = item['id'] || item['index'] || '';
    if (itemType && itemId) {
      const returnUrl = window.location.pathname + window.location.search;
      this.router.navigate(['/items', itemType, 'edit', itemId], { queryParams: { returnUrl } });
    }
  }
}
