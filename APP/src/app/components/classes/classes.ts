import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DndClass } from '../../interfaces/class';
import { ClassesService } from '../../services/classes-service';
import { VikingCheck } from '../viking-check/viking-check';

interface ClassFilters {
  searchName: string;
  isMagical: boolean | null;
  source: string;
}

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, VikingCheck],
  templateUrl: './classes.html',
  styleUrl: './classes.css',
})
export class Classes implements OnInit {
  private readonly classesService = inject(ClassesService);

  allClasses = signal<DndClass[]>([]);
  filteredClasses = signal<DndClass[]>([]);
  paginatedClasses = signal<DndClass[]>([]);
  currentPage = signal(1);
  readonly pageSize = 10;
  filters = signal<ClassFilters>({
    searchName: '',
    isMagical: null,
    source: 'all',
  });
  private classIndexSet = new Set<string>();
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.classesService.getClasses((item) => {
        const indexKey = item.id || item.index || '';
        if (this.classIndexSet.has(indexKey)) {
          return;
        }
        this.classIndexSet.add(indexKey);
        const sorted = [...this.allClasses(), item].sort((a, b) => a.name.localeCompare(b.name));
        this.allClasses.set(sorted);
        this.applyFilters();
        this.loading.set(false);
      });
    } catch (error) {
      console.error('Error loading classes:', error);
      this.error.set('No se han podido cargar las clases.');
    } finally {
      if (!this.error()) {
        this.loading.set(false);
      }
      this.classIndexSet.clear();
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.applyFilters();
  }

  onMagicalChange(checked: boolean): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, isMagical: checked ? true : null });
    this.onFilterChange();
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allClasses();
    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(search));
    }
    if (filters.isMagical !== null) {
      filtered = filtered.filter((c) => !!c.spellcasting === filters.isMagical);
    }
    this.filteredClasses.set(filtered);
    this.updatePaginatedClasses();
  }

  private updatePaginatedClasses(): void {
    const filtered = this.filteredClasses();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedClasses.set(filtered.slice(start, end));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
    this.updatePaginatedClasses();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredClasses().length / this.pageSize) || 1;
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