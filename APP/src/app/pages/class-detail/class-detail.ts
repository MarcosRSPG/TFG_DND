import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubclassModalComponent } from '../../components/subclass-modal/subclass-modal';
import { ClassChoice, DndClass, DndClassLevel, LeveledFeature } from '../../interfaces/class';
import { Subclass } from '../../interfaces/subclass';
import { ClassesService } from '../../services/classes-service';

interface CounterColumn {
  id: string;
  source: 'class_specific' | 'spellcasting';
  key: string;
  label: string;
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
  private readonly hiddenCounterKeysByClass: Record<string, string[]> = {
    bard: ['magical_secrets'],
    warlock: ['mystic_arcanum'],
  };

  readonly slotLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  dndClass = signal<DndClass | null>(null);
  levels = signal<DndClassLevel[]>([]);
  subclasses = signal<Subclass[]>([]);
  classFeatures = signal<LeveledFeature[]>([]);
  subclassFeatures = signal<LeveledFeature[]>([]);
  counterColumns = signal<CounterColumn[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  selectedSubclass = signal<Subclass | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const index = this.route.snapshot.paramMap.get('index');

      if (!index) {
        throw new Error('No class index provided');
      }

      const [classData, levelData, subclassData, featureData] = await Promise.all([
        this.classesService.getClass(index),
        this.classesService.getClassLevels(index),
        this.classesService.getSubclassesByClass(index),
        this.classesService.getClassFeatureProgression(index),
      ]);

      this.dndClass.set(classData);
      this.levels.set(levelData);
      this.subclasses.set(subclassData);
      this.classFeatures.set(featureData);
      this.counterColumns.set(this.extractCounterColumns(levelData));
    } catch (error) {
      console.error('Error loading class detail:', error);
      this.error.set('Failed to load class details.');
    } finally {
      this.loading.set(false);
    }
  }

  getCounterValue(level: DndClassLevel, column: CounterColumn): string | number {
    if (this.isDruidWildShapeMaxCr(column)) {
      return this.getDruidWildShapeMaxCr(level.level);
    }

    const source = column.source === 'class_specific' ? level.class_specific : level.spellcasting;
    const value = source?.[column.key as keyof typeof source];

    if (value === null || value === undefined || value === false || value === '') {
      return '-';
    }

    return typeof value === 'number' || typeof value === 'string' ? value : '-';
  }

  isSpellcasterClass(): boolean {
    return this.levels().some((level) => this.slotLevels.some((slotLevel) => this.getSpellSlot(level, slotLevel) > 0));
  }

  getFeatureTitles(level: DndClassLevel): string {
    if (!level.features?.length) {
      return 'None';
    }

    return level.features.map((feature) => feature.name).join(', ');
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

    return classData.starting_equipment_options.map((option: ClassChoice) => option.desc);
  }

  getSpellSlot(level: DndClassLevel, slotLevel: number): number {
    const key = `spell_slots_level_${slotLevel}`;
    const value = level.spellcasting?.[key];
    return typeof value === 'number' ? value : 0;
  }

  async openSubclassModal(subclass: Subclass): Promise<void> {
    this.selectedSubclass.set(subclass);
    this.subclassFeatures.set([]);
    this.showModal.set(true);

    try {
      const features = await this.classesService.getSubclassFeatureProgression(subclass.index);
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

  private extractCounterColumns(levels: DndClassLevel[]): CounterColumn[] {
    const columns = new Map<string, CounterColumn>();

    for (const level of levels) {
      this.collectCounterColumns(columns, 'class_specific', level.class_specific);
      this.collectCounterColumns(columns, 'spellcasting', level.spellcasting);
    }

    return [...columns.values()];
  }

  private collectCounterColumns(
    columns: Map<string, CounterColumn>,
    source: 'class_specific' | 'spellcasting',
    values: Record<string, unknown> | undefined,
  ): void {
    if (!values) {
      return;
    }

    for (const [key, value] of Object.entries(values)) {
      if (source === 'spellcasting' && key.startsWith('spell_slots_level_')) {
        continue;
      }

      if (this.shouldHideCounterKey(key)) {
        continue;
      }

      if (!this.isScalar(value)) {
        continue;
      }

      const id = `${source}:${key}`;

      if (!columns.has(id)) {
        columns.set(id, {
          id,
          source,
          key,
          label: this.toLabel(key),
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

        if (group === 'armor') {
          return armorWords.some((word) => lower.includes(word));
        }

        if (group === 'weapon') {
          return weaponWords.some((word) => lower.includes(word)) && !armorWords.some((word) => lower.includes(word));
        }

        return toolWords.some((word) => lower.includes(word));
      });

    return filtered.length ? filtered.join(', ') : 'None';
  }

  private shouldHideCounterKey(key: string): boolean {
    const classIndex = this.dndClass()?.index;

    if (!classIndex) {
      return false;
    }

    const hiddenKeys = this.hiddenCounterKeysByClass[classIndex] ?? [];
    const normalizedKey = key.toLowerCase();

    return hiddenKeys.some((hiddenKey) => normalizedKey.includes(hiddenKey));
  }

  private isDruidWildShapeMaxCr(column: CounterColumn): boolean {
    return this.dndClass()?.index === 'druid' && column.key === 'wild_shape_max_cr';
  }

  private getDruidWildShapeMaxCr(level: number): string {
    if (level < 2) {
      return '-';
    }

    if (level < 4) {
      return '1/4';
    }

    if (level < 8) {
      return '1/2';
    }

    return '1';
  }

  getFeatureDescriptions(item: LeveledFeature): string[] {
    return item.feature.desc?.length ? item.feature.desc : ['No description available.'];
  }

  private isScalar(value: unknown): value is string | number {
    return typeof value === 'string' || typeof value === 'number';
  }

  private toLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}