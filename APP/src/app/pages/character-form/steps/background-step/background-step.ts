import { Component, Input, Output, EventEmitter, OnInit, inject, signal, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterDraft, Trait } from '../../../../interfaces/Character';
import { Background, BackgroundOptionGroup } from '../../../../interfaces/background';
import { BackgroundsService } from '../../../../services/backgrounds-service';

type BgCategory = 'personality' | 'ideals' | 'bonds' | 'flaws';

@Component({
  selector: 'app-background-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './background-step.html',
  styleUrl: './background-step.css',
})
export class BackgroundStepComponent implements OnInit {
  @Input() draft: CharacterDraft = {};
  @Output() change = new EventEmitter<Partial<CharacterDraft>>();

  private readonly backgroundsService = inject(BackgroundsService);

  backgrounds = signal<Background[]>([]);
  selectedBackground = signal<Background | null>(null);
  filter = signal('');
  loading = signal(true);

  // Selections
  selectedPersonality = signal<string[]>([]);
  selectedIdeals = signal<string[]>([]);
  selectedBonds = signal<string[]>([]);
  selectedFlaws = signal<string[]>([]);

  // Custom inputs
  customPersonality = signal('');
  customIdeal = signal('');
  customBond = signal('');
  customFlaw = signal('');

  filteredBackgrounds = computed(() => {
    const q = this.filter().toLowerCase();
    return this.backgrounds().filter(b => b.name.toLowerCase().includes(q));
  });

  // Options from selected background
  personalityOptions = computed(() => this.getOptionTexts(this.selectedBackground()?.personality_traits));
  idealOptions = computed(() => this.getOptionTexts(this.selectedBackground()?.ideals));
  bondOptions = computed(() => this.getOptionTexts(this.selectedBackground()?.bonds));
  flawOptions = computed(() => this.getOptionTexts(this.selectedBackground()?.flaws));

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.backgroundsService.getBackgrounds();
      this.backgrounds.set(data);
    } catch {
    } finally {
      this.loading.set(false);
    }
    if (this.draft.background) {
      const existing = this.backgrounds().find(b => b.index === this.draft.background?.index);
      if (existing) this.restoreSelection(existing);
    }
  }

  selectBackground(bg: Background): void {
    this.selectedBackground.set(bg);
    this.selectedPersonality.set([]);
    this.selectedIdeals.set([]);
    this.selectedBonds.set([]);
    this.selectedFlaws.set([]);
    this.customPersonality.set('');
    this.customIdeal.set('');
    this.customBond.set('');
    this.customFlaw.set('');
    this.emit(bg);
  }

  private restoreSelection(bg: Background): void {
    this.selectedBackground.set(bg);
    this.selectedPersonality.set(this.draft.selected_personality_traits ?? []);
    this.selectedIdeals.set(this.draft.selected_ideals ?? []);
    this.selectedBonds.set(this.draft.selected_bonds ?? []);
    this.selectedFlaws.set(this.draft.selected_flaws ?? []);
  }

  toggleOption(category: BgCategory, option: string): void {
    const maxMap: Record<BgCategory, number> = { personality: 2, ideals: 1, bonds: 1, flaws: 1 };
    const signal = this.signalFor(category);
    const current = signal();
    const max = maxMap[category];
    const idx = current.indexOf(option);
    if (idx >= 0) {
      signal.set(current.filter(o => o !== option));
    } else if (current.length < max) {
      signal.set([...current, option]);
    }
    this.emit(this.selectedBackground()!);
  }

  isSelected(category: BgCategory, option: string): boolean {
    return this.signalFor(category)().includes(option);
  }

  isDisabled(category: BgCategory, option: string): boolean {
    const maxMap: Record<BgCategory, number> = { personality: 2, ideals: 1, bonds: 1, flaws: 1 };
    const s = this.signalFor(category)();
    return !s.includes(option) && s.length >= maxMap[category];
  }

  addCustom(category: BgCategory): void {
    const inputMap: Record<BgCategory, WritableSignal<string>> = {
      personality: this.customPersonality,
      ideals: this.customIdeal,
      bonds: this.customBond,
      flaws: this.customFlaw,
    };
    const value = inputMap[category]().trim();
    if (!value) return;
    const sel = this.signalFor(category);
    const maxMap: Record<BgCategory, number> = { personality: 2, ideals: 1, bonds: 1, flaws: 1 };
    if (sel().length < maxMap[category]) {
      sel.set([...sel(), value]);
    }
    inputMap[category].set('');
    this.emit(this.selectedBackground()!);
  }

  private signalFor(category: BgCategory) {
    const map = {
      personality: this.selectedPersonality,
      ideals: this.selectedIdeals,
      bonds: this.selectedBonds,
      flaws: this.selectedFlaws,
    };
    return map[category];
  }

  private emit(bg: Background): void {
    const baseProfs = bg.starting_proficiencies?.map(p => p.name) ?? [];
    const existingProfs = this.draft.proficiency_names ?? [];
    const merged = [...new Set([...existingProfs, ...baseProfs])];

    const bgTraits: Trait[] = [];
    if (bg.feature?.name) {
      bgTraits.push({ id: `bg-${bg.index}-feature`, name: bg.feature.name, description: bg.feature.desc?.join('\n\n') ?? '', source: 'background' });
      if (bg.feature.variant?.name) {
        bgTraits.push({ id: `bg-${bg.index}-variant`, name: bg.feature.variant.name, description: bg.feature.variant.desc?.join('\n\n') ?? '', source: 'background' });
      }
    }

    this.change.emit({
      background: { index: bg.index, name: bg.name },
      proficiency_names: merged,
      background_traits: bgTraits,
      selected_personality_traits: this.selectedPersonality(),
      selected_ideals: this.selectedIdeals(),
      selected_bonds: this.selectedBonds(),
      selected_flaws: this.selectedFlaws(),
    });
  }

  featureDesc(bg: Background): string { return bg.feature?.desc?.join(' ') ?? ''; }
  proficiencyNames(bg: Background): string { return bg.starting_proficiencies?.map(p => p.name).join(', ') ?? ''; }

  private getOptionTexts(group?: BackgroundOptionGroup): string[] {
    if (!group) return [];
    if (group.from?.options?.length) {
      return group.from.options
        .map(o => (o as Record<string, unknown>)['string'] as string || (o as Record<string, unknown>)['desc'] as string || '')
        .filter(s => s.trim());
    }
    return group.options ?? [];
  }
}
