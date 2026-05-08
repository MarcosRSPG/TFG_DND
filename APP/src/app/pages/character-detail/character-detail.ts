import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Character,
  InventoryItem,
  WeaponData,
  ArmorData,
  Trait,
  SpellEntry,
  StatKey,
  Skill,
  STAT_LABELS,
  STAT_ABBREVIATIONS,
  SKILLS,
  statModifier,
  signedModifier,
} from '../../interfaces/Character';
import { CharactersService } from '../../services/characters-service';
import { ItemsService } from '../../services/items-service';
import { Item } from '../../interfaces/item';
import { SpellsService } from '../../services/spells-service';
import { Spell } from '../../interfaces/spell';
import { ClassesService } from '../../services/classes-service';
import { BackgroundsService } from '../../services/backgrounds-service';
import { RacesService } from '../../services/races-service';
import { environment } from '../../../environments/environment';
import { FeatureDetail, DndClassLevel } from '../../interfaces/class';
import { Subclass } from '../../interfaces/subclass';

type TabKey = 'basic' | 'equipment' | 'spells' | 'traits' | 'bio';
type ItemState = 'equipped' | 'stored' | 'carried';
type AddItemMode = 'search' | 'custom';

type DetailPayload =
  | { kind: 'spell'; entry: SpellEntry; full: Spell | null }
  | { kind: 'inventory'; item: InventoryItem };

@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TitleCasePipe],
  templateUrl: './character-detail.html',
  styleUrl: './character-detail.css',
})
export class CharacterDetail implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly charactersService = inject(CharactersService);
  private readonly itemsService = inject(ItemsService);
  private readonly spellsService = inject(SpellsService);
  private readonly classesService = inject(ClassesService);
  private readonly backgroundsService = inject(BackgroundsService);
  private readonly racesService = inject(RacesService);

  readonly STATS: StatKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  readonly STAT_LABELS = STAT_LABELS;
  readonly STAT_ABBREVIATIONS = STAT_ABBREVIATIONS;
  readonly SKILLS = SKILLS;
  readonly COINS: { key: 'cp'|'sp'|'ep'|'gp'|'pp'; label: string; name: string }[] = [
    { key: 'cp', label: 'CP', name: 'Copper' },
    { key: 'sp', label: 'SP', name: 'Silver' },
    { key: 'ep', label: 'EP', name: 'Electrum' },
    { key: 'gp', label: 'GP', name: 'Gold' },
    { key: 'pp', label: 'PP', name: 'Platinum' },
  ];

  character = signal<Character | null>(null);
  activeTab = signal<TabKey>('basic');
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);

  // Equipment panel
  addItemMode = signal<AddItemMode | null>(null);
  itemSearchQuery = signal('');
  catalogItems = signal<Item[]>([]);
  loadingCatalog = signal(false);

  filteredCatalog = computed(() => {
    const q = this.itemSearchQuery().toLowerCase().trim();
    if (!q) return this.catalogItems();
    return this.catalogItems().filter(i => i.name.toLowerCase().includes(q));
  });

  newItem = signal<Partial<InventoryItem>>({ type: 'item', quantity: 1, state: 'stored' });

  // Spell catalog panel
  showSpellPanel = signal(false);
  spellSearchQuery = signal('');
  onlyClassSpells = signal(true);
  selectedSpellLevels = signal<Set<number>>(new Set());
  catalogSpells = signal<Spell[]>([]);
  loadingSpellCatalog = signal(false);

  readonly ALL_SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  filteredSpellCatalog = computed(() => {
    const q = this.spellSearchQuery().toLowerCase().trim();
    const classIndex = this.character()?.character_class?.index ?? '';
    const levels = this.selectedSpellLevels();

    let spells = this.catalogSpells();

    if (this.onlyClassSpells() && classIndex) {
      spells = spells.filter(s =>
        s.classes?.some(c => c.index === classIndex || c.name.toLowerCase() === classIndex.toLowerCase())
      );
    }
    if (levels.size > 0) {
      spells = spells.filter(s => levels.has(s.level));
    }
    if (q) {
      spells = spells.filter(s => s.name.toLowerCase().includes(q));
    }

    return [...spells].sort((a, b) => a.level - b.level);
  });

  toggleSpellLevel(level: number): void {
    this.selectedSpellLevels.update(set => {
      const next = new Set(set);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  }

  isLevelSelected(level: number): boolean {
    return this.selectedSpellLevels().has(level);
  }

  // Spellcasting computed
  private readonly ABILITY_MAP: Record<string, StatKey> = {
    int: 'intelligence', intelligence: 'intelligence',
    wis: 'wisdom', wisdom: 'wisdom',
    cha: 'charisma', charisma: 'charisma',
    str: 'strength', strength: 'strength',
    dex: 'dexterity', dexterity: 'dexterity',
    con: 'constitution', constitution: 'constitution',
  };

  spellAbilityMod = computed(() => {
    const c = this.character();
    if (!c?.spellcasting?.spellcasting_ability) return 0;
    const key = c.spellcasting.spellcasting_ability.toLowerCase();
    const stat = this.ABILITY_MAP[key];
    if (!stat) return 0;
    return statModifier((c as unknown as Record<string, number>)[stat] ?? 10);
  });

  effectiveDC = computed(() => {
    const c = this.character();
    if (!c) return 0;
    if (c.spellcasting?.spellcasting_ability) {
      return 8 + (c.proficiency_bonus ?? 2) + this.spellAbilityMod();
    }
    return c.spellcasting?.spell_save_dc ?? 0;
  });

  effectiveAttackBonus = computed(() => {
    const c = this.character();
    if (!c) return 0;
    if (c.spellcasting?.spellcasting_ability) {
      return (c.proficiency_bonus ?? 2) + this.spellAbilityMod();
    }
    return c.spellcasting?.spell_attack_bonus ?? 0;
  });

  maxPreparedSpells = computed(() => {
    const c = this.character();
    if (!c) return null;
    if (!c.spellcasting?.spellcasting_ability) return null;
    return Math.max(1, this.spellAbilityMod() + (c.level ?? 1));
  });

  // Traits form
  showTraitForm = signal(false);
  newTrait = signal<Partial<Trait>>({ source: 'custom' });

  // ── Class progression ──────────────────────────────────────────────
  classLevelData = signal<DndClassLevel | null>(null);

  classSpecificEntries = computed((): { key: string; label: string; value: string }[] => {
    const cs = this.classLevelData()?.class_specific;
    if (!cs) return [];
    return Object.entries(cs)
      .filter(([, v]) => v !== null && v !== undefined && v !== 0 && v !== false)
      .map(([key, value]) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: this.formatClassValue(value),
      }));
  });

  private formatClassValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      // Dice notation: { dice_count: 1, dice_value: 6 } → "1d6"
      if ('dice_count' in obj && 'dice_value' in obj) return `${obj['dice_count']}d${obj['dice_value']}`;
      if ('dice_count' in obj) return `${obj['dice_count']} d6`;
      return Object.entries(obj)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(', ');
    }
    return String(value);
  }

  // ── Quick resource trackers (Basic tab) ────────────────────────────
  newTrackerName = signal('');
  newTrackerQty  = signal(1);

  addTracker(): void {
    const name = this.newTrackerName().trim();
    if (!name) return;
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name,
      type: 'item',
      quantity: this.newTrackerQty(),
      state: 'carried',
    };
    this.character.update(c =>
      c ? { ...c, inventory: { ...c.inventory, items: [...c.inventory.items, item] } } : c
    );
    this.newTrackerName.set('');
    this.newTrackerQty.set(1);
    this.saveImmediate();
  }

  updateItemQty(itemId: string, delta: number): void {
    this.character.update(c => {
      if (!c) return c;
      const items = c.inventory.items.map(i =>
        i.id !== itemId ? i : { ...i, quantity: Math.max(0, i.quantity + delta) }
      );
      return { ...c, inventory: { ...c.inventory, items } };
    });
    this.save();
  }

  setItemQty(itemId: string, value: string): void {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0) return;
    this.character.update(c => {
      if (!c) return c;
      const items = c.inventory.items.map(i =>
        i.id !== itemId ? i : { ...i, quantity: n }
      );
      return { ...c, inventory: { ...c.inventory, items } };
    });
    this.save();
  }

  // Traits dinámicos: descripciones de raciales + traits de clase y background
  traitDescriptions = signal<Record<string, string>>({});
  dynamicTraits = signal<Trait[]>([]);

  calculatedAC = computed(() => {
    const c = this.character();
    if (!c) return 10;
    const dexMod = statModifier(c.dexterity);
    const items = c.inventory?.items ?? [];

    const equippedArmor = items.find(
      i => i.type === 'armor' && i.state === 'equipped' && i.armor_data?.armor_type !== 'shield'
    );
    const equippedShield = items.find(
      i => i.type === 'armor' && i.state === 'equipped' && i.armor_data?.armor_type === 'shield'
    );

    let ac = 10 + dexMod;
    if (equippedArmor?.armor_data) {
      const { base_ac, armor_type } = equippedArmor.armor_data;
      if (armor_type === 'light') ac = base_ac + dexMod;
      else if (armor_type === 'medium') ac = base_ac + Math.min(dexMod, 2);
      else if (armor_type === 'heavy') ac = base_ac;
    }
    if (equippedShield) ac += 2;
    return ac;
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Character ID not found.'); this.loading.set(false); return; }
    try {
      const data = await this.charactersService.getCharacter(id);
      this.character.set(data);
      this.loadDynamicTraits(data);
      this.loadClassLevelData(data);   // non-blocking
    } catch {
      this.error.set('Failed to load character.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadClassLevelData(c: Character): Promise<void> {
    const classId = c.character_class?.index;
    const level   = c.level ?? 1;
    if (!classId) return;
    try {
      const levels = await this.classesService.getClassLevels(classId);
      const found  = levels.find(l => l.level === level);
      if (found) this.classLevelData.set(found);
    } catch { /* silencioso */ }
  }

  private loadDynamicTraits(c: Character): void {
    // 1 ── Descripciones de rasgos raciales (almacenados con desc vacía)
    const raceTraits = (c.traits ?? []).filter(
      t => (t.source === 'race' || t.source === 'subrace') && !t.description
    );
    if (raceTraits.length) {
      Promise.all(
        raceTraits.map(t =>
          this.racesService.getTrait(t.id)
            .then(detail => ({ id: t.id, desc: detail.desc?.join('\n\n') ?? '' }))
            .catch(() => ({ id: t.id, desc: '' }))
        )
      ).then(results => {
        const map: Record<string, string> = {};
        results.forEach(r => { if (r.desc) map[r.id] = r.desc; });
        this.traitDescriptions.set(map);
      });
    }

    // 2 ── Features de clase — todos los niveles hasta el nivel del personaje
    const classId = c.character_class?.index;
    const charLevel = c.level ?? 1;
    if (classId) {
      this.classesService.getClassFeatureProgression(classId)
        .then(features => this.mergeDynamicTraits(
          features
            .filter(f => f.level <= charLevel)
            .map(f => ({
              id: f.feature.index,
              name: f.feature.name,
              description: f.feature.desc?.join('\n\n') ?? '',
              source: 'class' as const,
              level: f.level,
            }))
        ))
        .catch(() => {
          // Fallback: solo nivel 1 sin info de nivel
          this.classesService.getLevel1Features(classId)
            .then(fs => this.mergeDynamicTraits(
              fs.map(f => ({ id: f.index, name: f.name, description: f.desc?.join('\n\n') ?? '', source: 'class' as const, level: 1 }))
            ))
            .catch(() => {});
        });
    }

    // 3 ── Feature del trasfondo — ya viene almacenada desde el wizard (source:'background')
    //       Fallback para personajes creados antes del fix: busca en la lista cacheada
    const hasBgTraits = (c.traits ?? []).some(t => t.source === 'background');
    if (!hasBgTraits && c.background) {
      this.backgroundsService.getBackgrounds()
        .then(list => {
          const bg = list.find(b =>
            b.index === c.background!.index ||
            b.name.toLowerCase() === c.background!.name?.toLowerCase()
          );
          if (!bg?.feature?.name) return;
          const traits: Trait[] = [];
          traits.push({ id: `bg-${bg.index}-feature`, name: bg.feature.name, description: bg.feature.desc?.join('\n\n') ?? '', source: 'background' as const });
          if (bg.feature.variant?.name) {
            traits.push({ id: `bg-${bg.index}-variant`, name: bg.feature.variant.name, description: bg.feature.variant.desc?.join('\n\n') ?? '', source: 'background' as const });
          }
          this.mergeDynamicTraits(traits);
        })
        .catch(() => {});
    }
  }

  private mergeDynamicTraits(incoming: Trait[]): void {
    this.dynamicTraits.update(current => {
      const existingIds = new Set(current.map(t => t.id));
      const novel = incoming.filter(t => !existingIds.has(t.id));
      return novel.length ? [...current, ...novel] : current;
    });
  }

  // ── INITIATIVE ──
  initiative = computed(() => {
    const c = this.character();
    if (!c) return 0;
    return statModifier(c.dexterity) + (c.initiative_bonus ?? 0);
  });

  setInitiativeBonus(value: string): void {
    const n = parseInt(value, 10);
    this.character.update(c => c ? { ...c, initiative_bonus: isNaN(n) ? 0 : n } : c);
    this.save();
  }

  // ── Speed ──
  private parseBaseSpeed(): number {
    const raw = this.character()?.speed?.walk ?? '30 ft.';
    const m = String(raw).match(/\d+/);
    return m ? parseInt(m[0]) : 30;
  }

  totalSpeed = computed(() => this.parseBaseSpeed() + (this.character()?.speed_bonus ?? 0));

  setSpeedBonus(value: string): void {
    const n = parseInt(value, 10);
    this.character.update(c => c ? { ...c, speed_bonus: isNaN(n) ? 0 : n } : c);
    this.save();
  }

  // ── AC with bonus ──
  totalAC = computed(() => this.calculatedAC() + (this.character()?.ac_bonus ?? 0));

  setAcBonus(value: string): void {
    const n = parseInt(value, 10);
    this.character.update(c => c ? { ...c, ac_bonus: isNaN(n) ? 0 : n } : c);
    this.save();
  }

  // ── Proficiency bonus with extra ──
  totalProfBonus = computed(() =>
    (this.character()?.proficiency_bonus ?? 2) + (this.character()?.prof_bonus_extra ?? 0)
  );

  setProfBonusExtra(value: string): void {
    const n = parseInt(value, 10);
    this.character.update(c => c ? { ...c, prof_bonus_extra: isNaN(n) ? 0 : n } : c);
    this.save();
  }

  // ── SAVING THROWS ──
  private matchesSavingThrow(saved: string, stat: StatKey): boolean {
    const s = saved.toLowerCase().trim();
    return s === STAT_LABELS[stat].toLowerCase()
      || s === stat.toLowerCase()
      || s === stat.substring(0, 3);
  }

  isSaveProficient(stat: StatKey): boolean {
    return (this.character()?.saving_throws ?? []).some(s => this.matchesSavingThrow(s, stat));
  }

  saveValue(stat: StatKey): number {
    const c = this.character();
    if (!c) return 0;
    const mod = statModifier((c as unknown as Record<string, number>)[stat] ?? 10);
    return mod + (this.isSaveProficient(stat) ? this.totalProfBonus() : 0);
  }

  signedSave(stat: StatKey): string {
    const v = this.saveValue(stat);
    return v >= 0 ? `+${v}` : `${v}`;
  }

  toggleSave(stat: StatKey): void {
    this.character.update(c => {
      if (!c) return c;
      const saves = c.saving_throws ?? [];
      const has = this.isSaveProficient(stat);
      return {
        ...c,
        saving_throws: has
          ? saves.filter(s => !this.matchesSavingThrow(s, stat))
          : [...saves, STAT_LABELS[stat]],
      };
    });
    this.save();
  }

  // ── SKILLS — proficiency / expertise / extra bonus ──
  isSkillExpert(skill: Skill): boolean {
    return this.character()?.skill_expertise?.includes(skill.index) ?? false;
  }

  getSkillState(skill: Skill): 'none' | 'proficient' | 'expert' {
    if (this.isSkillExpert(skill)) return 'expert';
    if (this.isSkillProficient(skill)) return 'proficient';
    return 'none';
  }

  cycleSkillProficiency(skill: Skill): void {
    const state = this.getSkillState(skill);
    this.character.update(c => {
      if (!c) return c;
      if (state === 'none') {
        const already = c.proficiencies.some(p => p.proficiency.index === skill.index);
        return already ? c : {
          ...c,
          proficiencies: [...c.proficiencies, { proficiency: { index: skill.index, name: skill.name } }],
        };
      } else if (state === 'proficient') {
        const expertise = [...(c.skill_expertise ?? [])];
        if (!expertise.includes(skill.index)) expertise.push(skill.index);
        return { ...c, skill_expertise: expertise };
      } else {
        return {
          ...c,
          proficiencies: c.proficiencies.filter(p => p.proficiency.index !== skill.index),
          skill_expertise: (c.skill_expertise ?? []).filter(i => i !== skill.index),
        };
      }
    });
    this.save();
  }

  setSkillBonus(skill: Skill, value: string): void {
    const n = parseInt(value, 10);
    this.character.update(c => {
      if (!c) return c;
      const bonuses = { ...(c.skill_bonuses ?? {}) };
      if (isNaN(n) || n === 0) {
        delete bonuses[skill.index];
      } else {
        bonuses[skill.index] = n;
      }
      return { ...c, skill_bonuses: Object.keys(bonuses).length ? bonuses : undefined };
    });
    this.save();
  }

  // ── XP ──
  readonly XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
                             85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

  xpToNextLevel = computed(() => {
    const c = this.character();
    if (!c || (c.level ?? 1) >= 20) return null;
    return this.XP_THRESHOLDS[c.level ?? 1];
  });

  setExperiencePoints(value: string): void {
    const n = parseInt(value, 10);
    this.character.update(c => c ? { ...c, experience_points: isNaN(n) || n < 0 ? 0 : n } : c);
    this.save();
  }

  // ── HISTORY MODAL ──
  showHistoryModal = signal(false);
  historyDraft = signal('');

  openHistoryModal(): void {
    this.historyDraft.set(this.character()?.history ?? '');
    this.showHistoryModal.set(true);
  }

  saveHistory(): void {
    this.character.update(c => c ? { ...c, history: this.historyDraft() } : c);
    this.save();
    this.showHistoryModal.set(false);
  }

  // ── WEAPON PROPERTIES ──
  readonly WEAPON_PROPERTY_DESCS: Record<string, string> = {
    'Ammunition': 'Requires ammunition to make ranged attacks; recover half after battle.',
    'Finesse': 'Use STR or DEX modifier for attack and damage rolls.',
    'Heavy': 'Small creatures have disadvantage on attack rolls.',
    'Light': 'Usable in two-weapon fighting.',
    'Loading': 'You can fire only one piece of ammunition per turn.',
    'Range': 'Can be used for ranged attacks within its listed range.',
    'Reach': 'Adds 5 ft. to your reach when attacking.',
    'Special': 'Unusual rules govern its use; see the weapon description.',
    'Thrown': 'Throw the weapon to make a ranged attack.',
    'Two-Handed': 'Requires two hands to attack.',
    'Versatile': 'Can be wielded one- or two-handed (two-handed damage shown in parentheses).',
    'Silvered': 'Made of or coated with silver; bypasses resistance for some creatures.',
    'Martial': 'Martial weapon — requires proficiency.',
    'Simple': 'Simple weapon — most classes are proficient.',
  };

  getPropDesc(prop: string): string {
    return this.WEAPON_PROPERTY_DESCS[prop] ?? prop;
  }

  // ── DETAIL PANEL ──
  selectedDetail = signal<DetailPayload | null>(null);
  detailLoading = signal(false);

  openSpellDetail(entry: SpellEntry): void {
    // Open immediately with what we have; load full data in background
    this.selectedDetail.set({ kind: 'spell', entry, full: null });

    const idx = entry.index;
    if (!idx) return;

    // Check already-loaded catalog first (free lookup)
    const cached = this.catalogSpells().find(s => s.index === idx || s.name === entry.name);
    if (cached) {
      this.selectedDetail.set({ kind: 'spell', entry, full: cached });
      return;
    }

    // Fetch from API
    this.detailLoading.set(true);
    this.spellsService.getSpell(idx)
      .then(spell => this.selectedDetail.update(d => d?.kind === 'spell' ? { ...d, full: spell } : d))
      .catch(() => { /* keep entry-only data */ })
      .finally(() => this.detailLoading.set(false));
  }

  openItemDetail(item: InventoryItem): void {
    this.selectedDetail.set({ kind: 'inventory', item });
  }

  closeDetail(): void {
    this.selectedDetail.set(null);
  }

  // ── TAB ──
  setTab(tab: TabKey): void { this.activeTab.set(tab); }

  // ── STATS ──
  finalStat(s: StatKey): number {
    const c = this.character()!;
    return (c as unknown as Record<string, number>)[s] ?? 10;
  }
  signedMod(s: StatKey): string { return signedModifier(this.finalStat(s)); }

  // ── HP ──
  currentHp(): number { return this.character()?.hit_points_current ?? this.character()?.hit_points ?? 0; }
  maxHp(): number { return this.character()?.hit_points ?? 0; }
  tempHp(): number { return this.character()?.temp_hp ?? 0; }

  changeHp(delta: number): void {
    const c = this.character();
    if (!c) return;
    const next = Math.max(0, Math.min(this.maxHp(), this.currentHp() + delta));
    this.character.update(ch => ch ? { ...ch, hit_points_current: next } : ch);
    this.save();
  }

  setTempHp(value: string): void {
    const n = parseInt(value, 10);
    const next = !isNaN(n) && n > 0 ? n : 0;
    this.character.update(c => c ? { ...c, temp_hp: next } : c);
    this.save();
  }

  setMaxHp(value: string): void {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 1) return;
    this.character.update(c => c ? { ...c, hit_points: n, hit_points_current: Math.min(this.currentHp(), n) } : c);
    this.save();
  }

  // ── SKILLS ──
  isSkillProficient(skill: Skill): boolean {
    const c = this.character();
    if (!c) return false;
    return c.proficiencies?.some(p =>
      p.proficiency.index === skill.index ||
      p.proficiency.name?.toLowerCase().includes(skill.name.toLowerCase())
    ) ?? false;
  }

  skillValue(skill: Skill): number {
    const c = this.character()!;
    const abilMod = statModifier((c as unknown as Record<string, number>)[skill.ability] ?? 10);
    const prof  = this.totalProfBonus();
    const state = this.getSkillState(skill);
    const profBonus = state === 'expert' ? prof * 2 : state === 'proficient' ? prof : 0;
    const extra = c.skill_bonuses?.[skill.index] ?? 0;
    return abilMod + profBonus + extra;
  }

  signedSkill(skill: Skill): string {
    const v = this.skillValue(skill);
    return v >= 0 ? `+${v}` : `${v}`;
  }

  // ── COINS ──
  updateCoin(coin: keyof Character['inventory']['cash'], delta: number): void {
    this.character.update(c => {
      if (!c) return c;
      const cash = { ...c.inventory.cash };
      cash[coin] = Math.max(0, (cash[coin] ?? 0) + delta);
      return { ...c, inventory: { ...c.inventory, cash } };
    });
    this.save();
  }

  setCoin(coin: keyof Character['inventory']['cash'], value: string): void {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0) return;
    this.character.update(c => {
      if (!c) return c;
      const cash = { ...c.inventory.cash, [coin]: n };
      return { ...c, inventory: { ...c.inventory, cash } };
    });
    this.save();
  }

  // ── LEVEL UP ──
  readonly SUBCLASS_LEVELS: Record<string, number> = {
    barbarian: 3, bard: 3, cleric: 1, druid: 2, fighter: 3,
    monk: 3, paladin: 3, ranger: 3, rogue: 3, sorcerer: 1,
    warlock: 1, wizard: 2,
  };

  showLevelUpModal = signal(false);
  levelUpLoading   = signal(false);
  levelUpNewLevel  = signal(0);
  levelUpHpGain    = signal(0);
  levelUpHpAvg     = signal(0);
  levelUpHpMax     = signal(0);
  levelUpFeatures  = signal<FeatureDetail[]>([]);
  levelUpNewProfBonus  = signal(2);
  levelUpSlotMap   = signal<Record<string, number>>({});   // full slot totals at new level
  levelUpSubclassRequired  = signal(false);
  levelUpSubclasses        = signal<Subclass[]>([]);
  levelUpSelectedSubclass  = signal<Subclass | null>(null);

  /** Computed: only the slot levels whose total actually increased */
  slotChanges = computed(() => {
    const c = this.character();
    if (!c) return [];
    const cur = c.spellcasting?.spell_slots ?? {};
    return Object.entries(this.levelUpSlotMap())
      .map(([lvl, newTotal]) => {
        const ex = cur[lvl];
        const oldTotal = typeof ex === 'object' ? (ex as { total: number }).total : ((ex as number) ?? 0);
        return { level: lvl, old: oldTotal, new: newTotal };
      })
      .filter(e => e.new > e.old);
  });

  async openLevelUpModal(): Promise<void> {
    const c = this.character();
    if (!c) return;
    const currentLevel = c.level ?? 1;
    const newLevel = currentLevel + 1;
    if (newLevel > 20) return;

    this.levelUpNewLevel.set(newLevel);
    this.levelUpLoading.set(true);
    this.showLevelUpModal.set(true);
    this.levelUpFeatures.set([]);
    this.levelUpSlotMap.set({});
    this.levelUpSubclassRequired.set(false);
    this.levelUpSubclasses.set([]);
    this.levelUpSelectedSubclass.set(null);
    this.levelUpHasASI.set(false);
    this.levelUpStatBonuses.set({});

    try {
      const classId = c.character_class?.index;
      if (!classId) return;

      // ─── Class levels data ────────────────────────────────────────────
      const levels = await this.classesService.getClassLevels(classId);
      const lvlData = levels.find(l => l.level === newLevel);

      // Proficiency bonus
      this.levelUpNewProfBonus.set(lvlData?.prof_bonus ?? this.getProfBonusForLevel(newLevel));

      // HP gain
      const hitDieType = parseInt((c.hit_dice ?? '1d8').replace(/^\d+d/, '')) || 8;
      const conMod = statModifier(c.constitution);
      const avg = Math.max(1, Math.floor(hitDieType / 2) + 1 + conMod);
      const max = Math.max(1, hitDieType + conMod);
      this.levelUpHpAvg.set(avg);
      this.levelUpHpMax.set(max);
      this.levelUpHpGain.set(avg);

      // ─── Features at this level ───────────────────────────────────────
      try {
        const progression = await this.classesService.getClassFeatureProgression(classId);
        const featuresAtLevel = progression.filter(f => f.level === newLevel).map(f => f.feature);
        this.levelUpFeatures.set(featuresAtLevel);

        // Detect ASI
        const hasASI = featuresAtLevel.some(
          f => f.index.includes('ability-score-improv') ||
               f.name.toLowerCase().includes('ability score improv')
        );
        this.levelUpHasASI.set(hasASI);
      } catch { this.levelUpHasASI.set(false); }

      // ─── Spell slots ─────────────────────────────────────────────────
      if (lvlData?.spellcasting) {
        const slotMap: Record<string, number> = {};
        Object.entries(lvlData.spellcasting).forEach(([key, value]) => {
          const m = key.match(/^spell_slots_level_(\d+)$/);
          if (m && typeof value === 'number' && value > 0) {
            slotMap[m[1]] = value;
          }
        });
        this.levelUpSlotMap.set(slotMap);
      }

      // ─── Subclass ────────────────────────────────────────────────────
      const subclassIntroLevel = this.SUBCLASS_LEVELS[classId.toLowerCase()];
      const hasSubclass = !!c.subclass?.index;
      if (!hasSubclass && subclassIntroLevel === newLevel) {
        this.levelUpSubclassRequired.set(true);
        try {
          const subs = await this.classesService.getSubclassesByClass(classId);
          this.levelUpSubclasses.set(subs);
        } catch { /* silencioso */ }
      }
    } catch (err) {
      console.error('Level-up data error:', err);
    } finally {
      this.levelUpLoading.set(false);
    }
  }

  private getProfBonusForLevel(level: number): number {
    return Math.ceil(level / 4) + 1;
  }

  setLevelUpHp(value: string | number): void {
    const n = typeof value === 'number' ? value : parseInt(value as string, 10);
    this.levelUpHpGain.set(isNaN(n) ? this.levelUpHpAvg() : Math.max(1, n));
  }

  // ── ASI ──
  levelUpHasASI      = signal(false);
  levelUpStatBonuses = signal<Partial<Record<StatKey, number>>>({});

  levelUpASIRemaining = computed(() =>
    2 - Object.values(this.levelUpStatBonuses()).reduce((s, v) => s + (v ?? 0), 0)
  );

  addASIBonus(stat: StatKey): void {
    if (this.levelUpASIRemaining() <= 0) return;
    const c = this.character();
    if (!c) return;
    const base = (c as unknown as Record<string, number>)[stat] ?? 10;
    const cur  = this.levelUpStatBonuses()[stat] ?? 0;
    if (base + cur >= 20) return;
    this.levelUpStatBonuses.update(b => ({ ...b, [stat]: cur + 1 }));
  }

  removeASIBonus(stat: StatKey): void {
    const cur = this.levelUpStatBonuses()[stat] ?? 0;
    if (cur <= 0) return;
    this.levelUpStatBonuses.update(b => {
      const next = { ...b };
      if (cur <= 1) delete next[stat]; else next[stat] = cur - 1;
      return next;
    });
  }

  confirmLevelUp(): void {
    const c = this.character();
    if (!c) return;
    if (this.levelUpSubclassRequired() && !this.levelUpSelectedSubclass()) return;

    const newLevel   = this.levelUpNewLevel();
    const hpGain     = this.levelUpHpGain();
    const profBonus  = this.levelUpNewProfBonus();
    const subclass   = this.levelUpSelectedSubclass();
    const slotMap    = this.levelUpSlotMap();
    const asiBonuses = this.levelUpStatBonuses();
    const hitDieType = (c.hit_dice ?? '1d8').replace(/^\d+d/, '') || '8';

    // ── Traits nuevos a persistir ──────────────────────────────────────────
    const existingIds = new Set((c.traits ?? []).map(t => t.id));
    const newTraits: Trait[] = this.levelUpFeatures()
      .filter(f => !existingIds.has(f.index))
      .map(f => ({
        id: f.index,
        name: f.name,
        description: f.desc?.join('\n\n') ?? '',
        source: 'class' as const,
        level: newLevel,
      }));

    this.character.update(ch => {
      if (!ch) return ch;

      // Spell slots (mantener used)
      let spellcasting = ch.spellcasting;
      if (Object.keys(slotMap).length && spellcasting) {
        const updatedSlots = { ...spellcasting.spell_slots } as Record<string, { total: number; used: number }>;
        Object.entries(slotMap).forEach(([lvl, total]) => {
          const ex = updatedSlots[lvl];
          const used = typeof ex === 'object' ? Math.min(ex.used, total) : 0;
          updatedSlots[lvl] = { total, used };
        });
        spellcasting = { ...spellcasting, spell_slots: updatedSlots };
      }

      // ASI bonuses a las stats
      const statUpdates: Partial<Record<StatKey, number>> = {};
      if (this.levelUpHasASI()) {
        (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as StatKey[])
          .forEach(stat => {
            const bonus = asiBonuses[stat] ?? 0;
            if (bonus > 0) {
              statUpdates[stat] = ((ch as unknown as Record<string, number>)[stat] ?? 10) + bonus;
            }
          });
      }

      return {
        ...ch,
        ...statUpdates,
        level: newLevel,
        hit_points: (ch.hit_points ?? 0) + hpGain,
        hit_points_current: (ch.hit_points_current ?? ch.hit_points ?? 0) + hpGain,
        hit_dice: `${newLevel}d${hitDieType}`,
        proficiency_bonus: profBonus,
        traits: [...(ch.traits ?? []), ...newTraits],
        ...(subclass ? { subclass: { index: subclass.index ?? '', name: subclass.name, url: subclass.url } } : {}),
        ...(spellcasting !== ch.spellcasting ? { spellcasting } : {}),
      };
    });

    this.save();

    // Recargar traits dinámicos para el nuevo nivel
    const updated = this.character();
    if (updated) {
      this.dynamicTraits.set([]);  // reset para que mergeDynamicTraits no duplique
      this.loadDynamicTraits(updated);
    }

    this.showLevelUpModal.set(false);
  }

  // ── PORTRAIT ──
  portraitUploading = signal(false);
  /** Base64 data-URL shown instantly on file pick, before the upload finishes */
  private localPortraitPreview = signal<string | null>(null);
  /** Timestamp appended to the server URL so the browser never serves a stale cache */
  private portraitCacheBust = signal(Date.now());

  getPortraitUrl(): string | null {
    // Show local preview immediately while uploading
    if (this.localPortraitPreview()) return this.localPortraitPreview();
    const img = this.character()?.image;
    if (!img) return null;
    const base = img.startsWith('http') ? img : `${environment.API_URL}${img}`;
    return `${base}?t=${this.portraitCacheBust()}`;
  }

  async onPortraitSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const c = this.character();
    const id = c?._id ?? c?.id ?? c?.index;
    if (!id) return;

    // Show base64 preview IMMEDIATELY — no need to wait for the upload
    const reader = new FileReader();
    reader.onload = (e) => {
      this.localPortraitPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Cancel any pending debounced save to avoid a race condition that would
    // overwrite the image field before it's stored on the server
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }

    this.portraitUploading.set(true);
    try {
      const result = await this.charactersService.uploadImage(id, file);
      this.character.update(ch => ch ? { ...ch, image: result.image } : ch);
      // Force browser to re-fetch the image even if the URL path is the same
      this.portraitCacheBust.set(Date.now());
      // Clear local preview: the server URL (with cache-bust) now takes over
      this.localPortraitPreview.set(null);
    } catch (err) {
      console.error('Portrait upload failed:', err);
      this.localPortraitPreview.set(null);
    } finally {
      this.portraitUploading.set(false);
      input.value = '';
    }
  }

  // ── BIO ──
  updateField(field: 'notes' | 'appearance' | 'age', value: string): void {
    this.character.update(c => c ? { ...c, [field]: value } : c);
    this.save();
  }

  updateBioList(field: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', value: string[]): void {
    this.character.update(c => c ? { ...c, [field]: value } : c);
    this.save();
  }

  addBioEntry(field: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', value: string): void {
    if (!value.trim()) return;
    const current = this.character()?.[field] ?? [];
    this.updateBioList(field, [...current, value.trim()]);
  }

  removeBioEntry(field: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number): void {
    const current = [...(this.character()?.[field] ?? [])];
    current.splice(index, 1);
    this.updateBioList(field, current);
  }

  // Custom bio entry inputs
  newPersonality = signal('');
  newIdeal = signal('');
  newBond = signal('');
  newFlaw = signal('');

  getBioList(field: 'personality_traits' | 'ideals' | 'bonds' | 'flaws'): string[] {
    return this.character()?.[field] ?? [];
  }

  getCoinValue(coin: 'cp' | 'sp' | 'ep' | 'gp' | 'pp'): number {
    return this.character()?.inventory?.cash?.[coin] ?? 0;
  }

  // ── ITEM PANEL ──
  async openItemPanel(mode: AddItemMode): Promise<void> {
    this.addItemMode.set(mode);
    this.itemSearchQuery.set('');
    if (mode === 'search' && !this.catalogItems().length) {
      this.loadingCatalog.set(true);
      try {
        const items = await this.itemsService.getItems();
        this.catalogItems.set(items);
      } catch {
        // silencioso
      } finally {
        this.loadingCatalog.set(false);
      }
    }
  }

  closeItemPanel(): void {
    this.addItemMode.set(null);
    this.newItem.set({ type: 'item', quantity: 1, state: 'stored' });
  }

  addFromCatalog(item: Item): void {
    const mapped = this.mapCatalogItem(item);
    this.character.update(c =>
      c ? { ...c, inventory: { ...c.inventory, items: [...c.inventory.items, mapped] } } : c
    );
    this.closeItemPanel();
    this.saveImmediate();
  }

  private mapCatalogItem(item: Item): InventoryItem {
    const isWeapon = !!item.damage || item.weapon_category != null ||
      item.equipment_category?.index?.includes('weapon');
    const isArmor = !!item.armor_class || item.armor_category != null ||
      item.equipment_category?.index?.includes('armor');

    let type: 'weapon' | 'armor' | 'item' = 'item';
    let weapon_data: WeaponData | undefined;
    let armor_data: ArmorData | undefined;

    if (isWeapon) {
      type = 'weapon';
      weapon_data = {
        damage_dice: item.damage?.damage_dice ?? '1d4',
        damage_type: item.damage?.damage_type?.name ?? '',
        ability: item.weapon_range === 'Ranged' ? 'dexterity' : 'strength',
      };
    } else if (isArmor) {
      type = 'armor';
      const cat = (item.armor_category ?? '').toLowerCase();
      let armor_type: 'light' | 'medium' | 'heavy' | 'shield' = 'light';
      if (cat.includes('medium')) armor_type = 'medium';
      else if (cat.includes('heavy')) armor_type = 'heavy';
      else if (cat.includes('shield')) armor_type = 'shield';
      armor_data = {
        base_ac: item.armor_class?.base ?? 10,
        armor_type,
      };
    }

    return {
      id: crypto.randomUUID(),
      name: item.name,
      type,
      quantity: 1,
      weight: item.weight,
      description: item.desc?.join(' '),
      state: 'stored',
      weapon_data,
      armor_data,
      properties: isWeapon ? (item.properties?.map((p: { name: string }) => p.name) ?? []) : undefined,
    };
  }

  itemCategoryLabel(item: Item): string {
    if (item.weapon_category) return item.weapon_category;
    if (item.armor_category) return item.armor_category;
    return item.equipment_category?.name ?? 'Item';
  }

  // ── EQUIPMENT ──
  weapons(): InventoryItem[] {
    return this.character()?.inventory?.items?.filter(i => i.type === 'weapon') ?? [];
  }
  armors(): InventoryItem[] {
    return this.character()?.inventory?.items?.filter(i => i.type === 'armor') ?? [];
  }
  otherItems(): InventoryItem[] {
    return this.character()?.inventory?.items?.filter(i => i.type === 'item') ?? [];
  }

  attackBonus(item: InventoryItem): string {
    const c = this.character()!;
    const profBonus = c.proficiency_bonus ?? 2;
    const ability = item.weapon_data?.ability ?? 'strength';
    const abilMod = statModifier((c as unknown as Record<string, number>)[ability] ?? 10);
    const bonus = profBonus + abilMod;
    return bonus >= 0 ? `+${bonus}` : `${bonus}`;
  }

  cycleState(itemId: string): void {
    const order: ItemState[] = ['stored', 'carried', 'equipped'];
    this.character.update(c => {
      if (!c) return c;
      const items = c.inventory.items.map(item => {
        if (item.id !== itemId) return item;
        const idx = order.indexOf(item.state);
        const next = order[(idx + 1) % order.length];
        return { ...item, state: next };
      });
      // Exclusión mutua armadura (no shield)
      const justEquipped = items.find(i => i.id === itemId && i.type === 'armor' && i.state === 'equipped' && i.armor_data?.armor_type !== 'shield');
      let finalItems = items;
      if (justEquipped) {
        finalItems = items.map(i => {
          if (i.id !== itemId && i.type === 'armor' && i.state === 'equipped' && i.armor_data?.armor_type !== 'shield') {
            return { ...i, state: 'stored' as ItemState };
          }
          return i;
        });
      }
      return { ...c, inventory: { ...c.inventory, items: finalItems } };
    });
    this.save();
  }

  addItem(): void {
    const ni = this.newItem();
    if (!ni.name?.trim()) return;
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name: ni.name.trim(),
      type: ni.type ?? 'item',
      quantity: ni.quantity ?? 1,
      description: ni.description,
      state: 'stored',
      weapon_data: ni.type === 'weapon' ? (ni.weapon_data ?? undefined) : undefined,
      armor_data: ni.type === 'armor' ? (ni.armor_data ?? undefined) : undefined,
    };
    this.character.update(c => c ? { ...c, inventory: { ...c.inventory, items: [...c.inventory.items, item] } } : c);
    this.closeItemPanel();
    this.saveImmediate();
  }

  removeItem(itemId: string): void {
    this.character.update(c => c ? { ...c, inventory: { ...c.inventory, items: c.inventory.items.filter(i => i.id !== itemId) } } : c);
    this.saveImmediate();
  }

  // ── COMBAT TABLE (Tab Básico) ──
  damageLabel(item: InventoryItem): string {
    const c = this.character()!;
    const ability = item.weapon_data?.ability ?? 'strength';
    const mod = statModifier((c as unknown as Record<string, number>)[ability] ?? 10);
    const dice = item.weapon_data?.damage_dice ?? '1d4';
    if (mod === 0) return dice;
    return mod > 0 ? `${dice}+${mod}` : `${dice}${mod}`;
  }

  combatSpells(): SpellEntry[] {
    const sc = this.character()?.spellcasting;
    if (!sc) return [];
    return [...(sc.known_spells ?? [])].filter(
      s => s.damage_dice || s.attack_type != null
    );
  }

  spellAttackLabel(spell: SpellEntry): string {
    if (spell.attack_type === 'save') {
      const dc = this.effectiveDC();
      return `CD ${dc} ${spell.save_type ?? ''}`.trim();
    }
    const bonus = this.effectiveAttackBonus();
    return bonus >= 0 ? `+${bonus}` : `${bonus}`;
  }

  cantrips(): SpellEntry[] {
    return this.character()?.spellcasting?.known_spells?.filter(s => s.level === 0) ?? [];
  }

  levelSpells(): SpellEntry[] {
    return this.character()?.spellcasting?.known_spells?.filter(s => s.level > 0) ?? [];
  }

  isSpellPrepared(index: string): boolean {
    return this.character()?.spellcasting?.prepared_spells?.some(s => s.index === index) ?? false;
  }

  isClassSpell(spell: Spell): boolean {
    const classIndex = this.character()?.character_class?.index ?? '';
    if (!classIndex) return false;
    return spell.classes?.some(c =>
      c.index === classIndex || c.name.toLowerCase() === classIndex.toLowerCase()
    ) ?? false;
  }

  spellDamageLabel(spell: SpellEntry): string {
    if (!spell.damage_dice) return '—';
    return spell.damage_dice;
  }

  // ── SPELL CATALOG ──
  async openSpellPanel(): Promise<void> {
    this.showSpellPanel.set(true);
    this.spellSearchQuery.set('');
    if (!this.catalogSpells().length) {
      this.loadingSpellCatalog.set(true);
      try {
        const spells = await this.spellsService.getSpells();
        this.catalogSpells.set(spells);
      } catch {
        // silencioso
      } finally {
        this.loadingSpellCatalog.set(false);
      }
    }
  }

  closeSpellPanel(): void { this.showSpellPanel.set(false); }

  loadingSlotsFromClass = signal(false);

  async loadSlotsFromClass(): Promise<void> {
    const c = this.character();
    if (!c) return;
    const classId = c.character_class?.index;
    if (!classId) return;
    this.loadingSlotsFromClass.set(true);
    try {
      const levels = await this.classesService.getClassLevels(classId);
      const level1 = levels.find(l => l.level === 1);
      if (!level1?.spellcasting) return;

      const slots: Record<string, { total: number; used: number }> = {};
      for (const [key, value] of Object.entries(level1.spellcasting)) {
        const match = key.match(/^spell_slots_level_(\d+)$/);
        if (match && typeof value === 'number' && value > 0) {
          slots[match[1]] = { total: value, used: 0 };
        }
      }
      if (!Object.keys(slots).length) return;

      // Also set spellcasting ability if missing
      const cls = await this.classesService.getClass(classId);
      const abilityIndex = cls.spellcasting?.spellcasting_ability?.index ?? '';
      const abilityMap: Record<string, string> = {
        int: 'intelligence', wis: 'wisdom', cha: 'charisma',
      };
      const ability = abilityMap[abilityIndex.toLowerCase()] ?? '';

      this.character.update(ch => {
        if (!ch) return ch;
        return {
          ...ch,
          spellcasting: {
            ...(ch.spellcasting ?? { spell_save_dc: 0, spell_attack_bonus: 0, known_spells: [], prepared_spells: [] }),
            spell_slots: slots,
            ...(ability && !ch.spellcasting?.spellcasting_ability ? { spellcasting_ability: ability } : {}),
          },
        };
      });
      this.save();
    } catch {
      // silencioso
    } finally {
      this.loadingSlotsFromClass.set(false);
    }
  }

  setSpellcastingAbility(ability: string): void {
    this.character.update(c => {
      if (!c) return c;
      return { ...c, spellcasting: { ...(c.spellcasting ?? { spell_save_dc: 0, spell_attack_bonus: 0, spell_slots: {}, known_spells: [], prepared_spells: [] }), spellcasting_ability: ability } };
    });
    this.save();
  }

  addFromSpellCatalog(spell: Spell): void {
    const entry = this.mapCatalogSpell(spell);
    this.character.update(c => {
      if (!c?.spellcasting) return c;
      if (c.spellcasting.known_spells.some(s => s.index === entry.index)) return c;
      return { ...c, spellcasting: { ...c.spellcasting, known_spells: [...c.spellcasting.known_spells, entry] } };
    });
    this.closeSpellPanel();
    this.saveImmediate();
  }

  private mapCatalogSpell(spell: Spell): SpellEntry {
    const raw = spell as Record<string, unknown>;
    const attackType = (raw['attack_type'] as string | undefined) ?? null;
    const hasDc = !!spell.dc?.dc_type;
    const slots = spell.damage?.damage_at_slot_level ?? {};
    const damageDice = slots[String(spell.level)] ?? slots['1'] ?? Object.values(slots)[0] ?? undefined;

    return {
      index: spell.index ?? spell.name.toLowerCase().replace(/\s+/g, '-'),
      name: spell.name,
      level: spell.level,
      school: spell.school?.name,
      damage_dice: damageDice as string | undefined,
      damage_type: spell.damage?.damage_type?.name,
      attack_type: hasDc ? 'save' : (attackType ? (attackType as 'melee' | 'ranged') : null),
      save_type: spell.dc?.dc_type?.name,
      dc_success: spell.dc?.dc_success,
    };
  }

  spellLevelLabel(level: number): string {
    return level === 0 ? 'Truco' : `Nv.${level}`;
  }

  // ── SPELLS ──

  removeKnownSpell(index: string): void {
    this.character.update(c => {
      if (!c?.spellcasting) return c;
      return { ...c, spellcasting: { ...c.spellcasting, known_spells: c.spellcasting.known_spells.filter(s => s.index !== index), prepared_spells: c.spellcasting.prepared_spells.filter(s => s.index !== index) } };
    });
    this.saveImmediate();
  }

  prepareSpell(spell: SpellEntry): void {
    this.character.update(c => {
      if (!c?.spellcasting) return c;
      if (c.spellcasting.prepared_spells.some(s => s.index === spell.index)) return c;
      return { ...c, spellcasting: { ...c.spellcasting, prepared_spells: [...c.spellcasting.prepared_spells, spell] } };
    });
    this.saveImmediate();
  }

  unprepareSpell(index: string): void {
    this.character.update(c => {
      if (!c?.spellcasting) return c;
      return { ...c, spellcasting: { ...c.spellcasting, prepared_spells: c.spellcasting.prepared_spells.filter(s => s.index !== index) } };
    });
    this.saveImmediate();
  }

  unpreparableSpells(): SpellEntry[] {
    const c = this.character();
    if (!c?.spellcasting) return [];
    const preparedIds = new Set(c.spellcasting.prepared_spells.map(s => s.index));
    return c.spellcasting.known_spells.filter(s => !preparedIds.has(s.index));
  }

  spellSlotLevels(): string[] {
    const slots = this.character()?.spellcasting?.spell_slots ?? {};
    return Object.keys(slots).filter(k => {
      const s = slots[k];
      return typeof s === 'object' ? s.total > 0 : s > 0;
    });
  }

  slotTotal(level: string): number {
    const s = this.character()?.spellcasting?.spell_slots?.[level];
    return typeof s === 'object' ? s.total : (s ?? 0);
  }

  slotUsed(level: string): number {
    const s = this.character()?.spellcasting?.spell_slots?.[level];
    return typeof s === 'object' ? s.used : 0;
  }

  changeSlot(level: string, delta: number): void {
    this.character.update(c => {
      if (!c?.spellcasting) return c;
      const slots = { ...c.spellcasting.spell_slots };
      const current = slots[level];
      const total = typeof current === 'object' ? current.total : (current ?? 0);
      const used = typeof current === 'object' ? current.used : 0;
      const newUsed = Math.max(0, Math.min(total, used + delta));
      slots[level] = { total, used: newUsed };
      return { ...c, spellcasting: { ...c.spellcasting, spell_slots: slots } };
    });
    this.save();
  }

  // ── TRAITS ──
  allTraits(): Trait[] {
    const c = this.character();
    if (!c) return [];
    const descriptions = this.traitDescriptions();

    // Traits almacenados con descripción dinámica aplicada
    const stored = [...(c.traits ?? []), ...(c.custom_traits ?? [])].map(t => ({
      ...t,
      description: descriptions[t.id] || t.description || '',
    }));

    // Traits dinámicos (clase y background) sin duplicar los ya almacenados
    const storedIds = new Set(stored.map(t => t.id));
    const dynamic = this.dynamicTraits().filter(t => !storedIds.has(t.id));

    return [...stored, ...dynamic];
  }

  traitsBySource(source: Trait['source']): Trait[] {
    return this.allTraits().filter(t => t.source === source);
  }

  addCustomTrait(): void {
    const t = this.newTrait();
    if (!t.name?.trim()) return;
    const trait: Trait = { id: crypto.randomUUID(), name: t.name.trim(), description: t.description ?? '', source: 'custom' };
    this.character.update(c => c ? { ...c, custom_traits: [...(c.custom_traits ?? []), trait] } : c);
    this.newTrait.set({ source: 'custom' });
    this.showTraitForm.set(false);
    this.saveImmediate();
  }

  removeCustomTrait(id: string): void {
    this.character.update(c => c ? { ...c, custom_traits: (c.custom_traits ?? []).filter(t => t.id !== id) } : c);
    this.saveImmediate();
  }

  // ── SAVE ──
  saveError = signal<string | null>(null);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debounced save — for rapid-change fields (HP, coins, notes…) */
  save(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 800);
  }

  /**
   * Immediate save — for structural changes that MUST persist before the user
   * navigates away: add/remove items, add/remove spells, traits…
   */
  async saveImmediate(): Promise<void> {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    await this.saveNow();
  }

  async saveNow(): Promise<void> {
    const c = this.character();
    if (!c) return;
    const id = c._id ?? c.id ?? c.index;
    if (!id) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.charactersService.updateCharacter(id, c);
      this.character.set(updated);
    } catch (err) {
      console.error('Save failed:', err);
      this.saveError.set('⚠ Save failed — check your connection');
      setTimeout(() => this.saveError.set(null), 5000);
    } finally {
      this.saving.set(false);
    }
  }

  /** Save immediately, then navigate to the printable character sheet. */
  async goToSheet(): Promise<void> {
    await this.saveImmediate();
    const c = this.character();
    const id = c?._id ?? c?.id;
    if (id) this.router.navigate(['/characters', id, 'sheet']);
  }
}
