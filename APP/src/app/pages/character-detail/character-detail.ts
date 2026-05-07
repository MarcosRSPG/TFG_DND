import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

type TabKey = 'basic' | 'equipment' | 'spells' | 'traits' | 'bio';
type ItemState = 'equipped' | 'stored' | 'carried';
type AddItemMode = 'search' | 'custom';

@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './character-detail.html',
  styleUrl: './character-detail.css',
})
export class CharacterDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
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
    } catch {
      this.error.set('Failed to load character.');
    } finally {
      this.loading.set(false);
    }
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

    // 2 ── Features de clase nivel 1
    const classId = c.character_class?.index;
    if (classId) {
      this.classesService.getLevel1Features(classId)
        .then(features => this.mergeDynamicTraits(
          features.map(f => ({
            id: f.index,
            name: f.name,
            description: f.desc?.join('\n\n') ?? '',
            source: 'class' as const,
          }))
        ))
        .catch(() => {});
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
    return abilMod + (this.isSkillProficient(skill) ? (c.proficiency_bonus ?? 2) : 0);
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

  // ── BIO ──
  updateField(field: 'history' | 'notes' | 'image', value: string): void {
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
    this.save();
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
    this.save();
  }

  removeItem(itemId: string): void {
    this.character.update(c => c ? { ...c, inventory: { ...c.inventory, items: c.inventory.items.filter(i => i.id !== itemId) } } : c);
    this.save();
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
    this.save();
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
    this.save();
  }

  prepareSpell(spell: SpellEntry): void {
    this.character.update(c => {
      if (!c?.spellcasting) return c;
      if (c.spellcasting.prepared_spells.some(s => s.index === spell.index)) return c;
      return { ...c, spellcasting: { ...c.spellcasting, prepared_spells: [...c.spellcasting.prepared_spells, spell] } };
    });
    this.save();
  }

  unprepareSpell(index: string): void {
    this.character.update(c => {
      if (!c?.spellcasting) return c;
      return { ...c, spellcasting: { ...c.spellcasting, prepared_spells: c.spellcasting.prepared_spells.filter(s => s.index !== index) } };
    });
    this.save();
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
    this.save();
  }

  removeCustomTrait(id: string): void {
    this.character.update(c => c ? { ...c, custom_traits: (c.custom_traits ?? []).filter(t => t.id !== id) } : c);
    this.save();
  }

  // ── SAVE ──
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  save(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 800);
  }

  private async saveNow(): Promise<void> {
    const c = this.character();
    if (!c) return;
    const id = c._id ?? c.id ?? c.index;
    if (!id) return;
    this.saving.set(true);
    try {
      const updated = await this.charactersService.updateCharacter(id, c);
      this.character.set(updated);
    } catch {
      // silent save error — could show a toast
    } finally {
      this.saving.set(false);
    }
  }
}
