import { Component, Input, Output, EventEmitter, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterDraft, Trait } from '../../../../interfaces/Character';
import { Race } from '../../../../interfaces/race';
import { Subrace } from '../../../../interfaces/subrace';
import { RacesService } from '../../../../services/races-service';

@Component({
  selector: 'app-race-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './race-step.html',
  styleUrl: './race-step.css',
})
export class RaceStepComponent implements OnInit {
  @Input() draft: CharacterDraft = {};
  @Output() change = new EventEmitter<Partial<CharacterDraft>>();

  private readonly racesService = inject(RacesService);

  races = signal<Race[]>([]);
  subraces = signal<Subrace[]>([]);
  selectedRace = signal<Race | null>(null);
  selectedSubrace = signal<Subrace | null>(null);
  filter = signal('');
  loading = signal(true);
  loadingSubraces = signal(false);

  filteredRaces = computed(() => {
    const q = this.filter().toLowerCase();
    return this.races().filter(r => r.name.toLowerCase().includes(q));
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.racesService.getRaces((r: Race) => {
        this.races.update(list => [...list, r]);
      });
      if (data?.length) this.races.set(data);
    } catch {
      // races loaded progressively
    } finally {
      this.loading.set(false);
    }

    if (this.draft.race) {
      const existing = this.races().find(r => r.index === this.draft.race?.index);
      if (existing) await this.selectRace(existing, false);
    }
  }

  async selectRace(race: Race, emit = true): Promise<void> {
    this.selectedRace.set(race);
    this.subraces.set([]);
    this.selectedSubrace.set(null);

    if (race.subraces?.length) {
      this.loadingSubraces.set(true);
      try {
        const subs = await this.racesService.getSubracesByRace(race.index ?? race.id);
        this.subraces.set(subs);
      } catch {
        // no subraces loaded — treat as no subraces
      } finally {
        this.loadingSubraces.set(false);
      }
    }

    // Emit AFTER subraces are loaded so has_subraces reflects the actual loaded count
    if (emit) this.emitChange(race, null);
  }

  selectSubrace(subrace: Subrace): void {
    const current = this.selectedSubrace();
    const next = current?.index === subrace.index ? null : subrace;
    this.selectedSubrace.set(next);
    this.emitChange(this.selectedRace()!, next);
  }

  private emitChange(race: Race, subrace: Subrace | null): void {
    const racialBonuses: Partial<Record<string, number>> = {};
    race.ability_bonuses?.forEach(ab => {
      const key = ab.ability_score.name.toLowerCase();
      racialBonuses[key] = (racialBonuses[key] ?? 0) + ab.bonus;
    });
    if (subrace?.ability_bonuses) {
      subrace.ability_bonuses.forEach((ab: { ability_score: { name: string }; bonus: number }) => {
        const key = ab.ability_score.name.toLowerCase();
        racialBonuses[key] = (racialBonuses[key] ?? 0) + ab.bonus;
      });
    }

    const traits: Trait[] = race.traits?.map(t => ({
      id: t.index,
      name: t.name,
      description: '',
      source: 'race' as const,
    })) ?? [];

    // Use the actual loaded subraces count (not the reference list), so that
    // if subraces failed to load, we don't block the user forever
    const hasSubraces = this.subraces().length > 0;

    this.change.emit({
      race: { index: race.index ?? race.id, name: race.name, url: race.url },
      subrace: subrace ? { index: subrace.index, name: subrace.name, url: subrace.url } : undefined,
      race_speed: race.speed,
      racial_bonuses: racialBonuses as Partial<Record<import('../../../../interfaces/Character').StatKey, number>>,
      traits,
      has_subraces: hasSubraces,
    });
  }

  abilityBonusLabel(race: Race): string {
    return race.ability_bonuses?.map(ab => `${ab.ability_score.name} +${ab.bonus}`).join(', ') ?? '';
  }
}
