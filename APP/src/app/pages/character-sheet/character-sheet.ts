import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Character,
  InventoryItem,
  SpellEntry,
  Trait,
  Skill,
  StatKey,
  SKILLS,
  STAT_LABELS,
  STAT_ABBREVIATIONS,
  statModifier,
} from '../../interfaces/Character';
import { CharactersService } from '../../services/characters-service';
import { SpellsService } from '../../services/spells-service';
import { RacesService } from '../../services/races-service';
import { ClassesService } from '../../services/classes-service';
import { DndClassLevel } from '../../interfaces/class';
import { Spell } from '../../interfaces/spell';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './character-sheet.html',
  styleUrl: './character-sheet.css',
})
export class CharacterSheet implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly doc   = inject(DOCUMENT);
  private readonly charactersService = inject(CharactersService);
  private readonly spellsService = inject(SpellsService);
  private readonly racesService   = inject(RacesService);
  private readonly classesService = inject(ClassesService);

  character   = signal<Character | null>(null);
  loading     = signal(true);
  error       = signal<string | null>(null);
  /** Full spell data keyed by spell index, loaded async in ngOnInit */
  fullSpells        = signal<Map<string, Spell>>(new Map());
  /** Racial trait descriptions keyed by trait id, loaded async in ngOnInit */
  traitDescriptions = signal<Record<string, string>>({});
  /** Class level data for the character's current level */
  classLevelData    = signal<DndClassLevel | null>(null);

  readonly STATS: StatKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  readonly STAT_LABELS       = STAT_LABELS;
  readonly STAT_ABBREVIATIONS = STAT_ABBREVIATIONS;
  readonly SKILLS            = SKILLS;

  ngOnDestroy(): void {
    this.doc.body.classList.remove('sheet-view-active');
  }

  async ngOnInit(): Promise<void> {
    this.doc.body.classList.add('sheet-view-active');
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Character ID not found'); this.loading.set(false); return; }
    try {
      const c = await this.charactersService.getCharacter(id);
      this.character.set(c);
      // Load supplementary data in background (non-blocking)
      this.loadFullSpells(c);
      this.loadRacialTraitDescriptions(c);
      this.loadClassLevel(c);
    } catch {
      this.error.set('Failed to load character.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFullSpells(c: Character): Promise<void> {
    const known = c.spellcasting?.known_spells ?? [];
    if (!known.length) return;

    const map = new Map<string, Spell>();

    await Promise.allSettled(
      known.map(async entry => {
        try {
          const spell = await this.spellsService.getSpell(entry.index);
          map.set(entry.index, spell);
        } catch { /* keep SpellEntry data for this spell */ }
      })
    );

    this.fullSpells.set(map);
  }

  // ── Ability scores ──────────────────────────────────────────────────
  statValue(stat: StatKey): number {
    return (this.character() as unknown as Record<string, number>)?.[stat] ?? 10;
  }

  statMod(stat: StatKey): number { return statModifier(this.statValue(stat)); }

  signedMod(stat: StatKey): string {
    const m = this.statMod(stat);
    return m >= 0 ? `+${m}` : `${m}`;
  }

  // ── Saving throws ───────────────────────────────────────────────────
  private matchesSave(saved: string, stat: StatKey): boolean {
    const s = saved.toLowerCase().trim();
    return s === STAT_LABELS[stat].toLowerCase() || s === stat || s === stat.substring(0, 3);
  }

  isSaveProficient(stat: StatKey): boolean {
    return (this.character()?.saving_throws ?? []).some(s => this.matchesSave(s, stat));
  }

  /** Total proficiency bonus including any extra bonus from items/features */
  totalProfBonus = computed(() => {
    const c = this.character();
    if (!c) return 2;
    return (c.proficiency_bonus ?? 2) + (c.prof_bonus_extra ?? 0);
  });

  saveValue(stat: StatKey): number {
    return this.statMod(stat) + (this.isSaveProficient(stat) ? this.totalProfBonus() : 0);
  }

  signedSave(stat: StatKey): string {
    const v = this.saveValue(stat);
    return v >= 0 ? `+${v}` : `${v}`;
  }

  // ── Skills ──────────────────────────────────────────────────────────
  isSkillProficient(skill: Skill): boolean {
    return (this.character()?.proficiencies ?? []).some(p =>
      p.proficiency.index === skill.index ||
      p.proficiency.name?.toLowerCase().includes(skill.name.toLowerCase())
    );
  }

  isSkillExpert(skill: Skill): boolean {
    return this.character()?.skill_expertise?.includes(skill.index) ?? false;
  }

  getSkillState(skill: Skill): 'none' | 'proficient' | 'expert' {
    if (this.isSkillExpert(skill)) return 'expert';
    if (this.isSkillProficient(skill)) return 'proficient';
    return 'none';
  }

  skillValue(skill: Skill): number {
    const c = this.character();
    if (!c) return 0;
    const abilMod = statModifier((c as unknown as Record<string, number>)[skill.ability] ?? 10);
    const prof    = this.totalProfBonus();
    const state   = this.getSkillState(skill);
    const bonus   = state === 'expert' ? prof * 2 : state === 'proficient' ? prof : 0;
    return abilMod + bonus + (c.skill_bonuses?.[skill.index] ?? 0);
  }

  signedSkill(skill: Skill): string {
    const v = this.skillValue(skill);
    return v >= 0 ? `+${v}` : `${v}`;
  }

  // ── Combat computed ─────────────────────────────────────────────────
  initiative = computed(() => {
    const c = this.character();
    if (!c) return 0;
    return statModifier(c.dexterity) + (c.initiative_bonus ?? 0);
  });

  private baseAC = computed(() => {
    const c = this.character();
    if (!c) return 10;
    const dexMod = statModifier(c.dexterity);
    const items  = c.inventory?.items ?? [];
    const armor  = items.find(i => i.type === 'armor' && i.state === 'equipped' && i.armor_data?.armor_type !== 'shield');
    const shield = items.find(i => i.type === 'armor' && i.state === 'equipped' && i.armor_data?.armor_type === 'shield');
    let ac = 10 + dexMod;
    if (armor?.armor_data) {
      const { base_ac, armor_type } = armor.armor_data;
      if (armor_type === 'light')  ac = base_ac + dexMod;
      else if (armor_type === 'medium') ac = base_ac + Math.min(dexMod, 2);
      else if (armor_type === 'heavy')  ac = base_ac;
    }
    return ac + (shield ? 2 : 0);
  });

  /** AC including any magic/feature bonus */
  totalAC = computed(() => this.baseAC() + (this.character()?.ac_bonus ?? 0));

  // Keep alias so existing template refs still compile during transition
  calculatedAC = this.totalAC;

  /** Speed in ft, base + bonus */
  totalSpeed = computed(() => {
    const c = this.character();
    if (!c) return 30;
    const raw = String(c.speed?.walk ?? '30');
    const base = parseInt(raw.match(/\d+/)?.[0] ?? '30');
    return base + (c.speed_bonus ?? 0);
  });

  passivePerception = computed(() => {
    const perc = SKILLS.find(s => s.index === 'skill-perception');
    return 10 + (perc ? this.skillValue(perc) : 0);
  });

  // ── Weapons ─────────────────────────────────────────────────────────
  weapons = computed(() =>
    (this.character()?.inventory?.items ?? []).filter(i => i.type === 'weapon')
  );

  attackBonus(item: InventoryItem): string {
    const c    = this.character()!;
    const prof = c.proficiency_bonus ?? 2;
    const abl  = item.weapon_data?.ability ?? 'strength';
    const mod  = statModifier((c as unknown as Record<string, number>)[abl] ?? 10);
    const b    = prof + mod;
    return b >= 0 ? `+${b}` : `${b}`;
  }

  damageLabel(item: InventoryItem): string {
    const c   = this.character()!;
    const abl = item.weapon_data?.ability ?? 'strength';
    const mod = statModifier((c as unknown as Record<string, number>)[abl] ?? 10);
    const d   = item.weapon_data?.damage_dice ?? '1d4';
    if (mod === 0) return d;
    return mod > 0 ? `${d}+${mod}` : `${d}${mod}`;
  }

  // ── Equipment ───────────────────────────────────────────────────────
  equippedItems = computed(() =>
    (this.character()?.inventory?.items ?? []).filter(i => i.state === 'equipped')
  );

  carriedItems = computed(() =>
    (this.character()?.inventory?.items ?? []).filter(i => i.state !== 'equipped')
  );

  // ── Spells ──────────────────────────────────────────────────────────
  isSpellcaster = computed(() => {
    const c = this.character();
    if (!c?.spellcasting) return false;
    const slots = c.spellcasting.spell_slots ?? {};
    return Object.values(slots).some(s => (typeof s === 'object' ? (s as { total: number }).total : (s as number)) > 0)
      || (c.spellcasting.known_spells?.length ?? 0) > 0;
  });

  spellAbilityMod = computed(() => {
    const c = this.character();
    if (!c?.spellcasting?.spellcasting_ability) return 0;
    const map: Record<string, StatKey> = {
      int: 'intelligence', intelligence: 'intelligence',
      wis: 'wisdom',       wisdom: 'wisdom',
      cha: 'charisma',     charisma: 'charisma',
    };
    const stat = map[c.spellcasting.spellcasting_ability.toLowerCase()];
    return stat ? statModifier((c as unknown as Record<string, number>)[stat] ?? 10) : 0;
  });

  spellSaveDC = computed(() => {
    const c = this.character();
    if (!c?.spellcasting) return 0;
    if (c.spellcasting.spellcasting_ability)
      return 8 + (c.proficiency_bonus ?? 2) + this.spellAbilityMod();
    return c.spellcasting.spell_save_dc ?? 0;
  });

  spellAttackBonus = computed(() => {
    const c = this.character();
    if (!c?.spellcasting) return 0;
    if (c.spellcasting.spellcasting_ability)
      return (c.proficiency_bonus ?? 2) + this.spellAbilityMod();
    return c.spellcasting.spell_attack_bonus ?? 0;
  });

  slotLevels = computed(() => {
    const slots = this.character()?.spellcasting?.spell_slots ?? {};
    return Object.keys(slots)
      .filter(k => this.slotTotal(k) > 0)
      .sort((a, b) => parseInt(a) - parseInt(b));
  });

  slotTotal(level: string): number {
    const s = this.character()?.spellcasting?.spell_slots?.[level];
    return typeof s === 'object' ? (s as { total: number }).total : ((s as unknown as number) ?? 0);
  }

  spellsByLevel = computed((): { level: number; spells: SpellEntry[] }[] => {
    const known = this.character()?.spellcasting?.known_spells ?? [];
    const map: Record<number, SpellEntry[]> = {};
    known.forEach(s => { (map[s.level] ??= []).push(s); });
    return Object.entries(map)
      .map(([lvl, spells]) => ({ level: parseInt(lvl), spells }))
      .sort((a, b) => a.level - b.level);
  });

  /** SpellEntry enriched with the full Spell data (desc, casting_time, range…) when available */
  enrichedSpellsByLevel = computed((): { level: number; spells: (SpellEntry & { full?: Spell })[] }[] => {
    const fullMap = this.fullSpells();
    return this.spellsByLevel().map(group => ({
      level: group.level,
      spells: group.spells.map(entry => ({
        ...entry,
        full: fullMap.get(entry.index),
      })),
    }));
  });

  private async loadClassLevel(c: Character): Promise<void> {
    const classId = c.character_class?.index;
    const level   = c.level ?? 1;
    if (!classId) return;
    try {
      const levels = await this.classesService.getClassLevels(classId);
      const found  = levels.find(l => l.level === level);
      if (found) this.classLevelData.set(found);
    } catch { /* silencioso */ }
  }

  classSpecificEntries = computed((): { key: string; label: string; value: string }[] => {
    const cs = this.classLevelData()?.class_specific;
    if (!cs) return [];
    return Object.entries(cs)
      .filter(([, v]) => v !== null && v !== undefined && v !== 0 && v !== false)
      .map(([key, value]) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
        value: this.formatClassValue(value),
      }));
  });

  private formatClassValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if ('dice_count' in obj && 'dice_value' in obj) return `${obj['dice_count']}d${obj['dice_value']}`;
      if ('dice_count' in obj) return `${obj['dice_count']} d6`;
      return Object.entries(obj).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ');
    }
    return String(value);
  }

  /** Non-weapon, non-armor items — the consumable / tracker items */
  otherItems = computed(() =>
    (this.character()?.inventory?.items ?? []).filter(i => i.type === 'item')
  );

  private async loadRacialTraitDescriptions(c: Character): Promise<void> {
    const racialTraits = (c.traits ?? []).filter(
      t => (t.source === 'race' || t.source === 'subrace') && !t.description
    );
    if (!racialTraits.length) return;

    const results = await Promise.allSettled(
      racialTraits.map(t =>
        this.racesService.getTrait(t.id)
          .then(detail => ({ id: t.id, desc: detail.desc?.join('\n\n') ?? '' }))
          .catch(() => ({ id: t.id, desc: '' }))
      )
    );

    const map: Record<string, string> = {};
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.desc) {
        map[r.value.id] = r.value.desc;
      }
    });
    this.traitDescriptions.set(map);
  }

  // ── Traits ──────────────────────────────────────────────────────────
  /** All traits with racial descriptions applied when available */
  allTraits = computed((): Trait[] => {
    const descriptions = this.traitDescriptions();
    return [
      ...(this.character()?.traits ?? []),
      ...(this.character()?.custom_traits ?? []),
    ].map(t => ({
      ...t,
      description: descriptions[t.id] || t.description || '',
    }));
  });

  traitsBySource(source: string): Trait[] {
    return this.allTraits().filter(t => t.source === source);
  }

  // ── Portrait ────────────────────────────────────────────────────────
  portraitUrl = computed(() => {
    const img = this.character()?.image;
    if (!img) return null;
    return img.startsWith('http') ? img : `${environment.API_URL}${img}`;
  });

  getCoinVal(key: string): number {
    const cash = this.character()?.inventory?.cash;
    if (!cash) return 0;
    return (cash as unknown as Record<string, number>)[key] ?? 0;
  }

  // ── Print ────────────────────────────────────────────────────────────
  print(): void { window.print(); }
}
