import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Race } from '../../interfaces/race';
import { RacesService } from '../../services/races-service';

interface RaceFilters {
  searchName: string;
  size: string;
}

@Component({
  selector: 'app-races',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './races.html',
  styleUrl: './races.css',
})
export class Races implements OnInit {

  private readonly racesService = inject(RacesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  races = signal<Race[]>([]);
  filteredRaces = signal<Race[]>([]);
  private raceIndexSet = new Set<string>();

  loading = signal(true);
  error = signal<string | null>(null);

  currentPage = signal(1);
  readonly pageSize = 25;

  filters = signal<RaceFilters>({
    searchName: '',
    size: '',
  });

  sizes = ['Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

  async ngOnInit(): Promise<void> {
    try {
      await this.racesService.getRaces((item) => {
        if (this.raceIndexSet.has(item.index)) return;
        this.raceIndexSet.add(item.index);
        this.races.update(current =>
          [...current, item].sort((a, b) => a.name.localeCompare(b.name))
        );
      });
      this.loadFiltersFromUrl();
    } catch (error) {
      console.error('Error loading races:', error);
      this.error.set('No se han podido cargar las raza.');
    } finally {
      this.loading.set(false);
      this.raceIndexSet.clear();
    }
  }

  private loadFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const searchName = params.get('searchName') || '';
    const size = params.get('size') || '';
    const page = params.get('page');

    this.filters.set({ searchName, size });
    if (page) this.currentPage.set(Number(page) || 1);
    this.applyFilters();
  }

  private applyFilters(): void {
    const f = this.filters();
    let filtered = this.races();

    if (f.searchName.trim()) {
      const search = f.searchName.toLowerCase();
      filtered = filtered.filter(race => race.name.toLowerCase().includes(search));
    }

    if (f.size) {
      filtered = filtered.filter(race => race.size === f.size);
    }

    this.filteredRaces.set(filtered);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.applyFilters();
    this.updateUrl();
  }

  private updateUrl(): void {
    const f = this.filters();
    this.router.navigate([], {
      queryParams: {
        searchName: f.searchName || null,
        size: f.size || null,
        page: this.currentPage() > 1 ? this.currentPage() : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
    this.updateUrl();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRaces().length / this.pageSize) || 1;
  }

  get paginatedRaces(): Race[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRaces().slice(start, end);
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
}