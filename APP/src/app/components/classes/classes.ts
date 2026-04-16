import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DndClass } from '../../interfaces/class';
import { ClassesService } from '../../services/classes-service';

interface ClassFilters {
  searchName: string;
  isMagical: boolean | null;
  source: string;
}

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './classes.html',
  styleUrl: './classes.css',
})
export class Classes implements OnInit {
  private readonly classesService = inject(ClassesService);

  allClasses = signal<DndClass[]>([]);
  filteredClasses = signal<DndClass[]>([]);
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
        if (this.classIndexSet.has(item.index)) {
          return;
        }
        this.classIndexSet.add(item.index);
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
  }
}
