import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Background, BackgroundEquipment } from '../../interfaces/background';
import { BackgroundsService } from '../../services/backgrounds-service';

interface BackgroundFilters {
  searchName: string;
  source: string;
}

@Component({
  selector: 'app-backgrounds',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './backgrounds.html',
  styleUrl: './backgrounds.css',
})
export class Backgrounds implements OnInit {

  // =========================
  // SERVICES
  // =========================
  private readonly backgroundsService = inject(BackgroundsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // =========================
  // STATE
  // =========================
  allBackgrounds = signal<Background[]>([]);
  filteredBackgrounds = signal<Background[]>([]);
  paginatedBackgrounds = signal<Background[]>([]);

  currentPage = signal(1);
  readonly pageSize = 10;

  filters = signal<BackgroundFilters>({
    searchName: '',
    source: 'all',
  });

  private indexSet = new Set<string>();

  loading = signal(true);
  error = signal<string | null>(null);

  // =========================
  // INIT
  // =========================
  async ngOnInit(): Promise<void> {

    this.route.queryParams.subscribe(params => {
      this.filters.set({
        searchName: params['searchName'] || '',
        source: params['source'] || 'all',
      });

      this.currentPage.set(Number(params['page']) || 1);
    });

    await this.loadBackgrounds();
  }

  async loadBackgrounds(): Promise<void> {
    this.loading.set(true);
    this.indexSet.clear();

    try {
      const backgrounds = await this.backgroundsService.getBackgrounds();

      for (const item of backgrounds) {
        const id = this.getIdentifier(item);
        if (this.indexSet.has(id)) continue;

        this.indexSet.add(id);

        const sorted = [...this.allBackgrounds(), item]
          .sort((a, b) => a.name.localeCompare(b.name));

        this.allBackgrounds.set(sorted);
      }

      this.applyFilters();

    } catch (error) {
      console.error('Error loading backgrounds:', error);
      this.error.set('No se han podido cargar los backgrounds.');
    } finally {
      this.loading.set(false);
    }
  }

  // =========================
  // FILTERS
  // =========================
  onSearchNameChange(value: string): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, searchName: value });
    this.onFilterChange();
  }

  onSourceChange(value: string): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, source: value });
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.applyFilters();

    const filters = this.filters();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        searchName: filters.searchName || undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        page: 1
      },
      queryParamsHandling: 'merge',
    });
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allBackgrounds();

    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter(b => b.name.toLowerCase().includes(search));
    }

    this.filteredBackgrounds.set(filtered);
    this.updatePaginatedBackgrounds();
  }

  // =========================
  // PAGINATION
  // =========================
  updatePaginatedBackgrounds(): void {
    const filtered = this.filteredBackgrounds();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.paginatedBackgrounds.set(filtered.slice(start, end));
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.updatePaginatedBackgrounds();

    const filters = this.filters();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        searchName: filters.searchName || undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        page
      },
      queryParamsHandling: 'merge',
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredBackgrounds().length / this.pageSize) || 1;
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
  // HELPERS
  // =========================
  getIdentifier(item: Background): string {
    return item.id || item.name?.toLowerCase().replace(/ /g, '-') || '';
  }

  getEquipmentLinks(equipment: BackgroundEquipment[]): { id: number, name: string, type: string, url: string }[] {
    return equipment.map(e => {
      const eq = e.equipment;
      // Extract type from URL like "/api/equipment/1" - infer from the reference
      const type = this.inferItemType(eq.index);
      const id = this.extractIdFromUrl(eq.url);
      return {
        id,
        name: eq.name,
        type,
        url: `/items/${type}/${id}`
      };
    });
  }

  private inferItemType(index: string): string {
    const lower = index.toLowerCase();
    if (lower.includes('armor') || lower.includes('shield')) return 'armor';
    if (lower.includes('sword') || lower.includes('axe') || lower.includes('bow') ||
        lower.includes('weapon') || lower.includes('dagger') || lower.includes('mace')) return 'weapon';
    if (lower.includes('tool') || lower.includes('kit') || lower.includes('instrument')) return 'tool';
    if (lower.includes('mount') || lower.includes('vehicle') || lower.includes('horse')) return 'mount';
    return 'adventuringgear';
  }

  private extractIdFromUrl(url: string): number {
    if (!url) return 0;
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return parseInt(lastPart, 10) || 0;
  }

  navigateToCreate(): void {
    this.router.navigate(['/backgrounds/new']);
  }
}