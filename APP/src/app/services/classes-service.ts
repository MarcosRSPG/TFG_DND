import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ClassReference, DndClass, DndClassLevel, DndClassListResponse, FeatureDetail, LeveledFeature } from '../interfaces/class';
import { Subclass, SubclassLevel } from '../interfaces/subclass';

@Injectable({
  providedIn: 'root',
})
export class ClassesService {
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

    const response = await fetch(this.apiUrl + '/classes');

    if (!response.ok) {
      throw new Error(`No se han podido cargar las clases: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as DndClassListResponse;

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
      }),
    );

    classes.sort((a, b) => a.name.localeCompare(b.name));
    this.classesCache = [...classes];

    return classes;
  }

  async getClass(index: string): Promise<DndClass> {
    const response = await fetch(this.buildUrl(`/classes/${index}`));

    if (!response.ok) {
      throw new Error(`No se ha podido cargar la clase ${index}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as DndClass;
  }

  async getClassLevels(index: string): Promise<DndClassLevel[]> {
    const response = await fetch(this.buildUrl(`/classes/${index}/levels`));

    if (!response.ok) {
      throw new Error(`No se han podido cargar los niveles de ${index}: ${response.status} ${response.statusText}`);
    }

    const levels = (await response.json()) as DndClassLevel[];

    return levels.sort((a, b) => a.level - b.level);
  }

  async getSubclass(index: string): Promise<Subclass> {
    const response = await fetch(this.buildUrl(`/subclasses/${index}`));

    if (!response.ok) {
      throw new Error(`No se ha podido cargar la subclase ${index}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Subclass;
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
    const response = await fetch(this.buildUrl(`/subclasses/${subclassIndex}/levels`));

    if (!response.ok) {
      throw new Error(`No se han podido cargar los niveles de subclase ${subclassIndex}: ${response.status} ${response.statusText}`);
    }

    const levels = (await response.json()) as SubclassLevel[];
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
        }),
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
    const response = await fetch(this.buildUrl(featureRef.url));

    if (!response.ok) {
      throw new Error(`No se ha podido cargar la feature ${featureRef.index}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as FeatureDetail;
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