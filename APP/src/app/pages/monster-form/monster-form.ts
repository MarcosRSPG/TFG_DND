import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Monster, MonsterAction, MonsterAbility, SpellcastingInfo, SpellInfo, MonsterProficiency, MonsterDamage, ResourceReference } from '../../interfaces/monster';
import { Spell } from '../../interfaces/spell';
import { MonstersService } from '../../services/monsters-service';
import {
  DndOptionsService,
  DndAlignment,
  DndProficiency,
} from '../../services/dnd-options-service';
import { VikingCheck } from '../../components/viking-check/viking-check';
import { SpellsService } from '../../services/spells-service';

type HitDie = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
type SpeedType = 'walk' | 'burrow' | 'climb' | 'fly' | 'swim';

interface DamageTypeOption {
  index: string;
  name: string;
}

interface SpellSlotEntry {
  level: number;
  slots: number;
}

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
  private readonly spellsService = inject(SpellsService);
  private readonly http = inject(HttpClient);
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

  // Challenge rating options (fractions and integers)
  readonly challengeRatings = [
    '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'
  ];

  // Damage types from D&D API
  readonly damageTypes: DamageTypeOption[] = [
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

  // Ability scores for spellcasting
  readonly abilityScores = [
    { index: 'str', name: 'STR' },
    { index: 'dex', name: 'DEX' },
    { index: 'con', name: 'CON' },
    { index: 'int', name: 'INT' },
    { index: 'wis', name: 'WIS' },
    { index: 'cha', name: 'CHA' },
  ];

  // Form data
  formData = signal<Partial<Monster>>({
    name: '',
    size: 'Medium',
    type: '',
    subtype: 'any race',
    alignment: '',
    desc: '',
    hit_points: undefined,
    hit_dice: '1d8',
    hit_points_roll: '',
    speed: { walk: 30 },
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    challenge_rating: '1',
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

  // Languages management
  languageFilter = signal('');
  showLanguageDropdown = signal(false);
  selectedLanguages = signal<{ index: string; name: string }[]>([]);

  // Hit dice selection
  hitDiceCount = signal(1);

  // Speed entries (numeric now)
  speedEntries = signal<{ type: SpeedType; value: number }[]>([
    { type: 'walk', value: 30 }
  ]);

  // Actions management
  specialAbilities = signal<MonsterAbility[]>([]);
  actions = signal<MonsterAction[]>([]);
  reactions = signal<MonsterAction[]>([]);
  legendaryActions = signal<MonsterAction[]>([]);

  // Spellcasting toggle
  hasSpellcasting = signal(false);

  // Spellcasting details
  spellcastingAbility = signal('int');
  spellcastingBonus = signal(2);
  spellcastingDC = signal(10);
  spellcastingModifier = signal(0);
  spellSlots = signal<SpellSlotEntry[]>([
    { level: 1, slots: 0 },
    { level: 2, slots: 0 },
    { level: 3, slots: 0 },
    { level: 4, slots: 0 },
    { level: 5, slots: 0 },
    { level: 6, slots: 0 },
    { level: 7, slots: 0 },
    { level: 8, slots: 0 },
    { level: 9, slots: 0 },
  ]);
  selectedSpells = signal<{
    name: string;
    level: number;
    url: string;
    castingTime?: string;
    range?: string;
    components?: string;
    duration?: string;
  }[]>([]);
  searchQuery = signal('');
  showSpellDropdown = signal(false);

  // Alignment search
  alignmentSearchQuery = signal('');
  showAlignmentDropdown = signal(false);

  // Filtered alignments based on search
  get filteredAlignments(): DndAlignment[] {
    const query = this.alignmentSearchQuery().toLowerCase();
    const all = this.alignments;
    if (!query) return all;
    return all.filter(a => a.name.toLowerCase().includes(query));
  }

  // Select alignment
  selectAlignment(name: string): void {
    this.formData.update(d => ({ ...d, alignment: name }));
    this.alignmentSearchQuery.set('');
  }

  onAlignmentFocus(): void {
    this.showAlignmentDropdown.set(true);
  }

  onAlignmentBlur(): void {
    setTimeout(() => this.showAlignmentDropdown.set(false), 200);
  }

  onAlignmentChange(value: string): void {
    this.alignmentSearchQuery.set(value);
    this.showAlignmentDropdown.set(true);
  }

  // Proficiencies
  proficiencySearchQuery = signal('');
  selectedProficiencies = signal<{ index: string; bonus: number }[]>([]);

  // All spells for selection
  allSpells = signal<Spell[]>([]);

  // Available alignments
  get alignments(): DndAlignment[] {
    return this.dndOptions.alignments();
  }

  // Filtered spells based on search
  get filteredSpells(): Spell[] {
    const query = this.searchQuery().toLowerCase();
    const spells = this.allSpells();
    if (!query) return spells;
    return spells.filter(s => s.name.toLowerCase().includes(query));
  }

  onSpellFocus(): void {
    this.showSpellDropdown.set(true);
  }

  onSpellBlur(): void {
    setTimeout(() => this.showSpellDropdown.set(false), 200);
  }

  onSpellChange(value: string): void {
    this.searchQuery.set(value);
    this.showSpellDropdown.set(true);
  }

  // Current alignment description - FIX: Use optional chaining properly
  getAlignmentDesc(name: string): string {
    const alignment = this.alignments.find(a => a.name === name);
    return alignment?.desc || '';
  }

  // Ability score modifiers
  getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  getModifierString(score: number): string {
    const mod = this.getModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  // Get current ability score for spellcasting
  getAbilityScore(): number {
    const ability = this.abilityScores.find(a => a.index === this.spellcastingAbility());
    if (!ability) return 10;

    // Map index to formData property name
    const abilityMap: Record<string, keyof Monster> = {
      'str': 'strength',
      'dex': 'dexterity',
      'con': 'constitution',
      'int': 'intelligence',
      'wis': 'wisdom',
      'cha': 'charisma',
    };

    const property = abilityMap[ability.index];
    if (!property) return 10;

    const score = this.formData()[property] ?? 10;
    return score;
  }

  // Computed spell stats
  computedSpellDC = computed(() => {
    const abilityScore = this.getAbilityScore();
    const abilityMod = this.getModifier(abilityScore);
    const bonus = this.spellcastingBonus();
    return 10 + abilityMod + bonus;
  });

  computedSpellModifier = computed(() => {
    const abilityScore = this.getAbilityScore();
    const abilityMod = this.getModifier(abilityScore);
    const bonus = this.spellcastingBonus();
    return abilityMod + bonus;
  });

  // Handlers for spellcasting changes
  onSpellcastingAbilityChange(value: string): void {
    this.spellcastingAbility.set(value);
    this.recalculateSpellStats();
  }

  onSpellBonusChange(value: number): void {
    this.spellcastingBonus.set(value);
    this.recalculateSpellStats();
  }

  onSpellDCChange(value: number): void {
    this.spellcastingDC.set(value);
  }

  onSpellModifierChange(value: number): void {
    this.spellcastingModifier.set(value);
  }

  private recalculateSpellStats(): void {
    const dc = this.computedSpellDC();
    const modifier = this.computedSpellModifier();
    this.spellcastingDC.set(dc);
    this.spellcastingModifier.set(modifier);
  }

  updateAbilityScore(ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', value: number): void {
    this.formData.update(d => ({ ...d, [ability]: value }));
    this.recalculateSpellStats();
  }

  ngOnInit(): void {
    this.dndOptions.loadAlignments();
    this.dndOptions.loadProficiencies();
    this.dndOptions.loadLanguages();
    this.loadAllSpells();
    this.recalculateSpellStats();
  }

  // Get filtered languages
  get filteredLanguages() {
    const query = this.languageFilter().toLowerCase();
    const langs = this.dndOptions.languages();
    if (!query) return langs;
    return langs.filter(l => l.name.toLowerCase().includes(query));
  }

  addLanguage(lang: { index: string; name: string }): void {
    if (!this.selectedLanguages().find(l => l.index === lang.index)) {
      this.selectedLanguages.update(list => [...list, lang]);
    }
    this.languageFilter.set('');
  }

  removeLanguage(index: number): void {
    this.selectedLanguages.update(list => list.filter((_, i) => i !== index));
  }

  onLanguageFocus(): void {
    this.showLanguageDropdown.set(true);
  }

  onLanguageBlur(): void {
    setTimeout(() => this.showLanguageDropdown.set(false), 200);
  }

  onLanguageChange(value: string): void {
    this.languageFilter.set(value);
    this.showLanguageDropdown.set(true);
  }

  async loadAllSpells(): Promise<void> {
    try {
      // Try to load from backend first
      try {
        const spells = await this.spellsService.getAll();
        if (spells.length > 0) {
          this.allSpells.set(spells);
          return;
        }
      } catch (backendError) {
        console.warn('Backend not available:', backendError);
      }

      // Fallback: load basic spell list from D&D 5e API (without details)
      // This works for filtering by name
      const response = await firstValueFrom(
        this.http.get<{ results: { index: string; name: string; url: string }[] }>(
          'https://www.dnd5eapi.co/api/2014/spells'
        )
      );

      // Create spells with just name and level (estimated from index)
      // This allows filtering without needing detailed API calls
      const spells: Spell[] = response.results.map((s) => ({
        name: s.name,
        desc: [],
        range: 'Self',
        components: [],
        ritual: false,
        duration: 'Instantaneous',
        concentration: false,
        casting_time: '1 action',
        level: this.estimateSpellLevel(s.name),
      }));

      this.allSpells.set(spells);
    } catch (err) {
      console.error('Error loading spells:', err);
    }
  }

  private estimateSpellLevel(spellName: string): number {
    // Common cantrips (level 0)
    const cantrips = ['fire-bolt', 'light', 'ray-of-frost', 'sacred-flame', 'poison-spray', 'produce-flame', 
                      'fire-ray', 'shocking-grasp', 'frost-bite', 'mind-sliver', 'blade-ward', 'bone-rattling',
                      'dancing-lights', 'message', 'minor-illusion', 'prestidigitation', 'true-strike', 'vicious-mockery'];
    if (cantrips.includes(spellName.toLowerCase().replace(/ /g, '-'))) {
      return 0;
    }
    // For named spells with level, estimate based on common patterns
    const levelMatch = spellName.match(/\d+(st|nd|rd|th)/i);
    if (levelMatch) {
      return parseInt(levelMatch[0]);
    }
    return 1; // Default to level 1
  }

  // Spellcasting methods
  toggleSpellcasting(): void {
    this.hasSpellcasting.set(!this.hasSpellcasting());
  }

  updateSpellSlot(level: number, slots: number): void {
    this.spellSlots.update((current: SpellSlotEntry[]) => {
      const updated = [...current];
      const idx = updated.findIndex(s => s.level === level);
      if (idx >= 0) {
        updated[idx] = { level, slots };
      }
      return updated;
    });
    // Recalculate bonus based on highest spell level with slots
    this.recalculateBonus();
  }

  private recalculateBonus(): void {
    let highestSpellLevel = 0;
    for (let i = 9; i >= 1; i--) {
      const slot = this.spellSlots().find(s => s.level === i);
      if (slot && slot.slots > 0) {
        highestSpellLevel = i;
        break;
      }
    }
    // Proficiency bonus table based on character/s monster level
    // Using spell slot level as approximation: slots 1-4 → +2, 5-8 → +3, 9+ → +4
    let bonus = 2;
    if (highestSpellLevel >= 5) bonus = 3;
    if (highestSpellLevel >= 9) bonus = 4;
    this.spellcastingBonus.set(bonus);
  }

  addSpellToKnown(spell: Spell): void {
    const current = this.selectedSpells();
    const exists = current.find(s => s.name === spell.name);
    if (!exists) {
      // Add with basic info first
      const newSpell = {
        name: spell.name,
        level: spell.level,
        url: `/api/2014/spells/${spell.name.toLowerCase().replace(/ /g, '-')}`,
      };

      this.selectedSpells.set([...current, newSpell]);
      this.searchQuery.set(''); // Clear search after adding

      // Then fetch full details from D&D API
      this.loadSpellDetails(spell.name);
    }
  }

  private async loadSpellDetails(spellName: string): Promise<void> {
    try {
      const index = spellName.toLowerCase().replace(/ /g, '-');
      const detail = await firstValueFrom(
        this.http.get<any>(`https://www.dnd5eapi.co/api/2014/spells/${index}`)
      );

      // Update the spell with full details
      this.selectedSpells.update(spells => {
        const idx = spells.findIndex(s => s.name === spellName);
        if (idx >= 0) {
          const updated = [...spells];
          updated[idx] = {
            ...updated[idx],
            castingTime: detail.casting_time || '1 action',
            range: detail.range || 'Self',
            components: detail.components?.join(', ') || '',
            duration: detail.concentration
              ? `Concentration, ${detail.duration}`
              : detail.duration || 'Instantaneous',
          };
          return updated;
        }
        return spells;
      });
    } catch (err) {
      console.warn('Could not load spell details:', err);
    }
  }

  removeSpellFromKnown(index: number): void {
    this.selectedSpells.update(spells => spells.filter((_, i) => i !== index));
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
    this.speedEntries.update(entries => [...entries, { type: 'walk', value: 30 }]);
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

  updateSpeedValue(index: number, value: number): void {
    this.speedEntries.update(entries => {
      const newEntries = [...entries];
      newEntries[index] = { ...newEntries[index], value };
      return newEntries;
    });
    this.updateSpeedObject();
  }

  private updateSpeedObject(): void {
    const speedObj: Record<string, number> = {};
    this.speedEntries().forEach(entry => {
      if (entry.value) {
        speedObj[entry.type] = entry.value;
      }
    });
    this.formData.update(d => ({ ...d, speed: speedObj }));
  }

  // Proficiency methods
  addProficiency(index: string): void {
    const current = this.selectedProficiencies();
    const exists = current.find(p => p.index === index);
    if (!exists && index) {
      this.selectedProficiencies.set([...current, { index, bonus: 0 }]);
    }
  }

  removeProficiency(index: number): void {
    this.selectedProficiencies.update(profs => profs.filter((_, i) => i !== index));
  }

  updateProficiencyBonus(index: number, bonus: number): void {
    this.selectedProficiencies.update(profs => {
      const newProfs = [...profs];
      newProfs[index] = { ...newProfs[index], bonus };
      return newProfs;
    });
  }

  // Proficiency selection using string array for damage vulnerabilities/resistances/immunities
  damageVulnerabilitiesList = signal<string[]>([]);
  damageResistancesList = signal<string[]>([]);
  damageImmunitiesList = signal<string[]>([]);

  addDamageEntry(type: 'vulnerabilities' | 'resistances' | 'immunities', value: string): void {
    const signalMap = {
      vulnerabilities: this.damageVulnerabilitiesList,
      resistances: this.damageResistancesList,
      immunities: this.damageImmunitiesList,
    };
    signalMap[type].update(list => {
      if (value && !list.includes(value)) {
        return [...list, value];
      }
      return list;
    });
  }

  removeDamageEntry(type: 'vulnerabilities' | 'resistances' | 'immunities', index: number): void {
    const signalMap = {
      vulnerabilities: this.damageVulnerabilitiesList,
      resistances: this.damageResistancesList,
      immunities: this.damageImmunitiesList,
    };
    signalMap[type].update(list => list.filter((_, i) => i !== index));
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

  // Add damage to an action
  addDamageToAction(type: 'actions' | 'reactions' | 'legendary_actions', actionIndex: number): void {
    const signalMap = {
      actions: this.actions,
      reactions: this.reactions,
      legendary_actions: this.legendaryActions
    };
    signalMap[type].update(items => {
      const newItems = [...items];
      const action = newItems[actionIndex];
      const currentDamage = action.damage || [];
      newItems[actionIndex] = {
        ...action,
        damage: [...currentDamage, { damage_type: { index: '', name: '', url: '' }, damage_dice: '1d4' }]
      };
      return newItems;
    });
  }

  updateActionDamage(type: 'actions' | 'reactions' | 'legendary_actions', actionIndex: number, damageIndex: number, field: keyof MonsterDamage, value: any): void {
    const signalMap = {
      actions: this.actions,
      reactions: this.reactions,
      legendary_actions: this.legendaryActions
    };
    signalMap[type].update(items => {
      const newItems = [...items];
      const action = newItems[actionIndex];
      const currentDamage = [...(action.damage || [])];
      currentDamage[damageIndex] = { ...currentDamage[damageIndex], [field]: value };
      newItems[actionIndex] = { ...action, damage: currentDamage };
      return newItems;
    });
  }

  removeActionDamage(type: 'actions' | 'reactions' | 'legendary_actions', actionIndex: number, damageIndex: number): void {
    const signalMap = {
      actions: this.actions,
      reactions: this.reactions,
      legendary_actions: this.legendaryActions
    };
    signalMap[type].update(items => {
      const newItems = [...items];
      const action = newItems[actionIndex];
      const currentDamage = (action.damage || []).filter((_, i) => i !== damageIndex);
      newItems[actionIndex] = { ...action, damage: currentDamage };
      return newItems;
    });
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      let specialAbilities = [...this.specialAbilities()];

      // Build spellcasting data
      let spellcastingData: SpellcastingInfo | null = null;

      if (this.hasSpellcasting()) {
        const ability = this.abilityScores.find(a => a.index === this.spellcastingAbility())!;
        const abilityScore = this.formData()[ability.index.toLowerCase() as keyof Omit<Monster, 'id' | 'name' | 'desc' | 'size' | 'type' | 'subtype' | 'alignment' | 'armor_class' | 'hit_points' | 'hit_dice' | 'hit_points_roll' | 'speed' | 'senses' | 'languages' | 'challenge_rating' | 'proficiency_bonus' | 'xp' | 'special_abilities' | 'actions' | 'reactions' | 'legendary_actions' | 'forms' | 'image' | 'created_by' | 'created_at' | 'updated_at'>] as number ?? 10;
        const abilityMod = this.getModifier(abilityScore);
        const bonus = this.spellcastingBonus();

        // Calculate spell level based on slots
        let spellLevel = 0;
        for (let i = 9; i >= 1; i--) {
          const slot = this.spellSlots().find(s => s.level === i);
          if (slot && slot.slots > 0) {
            spellLevel = i;
            break;
          }
        }

        // Build slots object
        const slots: Record<string, number> = {};
        this.spellSlots().forEach((s: SpellSlotEntry) => {
          if (s.slots > 0) {
            slots[s.level.toString()] = s.slots;
          }
        });

        spellcastingData = {
          level: spellLevel,
          ability: { index: ability.index, name: ability.name, url: `/api/2014/ability-scores/${ability.index}` },
          dc: this.spellcastingDC(),
          modifier: this.spellcastingModifier(),
          components_required: [],
          school: { index: 'evocation', name: 'Evocation', url: '/api/2014/magic-schools/evocation' },
          slots,
          spells: this.selectedSpells().map(s => ({ name: s.name, level: s.level, url: s.url })),
        };
      }

      // Build proficiencies array
      const proficiencies = this.selectedProficiencies()
        .filter(p => p.index)
        .map(p => ({
          value: p.bonus,
          proficiency: {
            index: p.index,
            name: p.index,
            url: `/api/2014/proficiencies/${p.index}`
          }
        }));

      const data: Partial<Monster> = {
        ...this.formData(),
        special_abilities: specialAbilities,
        actions: this.actions(),
        reactions: this.reactions(),
        legendary_actions: this.legendaryActions(),
        proficiencies,
        damage_vulnerabilities: this.damageVulnerabilitiesList(),
        damage_resistances: this.damageResistancesList(),
        damage_immunities: this.damageImmunitiesList(),
        languages: this.selectedLanguages().map(l => l.name).join(', '),
      };

      // Add spellcasting to special abilities if enabled
      if (spellcastingData) {
        data.special_abilities?.push({
          name: 'Spellcasting',
          desc: `The monster is a spellcaster. Its spellcasting ability is ${spellcastingData.ability.name} (spell save DC ${spellcastingData.dc}, +${spellcastingData.modifier} to hit with spell attacks).`,
          spellcasting: spellcastingData,
        });
      }

      await this.monstersService.create(data);

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