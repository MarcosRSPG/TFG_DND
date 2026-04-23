import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Spell } from '../../interfaces/spell';
import { SpellsService } from '../../services/spells-service';
import {
  DndOptionsService,
  DndSchool,
  DndClass,
} from '../../services/dnd-options-service';
import { VikingCheck } from '../../components/viking-check/viking-check';

type CastingUnit = 'action' | 'bonus_action' | 'reaction' | 'other';
type RangeUnit = 'feet' | 'touch' | 'self';
type DurationUnit = 'instantaneous' | 'seconds' | 'minutes' | 'hours' | 'days' | 'up_to';
type AoEUnit = 'sphere' | 'cube' | 'cylinder' | 'line' | 'cone';

interface ClassSubclassOption {
  index: string;
  name: string;
  type: 'class' | 'subclass';
  url: string;
}

@Component({
  selector: 'app-spell-form',
  standalone: true,
  imports: [CommonModule, FormsModule, VikingCheck],
  templateUrl: './spell-form.html',
  styleUrl: './spell-form.css',
})
export class SpellForm implements OnInit {
  private readonly spellsService = inject(SpellsService);
  private readonly dndOptions = inject(DndOptionsService);
  private readonly router = inject(Router);

  isEditMode = signal(false);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Form data
  formData = signal<Partial<Spell>>({
    name: '',
    desc: [''],
    higher_level: [],
    range: '',
    components: [],
    material: '',
    ritual: false,
    duration: '',
    concentration: false,
    casting_time: '',
    level: 0,
    school: undefined,
    classes: [],
    subclasses: [],
    image: '',
    damage: {},
    dc: {},
    area_of_effect: { type: 'sphere', size: 0 },
  });

  // Casting time
  castingTimeNumber = signal<number>(1);
  castingTimeUnit = signal<CastingUnit>('action');
  castingTimeOtherText = signal('');

  // Range
  rangeNumber = signal<number>(0);
  rangeUnit = signal<RangeUnit>('feet');
  rangeAoE = signal(false);
  rangeAoESize = signal(0);
  rangeAoEType = signal<AoEUnit>('sphere');

  // Duration
  durationNumber = signal<number>(0);
  durationUnit = signal<DurationUnit>('instantaneous');
  durationUpToMinutes = signal(0);

  // AoE
  hasAoE = signal(false);

  // Component checkboxes
  hasVerbal = signal(false);
  hasSomatic = signal(false);
  hasMaterial = signal(false);

  // Casting time units
  castingUnits: { value: CastingUnit; label: string }[] = [
    { value: 'action', label: '1 Action' },
    { value: 'bonus_action', label: '1 Bonus Action' },
    { value: 'reaction', label: '1 Reaction' },
    { value: 'other', label: 'Other' },
  ];

  // Range units
  rangeUnits: { value: RangeUnit; label: string }[] = [
    { value: 'feet', label: 'Feet' },
    { value: 'touch', label: 'Touch' },
    { value: 'self', label: 'Self' },
  ];

  // Duration units
  durationUnits: { value: DurationUnit; label: string }[] = [
    { value: 'instantaneous', label: 'Instantaneous' },
    { value: 'seconds', label: 'Seconds' },
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' },
    { value: 'up_to', label: 'Up to' },
  ];

  // AoE types
  aoeTypes: { value: AoEUnit; label: string }[] = [
    { value: 'sphere', label: 'Sphere' },
    { value: 'cube', label: 'Cube' },
    { value: 'cylinder', label: 'Cylinder' },
    { value: 'line', label: 'Line' },
    { value: 'cone', label: 'Cone' },
  ];

  // Damage types for spell
  damageTypes = [
    { index: 'acid', name: 'Acid' },
    { index: 'bludgeoning', name: 'Bludgeoning' },
    { index: 'cold', name: 'Cold' },
    { index: 'fire', name: 'Fire' },
    { index: 'force', name: 'Force' },
    { index: 'lightning', name: 'Lightning' },
    { index: 'necrotic', name: 'Necrotic' },
    { index: 'piercing', name: 'Piercing' },
    { index: 'poison', name: 'Poison' },
    { index: 'psychic', name: 'Psychic' },
    { index: 'radiant', name: 'Radiant' },
    { index: 'slashing', name: 'Slashing' },
    { index: 'thunder', name: 'Thunder' },
  ];

  // Ability scores
  abilityScores = [
    { index: 'str', name: 'STR' },
    { index: 'dex', name: 'DEX' },
    { index: 'con', name: 'CON' },
    { index: 'int', name: 'INT' },
    { index: 'wis', name: 'WIS' },
    { index: 'cha', name: 'CHA' },
  ];

  // DC success types
  dcSuccessTypes = ['none', 'half', 'quarter'];

  // Search queries (for autocomplete)
  classSearchQuery = signal('');
  classSubclassSearchQuery = signal('');
  showClassSubclassDropdown = signal(false);
  damageTypeSearchQuery = signal('');
  dcAbilitySearchQuery = signal('');

  // Damage toggle
  hasDamage = signal(false);
  selectedDamageTypes = signal<string[]>([]);

  // Available options
  get schools(): DndSchool[] {
    return this.dndOptions.schools();
  }

  get classes(): DndClass[] {
    return this.dndOptions.classes();
  }

  get subclasses(): DndClass[] {
    return this.dndOptions.subclasses();
  }

  // Combined classes + subclasses filter
  get classSubclassOptions(): ClassSubclassOption[] {
    const query = this.classSubclassSearchQuery().toLowerCase();
    const classesList = this.dndOptions.classes();
    const subclassesList = this.dndOptions.subclasses();
    const classes = classesList.map(c => ({ ...c, type: 'class' as const, url: c.url }));
    const subclasses = subclassesList.map(s => ({ ...s, type: 'subclass' as const, url: s.url }));
    const all = [...classes, ...subclasses];
    if (!query) return all;
    return all.filter(c => c.name.toLowerCase().includes(query));
  }

  // Selected options - filtered by search query
  get filteredClassSubclass(): ClassSubclassOption[] {
    const query = this.classSubclassSearchQuery().toLowerCase();
    if (!query) return this.classSubclassOptions;
    return this.classSubclassOptions.filter(c => c.name.toLowerCase().includes(query));
  }

  onClassSubclassSearchFocus(): void {
    this.showClassSubclassDropdown.set(true);
  }

  onClassSubclassSearchBlur(): void {
    setTimeout(() => this.showClassSubclassDropdown.set(false), 200);
  }

  onClassSubclassSearchChange(value: string): void {
    this.classSubclassSearchQuery.set(value);
    this.showClassSubclassDropdown.set(true);
  }

  // Check if class/subclass is selected
  isClassSubclassSelected(index: string): boolean {
    const classes = this.formData().classes || [];
    const subclasses = this.formData().subclasses || [];
    return classes.some((c) => c?.['index'] === index) || subclasses.some((s) => s?.['index'] === index);
  }

  // Check if any classes or subclasses are selected
  hasSelectedClasses(): boolean {
    return (this.formData().classes?.length ?? 0) > 0 || (this.formData().subclasses?.length ?? 0) > 0;
  }

  // Get all selected classes and subclasses for display
  getSelectedClasses(): ClassSubclassOption[] {
    const classes = (this.formData().classes || []).map(c => ({ ...c, type: 'class' as const, url: c.url }));
    const subclasses = (this.formData().subclasses || []).map(s => ({ ...s, type: 'subclass' as const, url: s.url }));
    return [...classes, ...subclasses];
  }

  ngOnInit(): void {
    this.dndOptions.loadSchools();
    this.dndOptions.loadClasses();
    this.dndOptions.loadSubclasses();
  }

  onComponentChange(component: string, checked: boolean): void {
    switch (component) {
      case 'V':
        this.hasVerbal.set(checked);
        break;
      case 'S':
        this.hasSomatic.set(checked);
        break;
      case 'M':
        this.hasMaterial.set(checked);
        break;
    }
  }

  buildCastingTime(): string {
    const unit = this.castingTimeUnit();
    const num = this.castingTimeNumber();
    if (unit === 'other') {
      return this.castingTimeOtherText() || 'Special';
    }
    if (num === 1) {
      return this.castingUnits.find(u => u.value === unit)?.label || '';
    }
    return `${num} ${this.castingUnits.find(u => u.value === unit)?.label.replace('1 ', '') || ''}`;
  }

  buildRange(): string {
    const unit = this.rangeUnit();
    const num = this.rangeNumber();

    if (unit === 'self') {
      return 'Self';
    }
    if (unit === 'touch') {
      return 'Touch';
    }

    // AoE range
    if (this.rangeAoE()) {
      const size = this.rangeAoESize();
      const type = this.rangeAoEType();
      return `${size} foot ${type}`;
    }

    return `${num} feet`;
  }

  buildDuration(): string {
    const unit = this.durationUnit();
    const num = this.durationNumber();

    if (unit === 'instantaneous') {
      return 'Instantaneous';
    }

    if (unit === 'up_to') {
      return `Up to ${this.durationUpToMinutes()} minutes`;
    }

    if (num === 1) {
      return unit.charAt(0).toUpperCase() + unit.slice(1);
    }
    return `${num} ${unit}`;
  }

  toggleClass(cls: DndClass): void {
    const currentClasses = this.formData().classes || [];
    const exists = currentClasses.some((c) => c?.['index'] === cls.index);

    if (exists) {
      this.formData.update((d) => ({
        ...d,
        classes: currentClasses.filter((c) => c?.['index'] !== cls.index),
      }));
    } else {
      this.formData.update((d) => ({
        ...d,
        classes: [
          ...currentClasses,
          {
            index: cls.index,
            name: cls.name,
            url: cls.url,
          },
        ],
      }));
    }
  }

  isClassSelected(index: string): boolean {
    return this.formData().classes?.some((c) => c?.['index'] === index) ?? false;
  }

  // Combined class/subclass toggle
  toggleClassSubclass(option: ClassSubclassOption): void {
    const currentClasses = this.formData().classes || [];
    const currentSubclasses = this.formData().subclasses || [];

    if (option.type === 'class') {
      const exists = currentClasses.some((c) => c?.['index'] === option.index);
      if (exists) {
        this.formData.update((d) => ({
          ...d,
          classes: currentClasses.filter((c) => c?.['index'] !== option.index),
        }));
      } else {
        this.formData.update((d) => ({
          ...d,
          classes: [
            ...currentClasses,
            { index: option.index, name: option.name, url: option.url },
          ],
        }));
      }
    } else {
      const exists = currentSubclasses.some((s) => s?.['index'] === option.index);
      if (exists) {
        this.formData.update((d) => ({
          ...d,
          subclasses: currentSubclasses.filter((s) => s?.['index'] !== option.index),
        }));
      } else {
        this.formData.update((d) => ({
          ...d,
          subclasses: [
            ...currentSubclasses,
            { index: option.index, name: option.name, url: option.url },
          ],
        }));
      }
    }
  }

  // Damage type methods
  toggleHasDamage(): void {
    this.hasDamage.set(!this.hasDamage());
    if (!this.hasDamage()) {
      this.selectedDamageTypes.set([]);
      this.formData.update(d => ({ ...d, damage: {} }));
    }
  }

  toggleDamageType(damageTypeIndex: string): void {
    const current = this.selectedDamageTypes();
    if (current.includes(damageTypeIndex)) {
      this.selectedDamageTypes.set(current.filter(t => t !== damageTypeIndex));
    } else {
      this.selectedDamageTypes.set([...current, damageTypeIndex]);
    }
  }

  isDamageTypeSelected(index: string): boolean {
    return this.selectedDamageTypes().includes(index);
  }

  updateDcAbility(index: string): void {
    this.formData.update(d => ({
      ...d,
      dc: { ...d.dc, dc_type: { index, name: index, url: '/api/2014/ability-scores/' + index } }
    }));
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Build components array
      const components: string[] = [];
      if (this.hasVerbal()) components.push('V');
      if (this.hasSomatic()) components.push('S');
      if (this.hasMaterial()) components.push('M');

      // Build school reference
      const schoolIndex = this.formData().school?.['index'] || '';
      const schoolName = this.schools.find((s) => s.index === schoolIndex)?.name || schoolIndex;

      // Build classes references
      const classes = (this.formData().classes || [])
        .filter((c) => c && c['index'])
        .map((c) => ({
          index: c!['index'],
          name: c!['name'] || c!['index'],
          url: c!['url'] || `/api/2014/classes/${c!['index']}`,
        }));

      // Build subclasses references
      const subclasses = (this.formData().subclasses || [])
        .filter((s) => s && s['index'])
        .map((s) => ({
          index: s!['index'],
          name: s!['name'] || s!['index'],
          url: s!['url'] || `/api/2014/subclasses/${s!['index']}`,
        }));

      // Build damage object with multiple types
      let damageObj = {};
      if (this.hasDamage() && this.selectedDamageTypes().length > 0) {
        // Use first type as primary, can store multiple if needed
        const firstType = this.selectedDamageTypes()[0];
        damageObj = {
          damage_type: {
            index: firstType,
            name: firstType,
            url: `/api/2014/damage-types/${firstType}`,
          },
        };
        // Store all types in a separate field if needed, for now just the primary
      }

      // Build dc object
      const dcObj = this.formData().dc || {};

      const data: Partial<Spell> = {
        ...this.formData(),
        casting_time: this.buildCastingTime(),
        range: this.buildRange(),
        duration: this.buildDuration(),
        components,
        school: {
          index: schoolIndex,
          name: schoolName,
          url: `/api/2014/magic-schools/${schoolIndex}`,
        },
        classes,
        subclasses,
        damage: this.hasDamage() ? damageObj : undefined,
        dc: Object.keys(dcObj).length > 0 ? dcObj : undefined,
      };

      await this.spellsService.create(data);

      this.router.navigate(['/manual'], {
        queryParams: { section: 'spells' },
      });
    } catch (err) {
      console.error('Error creating spell:', err);
      this.error.set('Error creating spell. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/manual'], {
      queryParams: { section: 'spells' },
    });
  }
}
