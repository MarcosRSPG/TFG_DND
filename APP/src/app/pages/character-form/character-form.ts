import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterDraft, statModifier } from '../../interfaces/Character';
import { CharactersService } from '../../services/characters-service';
import { RaceStepComponent } from './steps/race-step/race-step';
import { ClassStepComponent } from './steps/class-step/class-step';
import { BackgroundStepComponent } from './steps/background-step/background-step';
import { StatsStepComponent } from './steps/stats-step/stats-step';
import { SummaryStepComponent } from './steps/summary-step/summary-step';

@Component({
  selector: 'app-character-form',
  standalone: true,
  imports: [
    CommonModule,
    RaceStepComponent,
    ClassStepComponent,
    BackgroundStepComponent,
    StatsStepComponent,
    SummaryStepComponent,
  ],
  templateUrl: './character-form.html',
  styleUrl: './character-form.css',
})
export class CharacterForm implements OnInit {
  private readonly charactersService = inject(CharactersService);
  private readonly router = inject(Router);

  currentStep = signal<1 | 2 | 3 | 4 | 5>(1);
  draft = signal<CharacterDraft>({});
  submitting = signal(false);
  error = signal<string | null>(null);
  selectedImageFile = signal<File | null>(null);

  readonly STEPS = [
    { label: 'Race' },
    { label: 'Class' },
    { label: 'Background' },
    { label: 'Stats' },
    { label: 'Summary' },
  ];

  ngOnInit(): void {}

  patchDraft(patch: Partial<CharacterDraft>): void {
    this.draft.update(current => ({ ...current, ...patch }));
  }

  onFileSelected(file: File | null): void {
    this.selectedImageFile.set(file);
  }

  canProceed(): boolean {
    const d = this.draft();
    switch (this.currentStep()) {
      case 1: return !!d.race;
      case 2: return !!d.character_class;
      case 3: return !!d.background;
      case 4: return this.allStatsAssigned(d);
      case 5: return !!(d.name?.trim());
      default: return false;
    }
  }

  private allStatsAssigned(d: CharacterDraft): boolean {
    return (
      typeof d.strength === 'number' &&
      typeof d.dexterity === 'number' &&
      typeof d.constitution === 'number' &&
      typeof d.intelligence === 'number' &&
      typeof d.wisdom === 'number' &&
      typeof d.charisma === 'number'
    );
  }

  nextStep(): void {
    if (!this.canProceed()) return;
    if (this.currentStep() < 5) {
      this.currentStep.update(s => (s + 1) as typeof s);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => (s - 1) as typeof s);
    }
  }

  async submit(): Promise<void> {
    if (!this.canProceed()) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const payload = this.buildPayload();
      const created = await this.charactersService.createCharacter(payload);
      const id = created._id ?? created.id ?? created.index;

      // Upload portrait after creation so we can use the _id as filename
      const imageFile = this.selectedImageFile();
      if (imageFile && id) {
        try {
          await this.charactersService.uploadImage(id, imageFile);
        } catch (err) {
          console.error('Portrait upload failed (character was still created):', err);
        }
      }

      this.router.navigate(['/characters', id]);
    } catch {
      this.error.set('Error creating character. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  private buildPayload() {
    const d = this.draft();
    const racialBonuses = d.racial_bonuses ?? {};
    const strTotal = (d.strength ?? 8) + (racialBonuses['strength'] ?? 0);
    const dexTotal = (d.dexterity ?? 8) + (racialBonuses['dexterity'] ?? 0);
    const conTotal = (d.constitution ?? 8) + (racialBonuses['constitution'] ?? 0);
    const hitDieMax = d.character_class_hit_die ?? 8;
    const conMod = statModifier(conTotal);
    const maxHp = d.custom_max_hp ?? (hitDieMax + conMod);
    const speedNum = d.race_speed ?? 30;

    return {
      name: d.name!.trim(),
      level: 1,
      race: d.race!,
      subrace: d.subrace,
      character_class: d.character_class!,
      background: d.background!,
      alignment: d.alignment ?? 'True Neutral',
      hit_points: maxHp,
      hit_points_current: maxHp,
      hit_dice: `1d${hitDieMax}`,
      hit_points_roll: `1d${hitDieMax}`,
      speed: { walk: `${speedNum} ft.` },
      strength: d.strength!,
      dexterity: d.dexterity!,
      constitution: d.constitution!,
      intelligence: d.intelligence!,
      wisdom: d.wisdom!,
      charisma: d.charisma!,
      proficiency_bonus: 2,
      saving_throws: d.saving_throw_names ?? [],
      proficiencies: (d.proficiency_names ?? []).map(name => ({
        proficiency: { index: name.toLowerCase().replace(/\s+/g, '-'), name },
      })),
      traits: [...(d.traits ?? []), ...(d.background_traits ?? [])],
      personality_traits: d.selected_personality_traits ?? [],
      ideals: d.selected_ideals ?? [],
      bonds: d.selected_bonds ?? [],
      flaws: d.selected_flaws ?? [],
      custom_traits: [],
      notes: d.notes,
      history: d.history,
      inventory: { items: [], cash: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
      spellcasting: {
        spellcasting_ability: d.class_spellcasting_ability || undefined,
        spell_save_dc: 0,
        spell_attack_bonus: 0,
        spell_slots: d.class_spell_slots ?? {},
        known_spells: [],
        prepared_spells: [],
      },
    };
  }
}
