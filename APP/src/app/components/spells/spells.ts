import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Spell } from '../../interfaces/spell';
import { SpellsService } from '../../services/spells-service';
import { LoginService } from '../../services/login-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';
import { VikingCheck } from '../viking-check/viking-check';
import { Alerts, AlertVariant } from '../alerts/alerts';

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
    VikingCheck,
    Alerts,
  ],
  templateUrl: './spells.html',
  styleUrl: './spells.css',
})
export class Spells implements OnInit {

  // 🔹 Servicios
  private readonly spellsService = inject(SpellsService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  private getSourceLabel(spell: Spell): string {
    const cb = spell.created_by;
    if (!cb) return 'official';
    if (cb === 'oficial') return 'official';
    if (cb === this.userId()) return 'own';
    return 'community';
  }

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

    // Load user info for permissions FIRST
    this.userId.set(await this.loginService.getUserId());
    this.userRole.set(await this.loginService.getUserRole());
    
    // Set permissionsLoaded BEFORE loading spells so buttons render correctly
    this.permissionsLoaded.set(true);

    await this.loadSpells();
  }

  canEdit(spell: Spell): boolean {
    const currentUserId = this.userId();
    const role = this.userRole();

    // Admin can edit everything (including official items without created_by)
    if (role === 'admin') return true;

    // Creator can edit their own items
    if (currentUserId && spell.created_by && currentUserId === spell.created_by) {
      return true;
    }

    return false;
  }

  async deleteSpell(spell: Spell): Promise<void> {
    if (!confirm(`Are you sure you want to delete ${spell.name}?`)) {
      return;
    }

    try {
      await this.spellsService.delete(spell.id || spell.index || '');
      // Remove from lists
      const currentAll = this.allSpells();
      const currentFiltered = this.filteredSpells();
      this.allSpells.set(currentAll.filter(s => s !== spell));
      this.filteredSpells.set(currentFiltered.filter(s => s !== spell));
      this.updatePaginatedSpells();
    } catch (error) {
      console.error('Error deleting spell:', error);
      this.showAlert('Error', 'Failed to delete spell');
    }
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

    if (filters.source !== 'all') {
      filtered = filtered.filter(s => this.getSourceLabel(s) === filters.source);
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
    // Use D&D index (e.g., "acid-arrow") - that's what the backend expects
    return item.index || (item as any).id || (item as any)['_id'] || item.name?.toLowerCase().replace(/ /g, '-') || '';
  }

  // ── Selection mode ──────────────────────────────────────────────
  selectionMode = signal(false);
  selectedIds   = signal<Set<string>>(new Set());
  toggleSelectionMode(): void { this.selectionMode.update(v => !v); if (!this.selectionMode()) this.selectedIds.set(new Set()); }
  toggleSelect(id: string, event: Event): void { event.stopPropagation(); event.preventDefault(); this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  isSelected(id: string): boolean { return this.selectedIds().has(id); }
  exportSelection(): void { const ids = Array.from(this.selectedIds()).join(','); if (!ids) return; this.router.navigate(['/manual/print'], { queryParams: { type: 'spells', ids } }); }

  navigateToCreate(): void {
    const returnUrl = window.location.pathname + window.location.search;
    this.router.navigate(['/spells/new'], { queryParams: { returnUrl } });
  }

  navigateToEdit(spell: Spell): void {
    const spellId = spell.id || spell.index || '';
    const returnUrl = window.location.pathname + window.location.search;
    this.router.navigate(['/spells/edit', spellId], { queryParams: { returnUrl } });
  }
}
