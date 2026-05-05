import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AllClassesProgressionConfig, ClassProgressionConfig } from '../interfaces/class-progression-config';

@Injectable({ providedIn: 'root' })
export class ClassProgressionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  /**
   * Get all class progression configurations
   */
  async getAllProgressionConfigs(): Promise<AllClassesProgressionConfig> {
    const data = await firstValueFrom(
      this.http.get<{ count: number; results: Array<Record<string, any>> }>(
        `${this.apiUrl}/class-progression`
      )
    );

    // Convert array format to object keyed by class name
    const configMap: AllClassesProgressionConfig = {};
    if (data.results) {
      for (const item of data.results) {
        // API returns 'className' (converted from 'class_name' in Python)
        const className = item['className'] || item['class_name'] || '';
        if (!className) continue;

        // Build config object from the item
        const config: ClassProgressionConfig = {
          hiddenKeys: item['hiddenKeys'] || [],
          spellSlots: item['spellSlots'] || false,
          progressionColumns: item['progressionColumns'] || []
        };
        configMap[className] = config;
      }
    }
    return configMap;
  }

  /**
   * Get progression configuration for a specific class
   */
  async getProgressionByClass(className: string): Promise<ClassProgressionConfig> {
    const data = await firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/class-progression/${className}`)
    );
    return data;
  }

  /**
   * Create or update progression configuration for a class
   */
  async saveProgression(className: string, config: ClassProgressionConfig): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/class-progression/${className}`, config)
    );
  }

  /**
   * Delete progression configuration for a class
   */
  async deleteProgression(className: string): Promise<any> {
    return firstValueFrom(
      this.http.delete<any>(`${this.apiUrl}/class-progression/${className}`)
    );
  }
}
