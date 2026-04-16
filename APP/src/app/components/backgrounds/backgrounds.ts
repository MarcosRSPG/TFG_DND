import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Background } from '../../interfaces/background';
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
  private readonly backgroundsService = inject(BackgroundsService);

  allBackgrounds = signal<Background[]>([]);
  filteredBackgrounds = signal<Background[]>([]);
  filters = signal<BackgroundFilters>({
    searchName: '',
    source: 'all',
  });
  private indexSet = new Set<string>();
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.backgroundsService.getBackgrounds((item) => {
        const id = this.getIdentifier(item);
        if (this.indexSet.has(id)) {
          return;
        }

        this.indexSet.add(id);
        const sorted = [...this.allBackgrounds(), item].sort((a, b) => a.name.localeCompare(b.name));
        this.allBackgrounds.set(sorted);
        this.applyFilters();
        this.loading.set(false);
      });
    } catch (error) {
      console.error('Error loading backgrounds:', error);
      this.error.set('No se han podido cargar los backgrounds.');
    } finally {
      if (!this.error()) {
        this.loading.set(false);
      }
      this.indexSet.clear();
    }
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allBackgrounds();
    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(search));
    }
    this.filteredBackgrounds.set(filtered);
  }

  getIdentifier(item: Background): string {
    return item.id || item.index;
  }
}