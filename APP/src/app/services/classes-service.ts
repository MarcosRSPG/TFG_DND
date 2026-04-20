import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClassReference, DndClass, DndClassLevel, DndClassListResponse, FeatureDetail, LeveledFeature } from '../interfaces/class';
import { Subclass, SubclassLevel } from '../interfaces/subclass';

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_DND_OFICIAL;
  private classesCache: DndClass[] | null = null;

  async getClasses(onItemLoaded?: (value: DndClass) => void): Promise<DndClass[]> {
    if (this.classesCache) {
      const cached = [...this.classesCache];
      if (onItemLoaded) {
        for (const item of cached) {
          onItemLoaded(item);
        }
      }
      return cached;
    }

    const data = await firstValueFrom(
      this.http.get<DndClassListResponse>(`${this.apiUrl}/classes`)
    );

    if (!data.results?.length) {
      return [];
    }

    const classes: DndClass[] = [];

    await Promise.all(
      data.results.map(async (classPreview) => {
        try {
          const classData = await this.getClass(classPreview.index);
          classes.push(classData);
          onItemLoaded?.(classData);
        } catch (error) {
          console.error(`Error loading class ${classPreview.index}:`, error);
        }
      })
    );

    classes.sort((a, b) => a.name.localeCompare(b.name));
    this.classesCache = [...classes];

    return classes;
  }

  async getClass(index: string): Promise<DndClass> {
    return firstValueFrom(
      this.http.get<DndClass>(this.buildUrl(`/classes/${index}`))
    );
  }

  async getClassLevels(index: string): Promise<DndClassLevel[]> {
    const levels = await firstValueFrom(
      this.http.get<DndClassLevel[]>(this.buildUrl(`/classes/${index}/levels`))
    );
    return levels.sort((a, b) => a.level - b.level);
  }

  async getSubclass(index: string): Promise<Subclass> {
    return firstValueFrom(
      this.http.get<Subclass>(this.buildUrl(`/subclasses/${index}`))
    );
  }

  async getSubclassesByClass(classIndex: string): Promise<Subclass[]> {
    const classData = await this.getClass(classIndex);

    if (!classData.subclasses?.length) {
      return [];
    }

    const subclasses: Subclass[] = [];

    for (const subclassRef of classData.subclasses) {
      try {
        const subclass = await this.getSubclass(subclassRef.index);
        subclasses.push(subclass);
      } catch (error) {
        console.error(`Error loading subclass ${subclassRef.index}:`, error);
      }
    }

    return subclasses;
  }

  async getClassFeatureProgression(classIndex: string): Promise<LeveledFeature[]> {
    const levels = await this.getClassLevels(classIndex);
    return this.buildFeatureProgression(levels);
  }

  async getSubclassFeatureProgression(subclassIndex: string): Promise<LeveledFeature[]> {
    const levels = await this.getSubclassLevels(subclassIndex);
    return this.buildFeatureProgression(levels);
  }

  private async getSubclassLevels(subclassIndex: string): Promise<SubclassLevel[]> {
    const levels = await firstValueFrom(
      this.http.get<SubclassLevel[]>(this.buildUrl(`/subclasses/${subclassIndex}/levels`))
    );
    return levels.sort((a, b) => a.level - b.level);
  }

  private async buildFeatureProgression(levels: Array<{ level: number; features: ClassReference[] }>): Promise<LeveledFeature[]> {
    const featureMap = new Map<string, LeveledFeature>();

    for (const level of levels) {
      const featureResults = await Promise.all(
        (level.features ?? []).map(async (featureRef) => {
          try {
            const detail = await this.getFeature(featureRef);
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

  private async getFeature(featureRef: ClassReference): Promise<FeatureDetail> {
    return firstValueFrom(
      this.http.get<FeatureDetail>(this.buildUrl(featureRef.url))
    );
  }

  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    if (path.startsWith('/api/2014')) {
      return `https://www.dnd5eapi.co${path}`;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${normalizedPath}`;
  }
}