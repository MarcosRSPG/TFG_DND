import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Spell } from '../../interfaces/spell';
import { SpellsService } from '../../services/spells-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';
import { VikingCheck } from '../viking-check/viking-check';

interface SpellFilters {
  searchName: string;
  schools: string[];
  level: string;
  ritual: boolean | null;
  ranges: string[];
  classes: string[];
  source: string;
}

@Component({
  selector: 'app-spells',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    FilterModalComponent,
    VikingCheck
  ],
  templateUrl: './spells.html',
  styleUrl: './spells.css',
})
export class Spells implements OnInit {

  // 🔹 Servicios
  private readonly spellsService = inject(SpellsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // 🔹 ViewChild
  @ViewChild('schoolsModal') schoolsModal!: FilterModalComponent;
  @ViewChild('rangesModal') rangesModal!: FilterModalComponent;
  @ViewChild('classesModal') classesModal!: FilterModalComponent;

  // 🔹 Signals
  allSpells = signal<Spell[]>([]);
  filteredSpells = signal<Spell[]>([]);
  paginatedSpells = signal<Spell[]>([]);
  currentPage = signal(1);
  readonly pageSize = 10;

  filters = signal<SpellFilters>({
    searchName: '',
    schools: [],
    level: 'all',
    ritual: null,
    ranges: [],
    classes: [],
    source: 'all',
  });

  loading = signal(true);
  error = signal<string | null>(null);

  schools = signal<Set<string>>(new Set());
  ranges = signal<Set<string>>(new Set());
  classes = signal<Set<string>>(new Set());

  private indexSet = new Set<string>();

  // Para usar en template
  Array = Array;

  // =========================
  // INIT
  // =========================
  async ngOnInit(): Promise<void> {

    this.route.queryParams.subscribe(params => {
      this.filters.set({
        searchName: params['searchName'] || '',
        schools: params['schools'] ? params['schools'].split(',') : [],
        level: params['level'] || 'all',
        ritual:
          params['ritual'] === 'true'
            ? true
            : params['ritual'] === 'false'
            ? false
            : null,
        ranges: params['ranges'] ? params['ranges'].split(',') : [],
        classes: params['classes'] ? params['classes'].split(',') : [],
        source: params['source'] || 'all',
      });
    });

    await this.loadSpells();
  }

  async loadSpells(): Promise<void> {
    this.loading.set(true);
    this.indexSet.clear();

    try {
      const spells = await this.spellsService.getSpells();
      
      for (const item of spells) {
        const id = this.getIdentifier(item);

        if (this.indexSet.has(id)) continue;
        this.indexSet.add(id);

        const sorted = [...this.allSpells(), item].sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        this.allSpells.set(sorted);
      }

      this.updateFiltersOptions();
      this.applyFilters();

    } catch (error) {
      console.error('Error loading spells:', error);
      this.error.set('No se han podido cargar los spells.');
    } finally {
      this.loading.set(false);
    }
  }

  // =========================
  // FILTROS
  // =========================

  onFilterChange(): void {
    this.applyFilters();

    const filters = this.filters();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        searchName: filters.searchName || undefined,
        schools: filters.schools.length ? filters.schools.join(',') : undefined,
        level: filters.level !== 'all' ? filters.level : undefined,
        ritual: filters.ritual !== null ? filters.ritual : undefined,
        ranges: filters.ranges.length ? filters.ranges.join(',') : undefined,
        classes: filters.classes.length ? filters.classes.join(',') : undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
      },
      queryParamsHandling: 'merge',
    });
  }

  private updateFiltersOptions(): void {
    const schoolSet = new Set<string>();
    const rangeSet = new Set<string>();
    const classSet = new Set<string>();

    this.allSpells().forEach((spell) => {
      if (spell.school?.name) {
        schoolSet.add(spell.school.name);
      }
      if (spell.range) {
        rangeSet.add(spell.range);
      }
      if (spell.classes) {
        spell.classes.forEach(c => {
          if (c.name) classSet.add(c.name);
        });
      }
    });

    this.schools.set(schoolSet);
    this.ranges.set(rangeSet);
    this.classes.set(classSet);
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allSpells();

    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter((spell) =>
        spell.name.toLowerCase().includes(search)
      );
    }

    if (filters.schools.length > 0) {
      filtered = filtered.filter((spell) =>
        filters.schools.includes(spell.school?.name || '')
      );
    }

    if (filters.level !== 'all') {
      filtered = filtered.filter(
        (spell) => spell.level === Number(filters.level)
      );
    }

    if (filters.ritual !== null) {
      filtered = filtered.filter(
        (spell) => spell.ritual === filters.ritual
      );
    }

    if (filters.ranges.length > 0) {
      filtered = filtered.filter((spell) =>
        filters.ranges.includes(spell.range)
      );
    }

    if (filters.classes.length > 0) {
      filtered = filtered.filter((spell) => {
        if (!spell.classes?.length) return false;
        return spell.classes.some(c => c.name && filters.classes.includes(c.name));
      });
    }

    this.filteredSpells.set(filtered);
    this.updatePaginatedSpells();
  }

  private updatePaginatedSpells(): void {
    const filtered = this.filteredSpells();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedSpells.set(filtered.slice(start, end));
  }

  // =========================
  // MODALES
  // =========================

  onSchoolsConfirmed(schools: string[]): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, schools });
    this.onFilterChange();
  }

  onRangesConfirmed(ranges: string[]): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, ranges });
    this.onFilterChange();
  }

  onRitualChange(checked: boolean): void {
    const currentFilters = this.filters();
    this.filters.set({
      ...currentFilters,
      ritual: checked ? true : null
    });
    this.onFilterChange();
  }

  onClassesConfirmed(classes: string[]): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, classes });
    this.onFilterChange();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
    this.updatePaginatedSpells();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredSpells().length / this.pageSize) || 1;
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

  // =========================
  // UTIL
  // =========================

  getIdentifier(item: Spell): string {
    return item.id || item.index || item.name?.toLowerCase().replace(/ /g, '-') || '';
  }

  navigateToCreate(): void {
    this.router.navigate(['/spells/new']);
  }
}
