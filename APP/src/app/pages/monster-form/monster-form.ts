import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Monster, MonsterAction, MonsterAbility, SpellcastingInfo, SpellInfo, MonsterProficiency } from '../../interfaces/monster';
import { MonstersService } from '../../services/monsters-service';
import {
  DndOptionsService,
  DndAlignment,
} from '../../services/dnd-options-service';
import { VikingCheck } from '../../components/viking-check/viking-check';

type HitDie = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
type SpeedType = 'walk' | 'burrow' | 'climb' | 'fly' | 'swim';

@Component({
  selector: 'app-monster-form',
  standalone: true,
  imports: [CommonModule, FormsModule, VikingCheck],
  templateUrl: './monster-form.html',
  styleUrl: './monster-form.css',
})
export class MonsterForm implements OnInit {
  private readonly monstersService = inject(MonstersService);
  private readonly dndOptions = inject(DndOptionsService);
  private readonly router = inject(Router);

  isEditMode = signal(false);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Sizes available
  readonly sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

  // Hit dice options
  readonly hitDice: HitDie[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

  // Speed types
  readonly speedTypes: { value: SpeedType; label: string }[] = [
    { value: 'walk', label: 'Walking' },
    { value: 'burrow', label: 'Burrowing' },
    { value: 'climb', label: 'Climbing' },
    { value: 'fly', label: 'Flying' },
    { value: 'swim', label: 'Swimming' },
  ];

  // Form data
  formData = signal<Partial<Monster>>({
    name: '',
    size: 'Medium',
    type: '',
    subtype: '',
    alignment: '',
    desc: '',
    hit_points: 0,
    hit_dice: '1d8',
    speed: { walk: '30 ft.' },
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    challenge_rating: 0,
    damage_vulnerabilities: [],
    damage_resistances: [],
    damage_immunities: [],
    condition_immunities: [],
    languages: '',
    special_abilities: [],
    actions: [],
    reactions: [],
    legendary_actions: [],
  });

  // Hit dice selection
  hitDiceCount = signal(1);

  // Speed entries
  speedEntries = signal<{ type: SpeedType; value: string }[]>([
    { type: 'walk', value: '30 ft.' }
  ]);

  // Actions management
  specialAbilities = signal<MonsterAbility[]>([]);
  actions = signal<MonsterAction[]>([]);
  reactions = signal<MonsterAction[]>([]);
  legendaryActions = signal<MonsterAction[]>([]);

  // Spellcasting
  hasSpellcasting = signal(false);
  spellcastingInfo = signal<SpellcastingInfo>({
    level: 0,
    ability: { index: 'int', name: 'INT', url: '/api/2014/ability-scores/int' },
    dc: 0,
    modifier: 0,
    components_required: [],
    school: { index: '', name: '', url: '' },
    slots: {},
    spells: [],
  });

  // Proficiencies
  selectedProficiencies = signal<{ index: string; bonus: number }[]>([]);

  // Available alignments
  get alignments(): DndAlignment[] {
    return this.dndOptions.alignments();
  }

  // Ability score modifiers
  getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  getModifierString(score: number): string {
    const mod = this.getModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  ngOnInit(): void {
    this.dndOptions.loadAlignments();
  }

  // Hit dice methods
  updateHitDiceCount(count: number): void {
    if (count < 1) count = 1;
    if (count > 100) count = 100;
    this.hitDiceCount.set(count);
    this.updateHitDiceString();
  }

  updateHitDiceDie(die: HitDie): void {
    this.formData.update(d => ({ ...d, hit_dice: `${this.hitDiceCount()}${die}` }));
  }

  private updateHitDiceString(): void {
    const currentDie = this.formData().hit_dice?.replace(/^\d+/, '') || 'd8';
    this.formData.update(d => ({ ...d, hit_dice: `${this.hitDiceCount()}${currentDie}` }));
  }

  // Speed methods
  addSpeedType(): void {
    this.speedEntries.update(entries => [...entries, { type: 'walk', value: '30 ft.' }]);
  }

  removeSpeedType(index: number): void {
    this.speedEntries.update(entries => entries.filter((_, i) => i !== index));
    this.updateSpeedObject();
  }

  updateSpeedType(index: number, type: SpeedType): void {
    this.speedEntries.update(entries => {
      const newEntries = [...entries];
      newEntries[index] = { ...newEntries[index], type };
      return newEntries;
    });
    this.updateSpeedObject();
  }

  updateSpeedValue(index: number, value: string): void {
    this.speedEntries.update(entries => {
      const newEntries = [...entries];
      newEntries[index] = { ...newEntries[index], value };
      return newEntries;
    });
    this.updateSpeedObject();
  }

  private updateSpeedObject(): void {
    const speedObj: Record<string, string> = {};
    this.speedEntries().forEach(entry => {
      if (entry.value) {
        speedObj[entry.type] = entry.value;
      }
    });
    this.formData.update(d => ({ ...d, speed: speedObj }));
  }

  // Action management
  addAbility(): void {
    this.specialAbilities.update(abilities => [...abilities, { name: '', desc: '' }]);
  }

  removeAbility(index: number): void {
    this.specialAbilities.update(abilities => abilities.filter((_, i) => i !== index));
  }

  updateAbility(index: number, field: 'name' | 'desc', value: string): void {
    this.specialAbilities.update(abilities => {
      const newAbilities = [...abilities];
      newAbilities[index] = { ...newAbilities[index], [field]: value };
      return newAbilities;
    });
  }

  addAction(type: 'actions' | 'reactions' | 'legendary_actions'): void {
    const signalMap = {
      actions: this.actions,
      reactions: this.reactions,
      legendary_actions: this.legendaryActions
    };
    signalMap[type].update(items => [...items, { name: '', desc: '' }]);
  }

  removeAction(type: 'actions' | 'reactions' | 'legendary_actions', index: number): void {
    const signalMap = {
      actions: this.actions,
      reactions: this.reactions,
      legendary_actions: this.legendaryActions
    };
    signalMap[type].update(items => items.filter((_, i) => i !== index));
  }

  updateAction(type: 'actions' | 'reactions' | 'legendary_actions', index: number, field: 'name' | 'desc', value: string): void {
    const signalMap = {
      actions: this.actions,
      reactions: this.reactions,
      legendary_actions: this.legendaryActions
    };
    signalMap[type].update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  }

  // Spellcasting methods
  toggleSpellcasting(): void {
    this.hasSpellcasting.set(!this.hasSpellcasting());
  }

  updateSpellcastingLevel(level: number): void {
    this.spellcastingInfo.update(info => ({ ...info, level }));
  }

  addSpell(): void {
    this.spellcastingInfo.update(info => ({
      ...info,
      spells: [...info.spells, { name: '', level: 0, url: '' }]
    }));
  }

  removeSpell(index: number): void {
    this.spellcastingInfo.update(info => ({
      ...info,
      spells: info.spells.filter((_, i) => i !== index)
    }));
  }

  updateSpell(index: number, field: keyof SpellInfo, value: any): void {
    this.spellcastingInfo.update(info => {
      const newSpells = [...info.spells];
      newSpells[index] = { ...newSpells[index], [field]: value };
      return { ...info, spells: newSpells };
    });
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      let specialAbilities = [...this.specialAbilities()];

      // Add spellcasting if enabled
      if (this.hasSpellcasting()) {
        const spellInfo = this.spellcastingInfo();
        if (spellInfo.level > 0) {
          specialAbilities.push({
            name: 'Spellcasting',
            desc: `The monster is a ${spellInfo.level}th-level spellcaster. Its spellcasting ability is ${spellInfo.ability.name} (spell save DC ${spellInfo.dc}, +${spellInfo.modifier} to hit with spell attacks).`,
            spellcasting: spellInfo
          });
        }
      }

      const data: Partial<Monster> = {
        ...this.formData(),
        special_abilities: specialAbilities,
        actions: this.actions(),
        reactions: this.reactions(),
        legendary_actions: this.legendaryActions(),
      };

      await this.monstersService.create(data);

      // Navigate back to monsters list
      this.router.navigate(['/manual'], {
        queryParams: { section: 'monsters' },
      });
    } catch (err) {
      console.error('Error creating monster:', err);
      this.error.set('Error creating monster. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/manual'], {
      queryParams: { section: 'monsters' },
    });
  }
}