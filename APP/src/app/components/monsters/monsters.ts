import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Monster } from '../../interfaces/monster';
import { MonstersService } from '../../services/monsters-service';
import { LoginService } from '../../services/login-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';
import { Alerts, AlertVariant } from '../alerts/alerts';

interface MonsterFilters {
  searchName: string;
  types: string[];
  sizes: string[];
  crMin: string;
  crMax: string;
  hpMin: number | '';
  hpMax: number | '';
  source: string;
}

@Component({
  selector: 'app-monsters',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FilterModalComponent, Alerts],
  templateUrl: './monsters.html',
  styleUrl: './monsters.css',
})
export class Monsters implements OnInit {
  private readonly monstersService = inject(MonstersService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  private getSourceLabel(monster: Monster): string {
    const cb = (monster as any).created_by;
    if (!cb) return 'official';
    if (cb === 'oficial') return 'official';
    if (cb === this.userId()) return 'own';
    return 'community';
  }

  @ViewChild('typesModal') typesModal!: FilterModalComponent;
  @ViewChild('sizesModal') sizesModal!: FilterModalComponent;

  allMonsters = signal<Monster[]>([]);
  filteredMonsters = signal<Monster[]>([]);
  paginatedMonsters = signal<Monster[]>([]);
  currentPage = signal(1);
  readonly pageSize = 10;

  filters = signal<MonsterFilters>({
    searchName: '',
    types: [],
    sizes: [],
    crMin: '',
    crMax: '',
    hpMin: '',
    hpMax: '',
    source: 'all',
  });

  readonly challengeRatings = [
    '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'
  ];

  private indexSet = new Set<string>();

  loading = signal(true);
  error = signal<string | null>(null);

  types = signal<Set<string>>(new Set());
  sizes = signal<Set<string>>(new Set());

  Array = Array;

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe(params => {
      this.filters.set({
        searchName: params['searchName'] || '',
        types: params['types'] ? params['types'].split(',') : [],
        sizes: params['sizes'] ? params['sizes'].split(',') : [],
        crMin: params['crMin'] || '',
        crMax: params['crMax'] || '',
        hpMin: params['hpMin'] || '',
        hpMax: params['hpMax'] || '',
        source: params['source'] || 'all',
      });
    });

    // Load user info for permissions FIRST
    const userId = await this.loginService.getUserId();
    const userRole = await this.loginService.getUserRole();
    
    console.log('DEBUG Monsters - userId:', userId);
    console.log('DEBUG Monsters - userRole:', userRole);
    
    this.userId.set(userId);
    this.userRole.set(userRole);
    
    // Set permissionsLoaded BEFORE loading monsters so buttons render correctly
    this.permissionsLoaded.set(true);

    await this.loadMonsters();
  }

  canEdit(monster: Monster): boolean {
    const currentUserId = this.userId();
    const role = this.userRole();

    console.log('DEBUG canEdit - monster:', monster.name, '| created_by:', (monster as any).created_by);
    console.log('DEBUG canEdit - currentUserId:', currentUserId, '| role:', role);

    // Admin can edit everything (including official items without created_by)
    if (role === 'admin') {
      console.log('DEBUG - User IS admin, returning TRUE');
      return true;
    }

    // Creator can edit their own items
    if (currentUserId && (monster as any).created_by && currentUserId === (monster as any).created_by) {
      return true;
    }

    console.log('DEBUG - Returning FALSE');
    return false;
  }

  async deleteMonster(monster: Monster): Promise<void> {
    if (!confirm(`Are you sure you want to delete ${monster.name}?`)) {
      return;
    }

    try {
      await this.monstersService.delete(monster.index || monster.id || '');
      // Remove from lists
      const currentAll = this.allMonsters();
      const currentFiltered = this.filteredMonsters();
      this.allMonsters.set(currentAll.filter(m => m !== monster));
      this.filteredMonsters.set(currentFiltered.filter(m => m !== monster));
      this.updatePaginatedMonsters();
    } catch (error) {
      console.error('Error deleting monster:', error);
      this.showAlert('Error', 'Failed to delete monster');
    }
  }

  async loadMonsters(): Promise<void> {
    this.loading.set(true);
    this.indexSet.clear();

    try {
      const monsters = await this.monstersService.getMonsters();

      const newMonsters: Monster[] = [];
      for (const monster of monsters) {
        const id = this.getIdentifier(monster);
        if (this.indexSet.has(id)) continue;
        this.indexSet.add(id);
        newMonsters.push(monster);
      }

      newMonsters.sort((a, b) => a.name.localeCompare(b.name));
      this.allMonsters.set(newMonsters);

      this.updateFiltersOptions();
      this.applyFilters();

    } catch (error) {
      console.error('Error loading monsters:', error);
      this.error.set('No se han podido cargar los monsters.');
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.applyFilters();
    this.updateUrl();

    const filters = this.filters();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        searchName: filters.searchName || undefined,
        types: filters.types.length ? filters.types.join(',') : undefined,
        sizes: filters.sizes.length ? filters.sizes.join(',') : undefined,
        crMin: filters.crMin !== '' ? filters.crMin : undefined,
        crMax: filters.crMax !== '' ? filters.crMax : undefined,
        hpMin: filters.hpMin !== '' ? filters.hpMin : undefined,
        hpMax: filters.hpMax !== '' ? filters.hpMax : undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
      },
      queryParamsHandling: 'merge',
    });
  }

  onCrMinChange(value: string): void {
    const current = this.filters();
    this.filters.set({ ...current, crMin: value });
    this.onFilterChange();
  }

  onCrMaxChange(value: string): void {
    const current = this.filters();
    this.filters.set({ ...current, crMax: value });
    this.onFilterChange();
  }

  private updateUrl(): void {
    const filters = this.filters();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        searchName: filters.searchName || undefined,
        types: filters.types.length ? filters.types.join(',') : undefined,
        sizes: filters.sizes.length ? filters.sizes.join(',') : undefined,
        crMin: filters.crMin !== '' ? filters.crMin : undefined,
        crMax: filters.crMax !== '' ? filters.crMax : undefined,
        hpMin: filters.hpMin !== '' ? filters.hpMin : undefined,
        hpMax: filters.hpMax !== '' ? filters.hpMax : undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
      },
      queryParamsHandling: 'merge',
    });
  }

  private updateFiltersOptions(): void {
    const typeSet = new Set<string>();
    const sizeSet = new Set<string>();

    this.allMonsters().forEach(monster => {
      typeSet.add(monster.type);
      sizeSet.add(monster.size);
    });

    this.types.set(typeSet);
    this.sizes.set(sizeSet);
  }

  // Helper to parse challenge rating (e.g., "1/4" -> 0.25)
  private parseChallengeRating(cr: unknown): number {
    if (!cr) return 0;
    const str = String(cr);
    if (str.includes('/')) {
      const [num, den] = str.split('/').map(Number);
      return den ? num / den : 0;
    }
    return Number(str) || 0;
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allMonsters();

    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(search));
    }

    if (filters.types.length > 0) {
      filtered = filtered.filter(m => filters.types.includes(m.type));
    }

    if (filters.sizes.length > 0) {
      filtered = filtered.filter(m => filters.sizes.includes(m.size));
    }

    if (filters.crMin !== '') {
      const min = this.parseChallengeRating(filters.crMin);
      filtered = filtered.filter(m => this.parseChallengeRating(m.challenge_rating) >= min);
    }

    if (filters.crMax !== '') {
      const max = this.parseChallengeRating(filters.crMax);
      filtered = filtered.filter(m => this.parseChallengeRating(m.challenge_rating) <= max);
    }

    if (filters.hpMin !== '') {
      const min = Number(filters.hpMin);
      filtered = filtered.filter(m => (m.hit_points || 0) >= min);
    }

    if (filters.hpMax !== '') {
      const max = Number(filters.hpMax);
      filtered = filtered.filter(m => (m.hit_points || 0) <= max);
    }

    if (filters.source !== 'all') {
      filtered = filtered.filter(m => this.getSourceLabel(m) === filters.source);
    }

    this.filteredMonsters.set(filtered);
    this.updatePaginatedMonsters();
  }

  private updatePaginatedMonsters(): void {
    const filtered = this.filteredMonsters();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedMonsters.set(filtered.slice(start, end));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
    this.updatePaginatedMonsters();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredMonsters().length / this.pageSize) || 1;
  }

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

  onTypesConfirmed(types: string[]): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, types });
    this.onFilterChange();
  }

  onSizesConfirmed(sizes: string[]): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, sizes });
    this.onFilterChange();
  }

  getIdentifier(monster: Monster): string {
    // Use D&D index (e.g., "adult-gold-dragon") - that's what the backend expects
    return monster.index || (monster as any).id || (monster as any)['_id'] || '';
  }

  // ── Selection mode ──────────────────────────────────────────────
  selectionMode = signal(false);
  selectedIds   = signal<Set<string>>(new Set());

  toggleSelectionMode(): void {
    this.selectionMode.update(v => !v);
    if (!this.selectionMode()) this.selectedIds.set(new Set());
  }

  toggleSelect(id: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  isSelected(id: string): boolean { return this.selectedIds().has(id); }

  exportSelection(): void {
    const ids = Array.from(this.selectedIds()).join(',');
    if (!ids) return;
    this.router.navigate(['/manual/print'], { queryParams: { type: 'monsters', ids } });
  }

  navigateToCreate(): void {
    const returnUrl = window.location.pathname + window.location.search;
    this.router.navigate(['/monsters/new'], { queryParams: { returnUrl } });
  }

  navigateToEdit(monster: Monster): void {
    const monsterId = monster.index || (monster as any).id || (monster as any)['_id'] || '';
    const returnUrl = window.location.pathname + window.location.search;
    this.router.navigate(['/monsters/edit', monsterId], { queryParams: { returnUrl } });
  }
}