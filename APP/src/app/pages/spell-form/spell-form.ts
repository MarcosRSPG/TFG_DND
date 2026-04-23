import { Component, inject, OnInit, signal } from '@angular/core';
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
type RangeUnit = 'feet' | 'touch' | 'self' | 'special';
type DurationUnit = 'instantaneous' | 'seconds' | 'minutes' | 'hours' | 'days' | 'special';

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
  });

  // Casting time
  castingTimeNumber = signal<number>(1);
  castingTimeUnit = signal<CastingUnit>('action');

  // Range
  rangeNumber = signal<number>(0);
  rangeUnit = signal<RangeUnit>('feet');

  // Duration
  durationNumber = signal<number>(0);
  durationUnit = signal<DurationUnit>('instantaneous');

  // Component checkboxes
  hasVerbal = signal(false);
  hasSomatic = signal(false);
  hasMaterial = signal(false);

  // Filter for datalist
  classFilter = signal('');

  // Filtered options - for datalist (classes checkboxes still need filtering)
  get filteredClasses(): DndClass[] {
    const query = this.classFilter().toLowerCase();
    if (!query) return this.dndOptions.classes();
    return this.dndOptions.classes().filter(c =>
      c.name.toLowerCase().includes(query) || c.index.toLowerCase().includes(query)
    );
  }

  // Available options - show all for datalist
  get schools(): DndSchool[] {
    return this.dndOptions.schools();
  }

  get classes(): DndClass[] {
    return this.dndOptions.classes();
  }

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
    { value: 'special', label: 'Special' },
  ];

  // Duration units
  durationUnits: { value: DurationUnit; label: string }[] = [
    { value: 'instantaneous', label: 'Instantaneous' },
    { value: 'seconds', label: 'Seconds' },
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' },
    { value: 'special', label: 'Special' },
  ];

  ngOnInit(): void {
    // Load D&D API options
    this.dndOptions.loadSchools();
    this.dndOptions.loadClasses();
  }

  onClassFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.classFilter.set(input.value);
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
      return 'Special';
    }
    const unitLabel = this.castingUnits.find(u => u.value === unit)?.label || '';
    return unitLabel;
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
    if (unit === 'special') {
      return 'Special';
    }
    return `${num} feet`;
  }

  buildDuration(): string {
    const unit = this.durationUnit();
    const num = this.durationNumber();

    if (unit === 'instantaneous' || unit === 'special') {
      return unit.charAt(0).toUpperCase() + unit.slice(1);
    }
    return `${num} ${unit}`;
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
      };

      await this.spellsService.create(data);

      // Navigate back to spells list
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
}