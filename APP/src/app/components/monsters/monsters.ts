import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Monster } from '../../interfaces/monster';
import { MonstersService } from '../../services/monsters-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';

interface MonsterFilters {
  searchName: string;
  types: string[];
  sizes: string[];
  crMin: number | '';
  crMax: number | '';
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
    paginatedMonsters = signal<Monster[]>([]);
    currentPage = signal(1);
    readonly pageSize = 25;
  private readonly monstersService = inject(MonstersService);

  @ViewChild('typesModal') typesModal!: FilterModalComponent;
  @ViewChild('sizesModal') sizesModal!: FilterModalComponent;

  allMonsters = signal<Monster[]>([]);
  filteredMonsters = signal<Monster[]>([]);
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
  private indexSet = new Set<string>();
  loading = signal(true);
  error = signal<string | null>(null);
  types = signal<Set<string>>(new Set());
  sizes = signal<Set<string>>(new Set());

  // Expose Array constructor for template
  Array = Array;

  async ngOnInit(): Promise<void> {
    try {
      await this.monstersService.getMonsters((item) => {
        const id = this.getIdentifier(item);
        if (this.indexSet.has(id)) {
          return;
        }

        this.indexSet.add(id);
        const sorted = [...this.allMonsters(), item].sort((a, b) => a.name.localeCompare(b.name));
        this.allMonsters.set(sorted);
        this.updateFiltersOptions();
        this.applyFilters();
        this.loading.set(false);
      });
    } catch (error) {
      console.error('Error loading monsters:', error);
      this.error.set('No se han podido cargar los monsters.');
    } finally {
      if (!this.error()) {
        this.loading.set(false);
      }
      this.indexSet.clear();
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.applyFilters();
  }

  private updateFiltersOptions(): void {
    const typeSet = new Set<string>();
    const sizeSet = new Set<string>();
    this.allMonsters().forEach((monster) => {
      typeSet.add(monster.type);
      sizeSet.add(monster.size);
    });
    this.types.set(typeSet);
    this.sizes.set(sizeSet);
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allMonsters();
    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(search));
    }
    if (filters.types.length > 0) {
      filtered = filtered.filter((m) => filters.types.includes(m.type));
    }
    if (filters.sizes.length > 0) {
      filtered = filtered.filter((m) => filters.sizes.includes(m.size));
    }
    if (filters.crMin !== '') {
      const minCr = Number(filters.crMin);
      filtered = filtered.filter((m) => m.challenge_rating >= minCr);
    }
    if (filters.crMax !== '') {
      const maxCr = Number(filters.crMax);
      filtered = filtered.filter((m) => m.challenge_rating <= maxCr);
    }
    if (filters.hpMin !== '') {
      const minHp = Number(filters.hpMin);
      filtered = filtered.filter((m) => m.hit_points >= minHp);
    }
    if (filters.hpMax !== '') {
      const maxHp = Number(filters.hpMax);
      filtered = filtered.filter((m) => m.hit_points <= maxHp);
    }
    this.filteredMonsters.set(filtered);
    this.updatePaginatedMonsters();
  }

  updatePaginatedMonsters(): void {
    const filtered = this.filteredMonsters();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedMonsters.set(filtered.slice(start, end));
  }

  goToPage(page: number): void {
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

  getIdentifier(item: Monster): string {
    return item.id || item.index;
  }
}