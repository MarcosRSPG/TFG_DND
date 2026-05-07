import { Component, Input, Output, EventEmitter, OnChanges, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CharacterDraft,
  StatKey,
  STAT_LABELS,
  statModifier,
  signedModifier,
} from '../../../../interfaces/Character';
import { DndOptionsService } from '../../../../services/dnd-options-service';

const STATS: StatKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

@Component({
  selector: 'app-summary-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './summary-step.html',
  styleUrl: './summary-step.css',
})
export class SummaryStepComponent implements OnChanges, OnInit {
  @Input() draft: CharacterDraft = {};
  @Output() change = new EventEmitter<Partial<CharacterDraft>>();

  private readonly dndOptions = inject(DndOptionsService);

  readonly STATS = STATS;
  readonly STAT_LABELS = STAT_LABELS;

  name = signal('');
  alignment = signal('True Neutral');
  customMaxHp = signal<number | null>(null);

  alignments = computed(() => this.dndOptions.alignments());

  alignmentDesc = computed(() => {
    const found = this.dndOptions.alignments().find(a => a.name === this.alignment());
    return found?.desc ?? '';
  });

  async ngOnInit(): Promise<void> {
    if (!this.dndOptions.alignments().length) {
      await this.dndOptions.loadAlignments();
    }
  }

  autoMaxHp = computed(() => {
    const hitDie = this.draft.character_class_hit_die ?? 8;
    const conBase = this.draft.constitution ?? 8;
    const conRacial = this.draft.racial_bonuses?.['constitution'] ?? 0;
    const conMod = statModifier(conBase + conRacial);
    return hitDie + conMod;
  });

  maxHp = computed(() => this.customMaxHp() ?? this.autoMaxHp());

  baseAC = computed(() => {
    const dexBase = this.draft.dexterity ?? 8;
    const dexRacial = this.draft.racial_bonuses?.['dexterity'] ?? 0;
    return 10 + statModifier(dexBase + dexRacial);
  });

  finalStat(s: StatKey): number {
    const base = (this.draft as Record<string, number>)[s] ?? 8;
    const racial = this.draft.racial_bonuses?.[s] ?? 0;
    return base + racial;
  }

  signedMod(s: StatKey): string {
    return signedModifier(this.finalStat(s));
  }

  ngOnChanges(): void {
    if (this.draft.name) this.name.set(this.draft.name);
    if (this.draft.alignment) this.alignment.set(this.draft.alignment);
    if (this.draft.custom_max_hp != null) this.customMaxHp.set(this.draft.custom_max_hp);
  }

  onNameChange(value: string): void { this.name.set(value); this.emit(); }
  onAlignmentChange(value: string): void { this.alignment.set(value); this.emit(); }

  onHpChange(value: string): void {
    const n = parseInt(value, 10);
    this.customMaxHp.set(!isNaN(n) && n > 0 ? n : null);
    this.emit();
  }

  resetHp(): void { this.customMaxHp.set(null); this.emit(); }

  private emit(): void {
    this.change.emit({
      name: this.name(),
      alignment: this.alignment(),
      custom_max_hp: this.customMaxHp() ?? undefined,
    });
  }
}
