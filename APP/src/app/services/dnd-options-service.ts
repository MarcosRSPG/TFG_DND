import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DndProficiency {
  index: string;
  name: string;
  url: string;
  type?: string;
}

export interface DndSchool {
  index: string;
  name: string;
  url: string;
  desc?: string[];
}

export interface DndClass {
  index: string;
  name: string;
  url: string;
}

export interface DndAlignment {
  index: string;
  name: string;
  url: string;
  desc?: string;
}

export interface DndEquipmentCategory {
  index: string;
  name: string;
  url: string;
  equipment?: Array<{
    index: string;
    name: string;
    url: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DndOptionsService {
  private readonly http = inject(HttpClient);
  private readonly dndApiUrl = 'https://www.dnd5eapi.co/api/2014';

  // Signals para almacenar las opciones
  readonly proficiencies = signal<DndProficiency[]>([]);
  readonly schools = signal<DndSchool[]>([]);
  readonly classes = signal<DndClass[]>([]);
  readonly alignments = signal<DndAlignment[]>([]);
  readonly equipmentCategories = signal<DndEquipmentCategory[]>([]);

  readonly isLoading = signal(false);

  async loadAllOptions(): Promise<void> {
    this.isLoading.set(true);

    try {
      await Promise.all([
        this.loadProficiencies(),
        this.loadSchools(),
        this.loadClasses(),
        this.loadAlignments(),
        this.loadEquipmentCategories(),
      ]);
    } catch (error) {
      console.error('Error loading D&D options:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProficiencies(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<{ results: DndProficiency[] }>(`${this.dndApiUrl}/proficiencies`)
      );
      this.proficiencies.set(data.results);
    } catch (error) {
      console.error('Error loading proficiencies:', error);
    }
  }

  async loadSchools(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<{ results: DndSchool[] }>(`${this.dndApiUrl}/magic-schools`)
      );
      this.schools.set(data.results);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  }

  async loadClasses(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<{ results: DndClass[] }>(`${this.dndApiUrl}/classes`)
      );
      this.classes.set(data.results);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }

  async loadAlignments(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<{ results: DndAlignment[] }>(`${this.dndApiUrl}/alignments`)
      );
      this.alignments.set(data.results);
    } catch (error) {
      console.error('Error loading alignments:', error);
    }
  }

  async loadEquipmentCategories(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<{ results: DndEquipmentCategory[] }>(`${this.dndApiUrl}/equipment-categories`)
      );
      this.equipmentCategories.set(data.results);
    } catch (error) {
      console.error('Error loading equipment categories:', error);
    }
  }
}
