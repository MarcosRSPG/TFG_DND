import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MonstersService }    from '../../services/monsters-service';
import { SpellsService }      from '../../services/spells-service';
import { BackgroundsService } from '../../services/backgrounds-service';
import { ItemsService }       from '../../services/items-service';
import { RacesService }       from '../../services/races-service';
import { ClassesService }     from '../../services/classes-service';

import { Monster }          from '../../interfaces/monster';
import { Spell }            from '../../interfaces/spell';
import { Background }       from '../../interfaces/background';
import { Item }             from '../../interfaces/item';
import { Race, RaceTrait, RaceTraitDetail } from '../../interfaces/race';
import { Subrace }          from '../../interfaces/subrace';
import { DndClass, DndClassLevel, LeveledFeature } from '../../interfaces/class';

export type PrintType = 'monsters' | 'spells' | 'backgrounds' | 'items' | 'races' | 'classes';

// ── Enriched types ───────────────────────────────────────────────────
export interface EnrichedRace {
  race: Race;
  traitMap: Map<string, string[]>;   // trait index → desc paragraphs
  subraces: Subrace[];
}

export interface EnrichedClass {
  cls: DndClass;
  levels: DndClassLevel[];
  features: LeveledFeature[];
}

@Component({
  selector: 'app-manual-print',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './manual-print.html',
  styleUrl:    './manual-print.css',
})
export class ManualPrint implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly doc   = inject(DOCUMENT);

  private readonly monstersService    = inject(MonstersService);
  private readonly spellsService      = inject(SpellsService);
  private readonly backgroundsService = inject(BackgroundsService);
  private readonly itemsService       = inject(ItemsService);
  private readonly racesService       = inject(RacesService);
  private readonly classesService     = inject(ClassesService);

  type    = signal<PrintType>('monsters');
  items   = signal<unknown[]>([]);
  loading = signal(true);
  error   = signal<string | null>(null);

  ngOnDestroy(): void { this.doc.body.classList.remove('sheet-view-active'); }

  async ngOnInit(): Promise<void> {
    this.doc.body.classList.add('sheet-view-active');
    const params = this.route.snapshot.queryParamMap;
    const type   = (params.get('type') ?? 'monsters') as PrintType;
    const ids    = (params.get('ids') ?? '').split(',').filter(Boolean);
    this.type.set(type);
    try {
      await this.loadItems(type, ids);
    } catch (err) {
      console.error(err);
      this.error.set('Failed to load items for printing.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadItems(type: PrintType, ids: string[]): Promise<void> {
    switch (type) {
      case 'monsters': {
        const res = await Promise.allSettled(ids.map(id => this.monstersService.getMonster(id)));
        this.items.set(res.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<Monster>).value));
        break;
      }
      case 'spells': {
        const res = await Promise.allSettled(ids.map(id => this.spellsService.getSpell(id)));
        this.items.set(res.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<Spell>).value));
        break;
      }
      case 'backgrounds': {
        const res = await Promise.allSettled(ids.map(id => this.backgroundsService.getBackground(id)));
        this.items.set(res.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<Background>).value));
        break;
      }
      case 'items': {
        const all   = await this.itemsService.getItems();
        const idSet = new Set(ids);
        this.items.set(all.filter(i => { const it = i as Item & Record<string, unknown>; return idSet.has((it['id'] ?? it['index'] ?? '') as string); }));
        break;
      }
      case 'races': {
        const enriched = await Promise.allSettled(ids.map(id => this.loadEnrichedRace(id)));
        this.items.set(enriched.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<EnrichedRace>).value));
        break;
      }
      case 'classes': {
        const enriched = await Promise.allSettled(ids.map(id => this.loadEnrichedClass(id)));
        this.items.set(enriched.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<EnrichedClass>).value));
        break;
      }
    }
  }

  // ── Race: enrich with trait descriptions + subrace details ───────────
  private async loadEnrichedRace(id: string): Promise<EnrichedRace> {
    const race = await this.racesService.getRace(id);

    const traitMap = new Map<string, string[]>();
    await Promise.allSettled(
      race.traits.map(async (t: RaceTrait) => {
        try {
          const detail: RaceTraitDetail = await this.racesService.getTrait(t.index);
          traitMap.set(t.index, detail.desc ?? []);
        } catch { traitMap.set(t.index, []); }
      })
    );

    const subraces: Subrace[] = [];
    await Promise.allSettled(
      race.subraces.map(async (sr: { index: string }) => {
        try {
          const detail = await this.racesService.getSubrace(sr.index);
          subraces.push(detail);
        } catch {}
      })
    );

    return { race, traitMap, subraces };
  }

  // ── Class: enrich with level progression + feature descriptions ───────
  private async loadEnrichedClass(id: string): Promise<EnrichedClass> {
    const [cls, levels, features] = await Promise.all([
      this.classesService.getClass(id),
      this.classesService.getClassLevels(id),
      this.classesService.getClassFeatureProgression(id),
    ]);
    return { cls, levels, features };
  }

  // ── Type helpers ──────────────────────────────────────────────────────
  asMonster(x: unknown)     { return x as Monster; }
  asSpell(x: unknown)       { return x as Spell; }
  asBackground(x: unknown)  { return x as Background; }
  asItem(x: unknown)        { return x as Item; }
  asEnrichedRace(x: unknown){ return x as EnrichedRace; }
  asEnrichedClass(x: unknown){ return x as EnrichedClass; }

  // ── Class progression helpers ─────────────────────────────────────────
  /** Spell slot levels that appear in this class's progression */
  slotColumns(levels: DndClassLevel[]): number[] {
    const cols = new Set<number>();
    levels.forEach(lvl => {
      if (!lvl.spellcasting) return;
      Object.entries(lvl.spellcasting).forEach(([k, v]) => {
        const m = k.match(/^spell_slots_level_(\d+)$/);
        if (m && typeof v === 'number' && v > 0) cols.add(parseInt(m[1]));
      });
    });
    return Array.from(cols).sort((a, b) => a - b);
  }

  slotAt(lvl: DndClassLevel, col: number): string {
    const v = lvl.spellcasting?.[`spell_slots_level_${col}`];
    return (typeof v === 'number' && v > 0) ? String(v) : '—';
  }

  /** Class-specific keys that have non-zero values anywhere in progression */
  specificColumns(levels: DndClassLevel[]): string[] {
    const keys = new Set<string>();
    levels.forEach(lvl => {
      if (!lvl.class_specific) return;
      Object.entries(lvl.class_specific).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== 0 && v !== false) keys.add(k);
      });
    });
    return Array.from(keys);
  }

  specificAt(lvl: DndClassLevel, key: string): string {
    const val = lvl.class_specific?.[key];
    if (val === null || val === undefined || val === 0 || val === false) return '—';
    if (typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if ('dice_count' in obj && 'dice_value' in obj) return `${obj['dice_count']}d${obj['dice_value']}`;
      return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(', ');
    }
    return String(val);
  }

  featuresAt(features: LeveledFeature[], level: number): string {
    return features.filter(f => f.level === level).map(f => f.feature.name).join(', ') || '—';
  }

  formatSpecificKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // ── Generic helpers ───────────────────────────────────────────────────
  abilityMod(score: number): string {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  }

  acValue(ac: unknown): string {
    if (!ac) return '—';
    if (typeof ac === 'number') return String(ac);
    if (Array.isArray(ac)) {
      const first = ac[0];
      return first?.value != null ? String(first.value) : String(first);
    }
    return String(ac);
  }

  speedStr(speed: unknown): string {
    if (!speed) return '—';
    if (typeof speed === 'object') {
      return Object.entries(speed as Record<string, unknown>)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ');
    }
    return String(speed);
  }

  senses(senses: unknown): string {
    if (!senses || typeof senses !== 'object') return '—';
    return Object.entries(senses as Record<string, unknown>)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
      .join(', ');
  }

  conditionNames(list: unknown[]): string {
    if (!list?.length) return '—';
    return list.map((c: any) => c.name ?? c).join(', ');
  }

  print(): void { window.print(); }
}
