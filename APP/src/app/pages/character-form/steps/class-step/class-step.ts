import { Component, Input, Output, EventEmitter, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterDraft } from '../../../../interfaces/Character';
import { DndClass, ClassChoice } from '../../../../interfaces/class';
import { ClassesService } from '../../../../services/classes-service';

interface ChoiceOption {
  index: string;
  name: string;
}

interface ResolvedChoice {
  desc: string;
  choose: number;
  options: ChoiceOption[];
}

@Component({
  selector: 'app-class-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-step.html',
  styleUrl: './class-step.css',
})
export class ClassStepComponent implements OnInit {
  @Input() draft: CharacterDraft = {};
  @Output() change = new EventEmitter<Partial<CharacterDraft>>();

  private readonly classesService = inject(ClassesService);

  classes = signal<DndClass[]>([]);
  selectedClass = signal<DndClass | null>(null);
  resolvedChoices = signal<ResolvedChoice[]>([]);
  selectedByGroup = signal<string[][]>([]);
  filter = signal('');
  loading = signal(true);

  filteredClasses = computed(() => {
    const q = this.filter().toLowerCase();
    return this.classes().filter(c => c.name.toLowerCase().includes(q));
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.classesService.getClasses((c: DndClass) => {
        this.classes.update(list => [...list, c]);
      });
      if (data?.length) this.classes.set(data);
    } catch {
      // progressive load
    } finally {
      this.loading.set(false);
    }

    if (this.draft.character_class) {
      const existing = this.classes().find(c =>
        (c.index ?? c.id) === this.draft.character_class?.index
      );
      if (existing) this.selectClass(existing);
    }
  }

  async selectClass(cls: DndClass): Promise<void> {
    this.selectedClass.set(cls);
    const resolved = this.resolveChoices(cls.proficiency_choices ?? []);
    this.resolvedChoices.set(resolved);
    this.selectedByGroup.set(resolved.map(() => []));

    let spellSlots: Record<string, { total: number; used: number }> = {};
    let spellcastingAbility = '';

    // Spellcasting ability from class
    const abilityIndex = cls.spellcasting?.spellcasting_ability?.index ?? '';
    const abilityMap: Record<string, string> = {
      int: 'intelligence', wis: 'wisdom', cha: 'charisma',
      str: 'strength', dex: 'dexterity', con: 'constitution',
    };
    spellcastingAbility = abilityMap[abilityIndex.toLowerCase()] ?? '';

    // Spell slots from level 1
    try {
      const levels = await this.classesService.getClassLevels(cls.index ?? cls.id);
      const level1 = levels.find(l => l.level === 1);
      if (level1?.spellcasting) {
        for (const [key, value] of Object.entries(level1.spellcasting)) {
          const match = key.match(/^spell_slots_level_(\d+)$/);
          if (match && typeof value === 'number' && value > 0) {
            spellSlots[match[1]] = { total: value, used: 0 };
          }
        }
      }
    } catch {}

    this.emitChange(cls, [], spellSlots, spellcastingAbility);
  }

  toggleChoice(groupIndex: number, optionIndex: string): void {
    const groups = [...this.selectedByGroup()];
    const group = [...(groups[groupIndex] ?? [])];
    const max = this.resolvedChoices()[groupIndex]?.choose ?? 1;
    const pos = group.indexOf(optionIndex);

    if (pos >= 0) {
      group.splice(pos, 1);
    } else if (group.length < max) {
      group.push(optionIndex);
    }

    groups[groupIndex] = group;
    this.selectedByGroup.set(groups);
    // Preserve spell slots already emitted when class was first selected
    this.emitChange(this.selectedClass()!, groups.flat(),
      this.draft.class_spell_slots ?? {},
      this.draft.class_spellcasting_ability ?? '');
  }

  isSelected(groupIndex: number, optionIndex: string): boolean {
    return this.selectedByGroup()[groupIndex]?.includes(optionIndex) ?? false;
  }

  isDisabled(groupIndex: number, optionIndex: string): boolean {
    const group = this.selectedByGroup()[groupIndex] ?? [];
    const max = this.resolvedChoices()[groupIndex]?.choose ?? 1;
    return !this.isSelected(groupIndex, optionIndex) && group.length >= max;
  }

  savingThrowsLabel(cls: DndClass): string {
    return cls.saving_throws?.map(st => st.name).join(', ') ?? '';
  }

  private emitChange(
    cls: DndClass,
    chosenProfs: string[],
    spellSlots: Record<string, { total: number; used: number }> = {},
    spellcastingAbility = ''
  ): void {
    const classSavingThrows = cls.saving_throws?.map(st => st.name) ?? [];
    const baseProfs = cls.proficiencies?.map(p => p.name) ?? [];

    this.change.emit({
      character_class: { index: cls.index ?? cls.id, name: cls.name, url: cls.url },
      character_class_hit_die: cls.hit_die,
      saving_throw_names: classSavingThrows,
      proficiency_names: [...baseProfs, ...chosenProfs],
      class_spell_slots: spellSlots,
      class_spellcasting_ability: spellcastingAbility,
    });
  }

  private resolveChoices(choices: ClassChoice[]): ResolvedChoice[] {
    return choices.map(choice => {
      const fromAny = choice.from as Record<string, unknown>;
      let options: ChoiceOption[] = [];

      const rawOptions = (fromAny?.['options'] as unknown[]) ?? [];
      options = rawOptions
        .map((opt: unknown) => {
          const o = opt as Record<string, unknown>;
          const item = (o['item'] as Record<string, unknown>) ?? o;
          return { index: String(item['index'] ?? ''), name: String(item['name'] ?? '') };
        })
        .filter(o => o.index);

      return { desc: choice.desc, choose: choice.choose, options };
    });
  }
}
