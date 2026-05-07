import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CharacterDraft,
  StatKey,
  STAT_LABELS,
  STAT_ABBREVIATIONS,
  POINT_BUY_COSTS,
  statModifier,
  signedModifier,
} from '../../../../interfaces/Character';

const STATS: StatKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

@Component({
  selector: 'app-stats-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stats-step.html',
  styleUrl: './stats-step.css',
})
export class StatsStepComponent implements OnInit {
  @Input() draft: CharacterDraft = {};
  @Output() change = new EventEmitter<Partial<CharacterDraft>>();

  readonly STATS = STATS;
  readonly STAT_LABELS = STAT_LABELS;
  readonly STAT_ABBREVIATIONS = STAT_ABBREVIATIONS;

  mode = signal<'pointbuy' | 'manual'>('pointbuy');
  baseStats = signal<Record<StatKey, number>>({
    strength: 8, dexterity: 8, constitution: 8,
    intelligence: 8, wisdom: 8, charisma: 8,
  });

  pointsUsed = computed(() => {
    return STATS.reduce((total, s) => total + (POINT_BUY_COSTS[this.baseStats()[s]] ?? 0), 0);
  });

  pointsRemaining = computed(() => 27 - this.pointsUsed());

  racialBonuses = computed((): Record<StatKey, number> => {
    const rb = this.draft.racial_bonuses ?? {};
    return STATS.reduce((acc, s) => { acc[s] = rb[s] ?? 0; return acc; }, {} as Record<StatKey, number>);
  });

  finalStats = computed(() => {
    return STATS.reduce((acc, s) => {
      acc[s] = this.baseStats()[s] + this.racialBonuses()[s];
      return acc;
    }, {} as Record<StatKey, number>);
  });

  modifiers = computed(() => {
    return STATS.reduce((acc, s) => {
      acc[s] = statModifier(this.finalStats()[s]);
      return acc;
    }, {} as Record<StatKey, number>);
  });

  signedMod(s: StatKey): string {
    return signedModifier(this.finalStats()[s]);
  }

  racialBonus(s: StatKey): number {
    return this.racialBonuses()[s];
  }

  ngOnInit(): void {
    // Restore from draft if available
    const d = this.draft;
    if (d.strength != null) {
      this.baseStats.set({
        strength: d.strength, dexterity: d.dexterity ?? 8,
        constitution: d.constitution ?? 8, intelligence: d.intelligence ?? 8,
        wisdom: d.wisdom ?? 8, charisma: d.charisma ?? 8,
      });
    }
  }

  setMode(m: 'pointbuy' | 'manual'): void {
    this.mode.set(m);
    this.resetStats();
  }

  resetStats(): void {
    this.baseStats.set({ strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 });
    this.emit();
  }

  canIncrease(s: StatKey): boolean {
    const current = this.baseStats()[s];
    if (current >= 15) return false;
    const nextCost = POINT_BUY_COSTS[current + 1];
    if (nextCost === undefined) return false;
    const currentCost = POINT_BUY_COSTS[current] ?? 0;
    return this.pointsRemaining() >= (nextCost - currentCost);
  }

  canDecrease(s: StatKey): boolean {
    return this.baseStats()[s] > 8;
  }

  increase(s: StatKey): void {
    if (!this.canIncrease(s)) return;
    this.baseStats.update(stats => ({ ...stats, [s]: stats[s] + 1 }));
    this.emit();
  }

  decrease(s: StatKey): void {
    if (!this.canDecrease(s)) return;
    this.baseStats.update(stats => ({ ...stats, [s]: stats[s] - 1 }));
    this.emit();
  }

  onManualChange(s: StatKey, value: string): void {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 1 && n <= 20) {
      this.baseStats.update(stats => ({ ...stats, [s]: n }));
      this.emit();
    }
  }

  private emit(): void {
    const b = this.baseStats();
    this.change.emit({
      strength: b.strength, dexterity: b.dexterity,
      constitution: b.constitution, intelligence: b.intelligence,
      wisdom: b.wisdom, charisma: b.charisma,
    });
  }
}
