import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Spell } from '../../interfaces/spell';
import { SpellsService } from '../../services/spells-service';
import { FilterModalComponent } from '../filter-modal/filter-modal';

interface SpellFilters {
  searchName: string;
  schools: string[];
  level: string;
  ritual: boolean | null;
  ranges: string[];
  source: string;
}

@Component({
  selector: 'app-spells',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FilterModalComponent],
  templateUrl: './spells.html',
  styleUrl: './spells.css',
})
export class Spells implements OnInit {
  private readonly spellsService = inject(SpellsService);

  @ViewChild('schoolsModal') schoolsModal!: FilterModalComponent;
  @ViewChild('rangesModal') rangesModal!: FilterModalComponent;

  // Expose Array constructor for template
  Array = Array;

  allSpells = signal<Spell[]>([]);
  filteredSpells = signal<Spell[]>([]);
  filters = signal<SpellFilters>({
    searchName: '',
    schools: [],
    level: 'all',
    ritual: null,
    ranges: [],
    source: 'all',
  });
  private indexSet = new Set<string>();
  loading = signal(true);
  error = signal<string | null>(null);
  schools = signal<Set<string>>(new Set());
  ranges = signal<Set<string>>(new Set());

  async ngOnInit(): Promise<void> {
    try {
      await this.spellsService.getSpells((item) => {
        const id = this.getIdentifier(item);
        if (this.indexSet.has(id)) {
          return;
        }
        this.indexSet.add(id);
        const sorted = [...this.allSpells(), item].sort((a, b) => a.name.localeCompare(b.name));
        this.allSpells.set(sorted);
        this.updateFiltersOptions();
        this.applyFilters();
        this.loading.set(false);
      });
    } catch (error) {
      console.error('Error loading spells:', error);
      this.error.set('No se han podido cargar los spells.');
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

  private updateFiltersOptions(): void {
    const schoolSet = new Set<string>();
    const rangeSet = new Set<string>();
    this.allSpells().forEach((spell) => {
      if (spell.school?.name) {
        schoolSet.add(spell.school.name);
      }
      if (spell.range) {
        rangeSet.add(spell.range);
      }
    });
    this.schools.set(schoolSet);
    this.ranges.set(rangeSet);
  }

  private applyFilters(): void {
    const filters = this.filters();
    let filtered = this.allSpells();
    if (filters.searchName.trim()) {
      const search = filters.searchName.toLowerCase();
      filtered = filtered.filter((spell) => spell.name.toLowerCase().includes(search));
    }
    if (filters.schools.length > 0) {
      filtered = filtered.filter((spell) => filters.schools.includes(spell.school?.name || ''));
    }
    if (filters.level !== 'all') {
      filtered = filtered.filter((spell) => spell.level === Number(filters.level));
    }
    if (filters.ritual !== null) {
      filtered = filtered.filter((spell) => spell.ritual === filters.ritual);
    }
    if (filters.ranges.length > 0) {
      filtered = filtered.filter((spell) => filters.ranges.includes(spell.range));
    }
    this.filteredSpells.set(filtered);
  }

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
    this.filters.set({ ...currentFilters, ritual: checked ? true : null });
    this.onFilterChange();
  }

  getIdentifier(item: Spell): string {
    return item.id || item.index;
  }
}