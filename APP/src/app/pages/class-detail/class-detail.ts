import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubclassModalComponent } from '../../components/subclass-modal/subclass-modal';
import { DndClass, DndClassLevel, LeveledFeature } from '../../interfaces/class';
import { Subclass } from '../../interfaces/subclass';
import { ClassesService } from '../../services/classes-service';
import { AllClassesProgressionConfig, ProgressionColumn, ProgressionEntry } from '../../interfaces/class-progression-config';

// Extended interface for internal use, supporting both JSON-driven and API-driven columns
interface DisplayColumn {
  id: string;
  label: string;
  // For JSON-driven columns (like Rage Damage, Sneak Attack)
  progression?: ProgressionEntry[];
  // For API-driven columns (like Spell Slots)
  source?: 'class_specific' | 'spellcasting';
  key?: string;
}

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SubclassModalComponent],
  templateUrl: './class-detail.html',
  styleUrl: './class-detail.css',
})
export class ClassDetail implements OnInit {
  private readonly classesService = inject(ClassesService);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  dndClass = signal<DndClass | null>(null);
  levels = signal<DndClassLevel[]>([]);
  subclasses = signal<Subclass[]>([]);
  classFeatures = signal<LeveledFeature[]>([]);
  subclassFeatures = signal<LeveledFeature[]>([]);

  // THE ONLY source of truth for table columns
  displayColumns = signal<DisplayColumn[]>([]);

  progressionConfig = signal<AllClassesProgressionConfig | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  selectedSubclass = signal<Subclass | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get('id');

      if (!id) {
        throw new Error('No class id provided');
      }

      const [classData, levelData, subclassData, featureData, config] = await Promise.all([
        this.classesService.getClass(id),
        this.classesService.getClassLevels(id),
        this.classesService.getSubclassesByClass(id),
        this.classesService.getClassFeatureProgression(id),
        firstValueFrom(this.http.get<AllClassesProgressionConfig>('/assets/class-progression-config.json')),
      ]);

      this.dndClass.set(classData);
      this.levels.set(levelData);
      this.subclasses.set(subclassData);
      this.classFeatures.set(featureData);
      this.progressionConfig.set(config);

      // Generate all columns based on JSON config
      this.displayColumns.set(this.extractDisplayColumns(levelData, config, id));

    } catch (error) {
      console.error('Error loading class detail:', error);
      this.error.set('Failed to load class details.');
    } finally {
      this.loading.set(false);
    }
  }

  // --- UNIFIED TABLE LOGIC ---

  getColumnValue(level: DndClassLevel, column: DisplayColumn): string | number {
    // CASE 1: JSON-Driven Column (Read from progression array in JSON)
    if (column.progression) {
      let result = '-';
      for (const entry of column.progression) {
        if (entry.level <= level.level) {
          result = entry.value;
        } else {
          break;
        }
      }
      return result;
    }

    // CASE 2: API-Driven Column (Read from API data like Spell Slots)
    if (column.source && column.key) {
      const source = column.source === 'class_specific' ? level.class_specific : level.spellcasting;
      const value = source?.[column.key as keyof typeof source];

      if (value === null || value === undefined || value === false || value === '') {
        return '-';
      }
      return typeof value === 'number' || typeof value === 'string' ? value : '-';
    }

    return '-';
  }

  // --- PAGE METHODS (Restored) ---

  getFeatureIndices(level: DndClassLevel): { index: string; name: string }[] {
    if (!level.features?.length) {
      return [];
    }
    return level.features.map((feature) => ({
      index: feature.index ?? '',
      name: feature.name ?? 'Unknown Feature',
    }));
  }

  getFeatureDescriptions(item: LeveledFeature): string[] {
    return item.feature.desc?.length ? item.feature.desc : ['No description available.'];
  }

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_URL}${imagePath}`;
  }

  getHitPointsAtFirstLevel(hitDie: number): string {
    return `${hitDie} + your Constitution modifier`;
  }

  getHitPointsAtHigherLevels(hitDie: number, className: string): string {
    const average = Math.floor(hitDie / 2) + 1;
    return `1d${hitDie} (or ${average}) + your Constitution modifier per ${className.toLowerCase()} level after 1st`;
  }

  getArmorProficiencies(): string {
    return this.getProficienciesByGroup('armor');
  }

  getWeaponProficiencies(): string {
    return this.getProficienciesByGroup('weapon');
  }

  getToolProficiencies(): string {
    return this.getProficienciesByGroup('tool');
  }

  getSkillsDescription(): string {
    const classData = this.dndClass();
    if (!classData?.proficiency_choices?.length) {
      return 'None';
    }
    const skillChoices = classData.proficiency_choices
      .map((choice) => choice.desc)
      .filter((desc) => desc.toLowerCase().includes('choose'));
    return skillChoices.length ? skillChoices.join(' | ') : 'None';
  }

  getStartingEquipmentLines(): string[] {
    const classData = this.dndClass();
    if (!classData?.starting_equipment?.length) {
      return [];
    }
    return classData.starting_equipment.map((item) =>
      item.quantity > 1 ? `${item.quantity}x ${item.equipment.name}` : item.equipment.name,
    );
  }

  getEquipmentOptionLines(): string[] {
    const classData = this.dndClass();
    if (!classData?.starting_equipment_options?.length) {
      return [];
    }
    return classData.starting_equipment_options.map((option: any) => option.desc);
  }

  scrollToFeature(index: string): void {
    const element = document.getElementById('feature-' + index);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn(`Feature element with id 'feature-${index}' not found`);
    }
  }

  async openSubclassModal(subclass: Subclass): Promise<void> {
    this.selectedSubclass.set(subclass);
    this.subclassFeatures.set([]);
    this.showModal.set(true);

    try {
      if (!subclass.id) throw new Error('Subclass id is missing');
      const features = await this.classesService.getSubclassFeatureProgression(subclass.id);
      this.subclassFeatures.set(features);
    } catch (error) {
      console.error('Error loading subclass features:', error);
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedSubclass.set(null);
    this.subclassFeatures.set([]);
  }

  // --- PRIVATE LOGIC ---

  private extractDisplayColumns(levels: DndClassLevel[], config: AllClassesProgressionConfig | null, className: string): DisplayColumn[] {
    const columns: DisplayColumn[] = [];

    // 1. Add columns defined in JSON config
    const classConfig = config?.[className];
    if (classConfig?.progressionColumns) {
      for (const col of classConfig.progressionColumns) {
        columns.push({
          id: col.id,
          label: col.label,
          progression: col.progression // Store progression array for rendering
        });
      }
    }

    // 2. Add Spell Slots ONLY if configured in JSON (spellSlots: true)
    if (classConfig?.spellSlots) {
      this.addSpellSlotColumns(columns, levels);
    }

    return columns;
  }

  private addSpellSlotColumns(columns: DisplayColumn[], levels: DndClassLevel[]): void {
    const hasSpellcasting = levels.some(l => l.spellcasting && Object.keys(l.spellcasting).length > 0);
    if (!hasSpellcasting) return;

    const slotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const slotLevel of slotLevels) {
      const id = `spell-slot-${slotLevel}`;
      if (!columns.some(c => c.id === id)) {
        columns.push({
          id,
          label: `${slotLevel}`,
          source: 'spellcasting',
          key: `spell_slots_level_${slotLevel}`
        });
      }
    }
  }

  private getProficienciesByGroup(group: 'armor' | 'weapon' | 'tool'): string {
    const classData = this.dndClass();
    if (!classData?.proficiencies?.length) {
      return 'None';
    }

    const armorWords = ['armor', 'shield'];
    const weaponWords = ['weapon', 'sword', 'axe', 'bow', 'dagger', 'mace', 'crossbow', 'staff', 'sling', 'dart'];
    const toolWords = ['tool', 'kit', 'instrument', 'supplies', 'set', 'vehicles'];

    const filtered = classData.proficiencies
      .map((proficiency) => proficiency.name)
      .filter((name) => !name.startsWith('Saving Throw:') && !name.startsWith('Skill:'))
      .filter((name) => {
        const lower = name.toLowerCase();
        if (group === 'armor') return armorWords.some((word) => lower.includes(word));
        if (group === 'weapon') return weaponWords.some((word) => lower.includes(word)) && !armorWords.some((word) => lower.includes(word));
        return toolWords.some((word) => lower.includes(word));
      });

    return filtered.length ? filtered.join(', ') : 'None';
  }
}
