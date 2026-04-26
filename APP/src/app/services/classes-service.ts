import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClassReference, DndClass, DndClassLevel, DndClassListResponse, FeatureDetail, LeveledFeature } from '../interfaces/class';
import { Subclass, SubclassLevel } from '../interfaces/subclass';

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  // === SIGNALS ===
  private _classes = signal<DndClass[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly classes = this._classes.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async getClasses(onItemLoaded?: (value: DndClass) => void): Promise<DndClass[]> {
    if (this._classes().length > 0) {
      const cached = [...this._classes()];
      if (onItemLoaded) {
        for (const item of cached) {
          onItemLoaded(item);
        }
      }
      return cached;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<DndClassListResponse>(`${this.apiUrl}/classes`)
      );

      if (!data.results?.length) {
        this._classes.set([]);
        return [];
      }

      const classes: DndClass[] = [];

      await Promise.all(
        data.results.map(async (classPreview) => {
          try {
            const classData = await this.getClass(classPreview.id || classPreview.index || '');
            classes.push(classData);
            onItemLoaded?.(classData);
          } catch (error) {
            console.error(`Error loading class ${classPreview.id || classPreview.index}:`, error);
          }
        })
      );

      classes.sort((a, b) => a.name.localeCompare(b.name));
      this._classes.set([...classes]);

      return classes;
    } catch (err) {
      this._error.set('Failed to load classes');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  async getClass(id: string): Promise<DndClass> {
    return firstValueFrom(
      this.http.get<DndClass>(`${this.apiUrl}/classes/${id}`)
    );
  }

  async getClassLevels(id: string): Promise<DndClassLevel[]> {
    const levels = await firstValueFrom(
      this.http.get<DndClassLevel[]>(`${this.apiUrl}/classes/${id}/levels`)
    );
    return levels.sort((a, b) => a.level - b.level);
  }

  async getSubclass(id: string): Promise<Subclass> {
    return firstValueFrom(
      this.http.get<Subclass>(`${this.apiUrl}/classes/subclasses/${id}`)
    );
  }

  async getSubclassesByClass(classId: string): Promise<Subclass[]> {
    const classData = await this.getClass(classId);

    if (!classData.subclasses?.length) {
      return [];
    }

    const subclasses: Subclass[] = [];

    for (const subclassRef of classData.subclasses) {
      try {
        const subclass = await this.getSubclass(subclassRef.id || subclassRef.index || '');
        subclasses.push(subclass);
      } catch (error) {
        console.error(`Error loading subclass ${subclassRef.id || subclassRef.index}:`, error);
      }
    }

    return subclasses;
  }

  async getClassFeatureProgression(classId: string): Promise<LeveledFeature[]> {
    const levels = await this.getClassLevels(classId);
    return this.buildFeatureProgression(levels);
  }

  async getSubclassFeatureProgression(subclassId: string): Promise<LeveledFeature[]> {
    const levels = await this.getSubclassLevels(subclassId);
    return this.buildFeatureProgression(levels);
  }

  private async getSubclassLevels(subclassId: string): Promise<SubclassLevel[]> {
    const levels = await firstValueFrom(
      this.http.get<SubclassLevel[]>(`${this.apiUrl}/classes/subclasses/${subclassId}/levels`)
    );
    return levels.sort((a, b) => a.level - b.level);
  }

  private async buildFeatureProgression(levels: Array<{ level: number; features: ClassReference[] }>): Promise<LeveledFeature[]> {
    const featureMap = new Map<string, LeveledFeature>();

    for (const level of levels) {
      const featureResults = await Promise.all(
        (level.features ?? []).map(async (featureRef) => {
          try {
            const detail = await this.getFeature(featureRef.index);
            return detail;
          } catch (error) {
            console.error(`Error loading feature ${featureRef.index}:`, error);
            return null;
          }
        })
      );

      for (const detail of featureResults) {
        if (!detail || featureMap.has(detail.index)) {
          continue;
        }

        featureMap.set(detail.index, {
          level: level.level,
          feature: detail,
        });
      }
    }

    return [...featureMap.values()].sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }

      return a.feature.name.localeCompare(b.feature.name);
    });
  }

  private async getFeature(index: string): Promise<FeatureDetail> {
    return firstValueFrom(
      this.http.get<FeatureDetail>(`${this.apiUrl}/features/${index}`)
    );
  }
}