import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Monster } from '../../interfaces/monster';
import { MonstersService } from '../../services/monsters-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';

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
  imports: [CommonModule, RouterLink, FormsModule, FilterModalComponent],
  templateUrl: './monsters.html',
  styleUrl: './monsters.css',
})
export class Monsters implements OnInit {
  private readonly monstersService = inject(MonstersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

    await this.loadMonsters();
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
    return monster.id || monster.name?.toLowerCase().replace(/ /g, '-') || '';
  }

  navigateToCreate(): void {
    this.router.navigate(['/monsters/new']);
  }
}