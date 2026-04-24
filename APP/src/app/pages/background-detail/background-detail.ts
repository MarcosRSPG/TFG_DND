import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Background, BackgroundReference } from '../../interfaces/background';
import { BackgroundsService } from '../../services/backgrounds-service';

@Component({
  selector: 'app-background-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './background-detail.html',
  styleUrl: './background-detail.css',
})
export class BackgroundDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly backgroundsService = inject(BackgroundsService);

  background = signal<Background | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_IMAGES}${imagePath}`;
  }

  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        throw new Error('No background id provided');
      }

      const background = await this.backgroundsService.getBackground(id);
      this.background.set(background);
    } catch (error) {
      console.error('Error loading background detail:', error);
      this.error.set('Failed to load background details.');
    } finally {
      this.loading.set(false);
    }
  }

  getSkillProficiencies(background: Background): string {
    const skills = (background.starting_proficiencies ?? [])
      .map((item) => item.name)
      .filter((name) => this.isSkillProficiency(name))
      .map((name) => this.cleanProficiencyName(name));

    return skills.length ? skills.join(', ') : 'None';
  }

  getToolProficiencies(background: Background): string {
    const tools = (background.starting_proficiencies ?? [])
      .map((item) => item.name)
      .filter((name) => this.isToolProficiency(name))
      .map((name) => this.cleanProficiencyName(name));

    return tools.length ? tools.join(', ') : 'None';
  }

  getLanguages(background: Background): string {
    const directLanguageDesc = this.getStringValue(background['language_desc']);
    if (directLanguageDesc) {
      return directLanguageDesc;
    }

    const languageOptions = background['language_options'] as { desc?: string } | undefined;
    if (languageOptions?.desc) {
      return languageOptions.desc;
    }

    const languageRefs = background['languages'] as BackgroundReference[] | undefined;
    if (languageRefs?.length) {
      return languageRefs.map((language) => language.name).join(', ');
    }

    return 'None';
  }

  getEquipmentSummary(background: Background): string {
    const directEquipmentDesc = this.getStringValue(background['equipment_desc']);
    if (directEquipmentDesc) {
      return directEquipmentDesc;
    }

    const optionDesc = background.starting_equipment_options?.map((option) => option.desc).filter((desc): desc is string => !!desc);
    if (optionDesc?.length) {
      return optionDesc.join(' | ');
    }

    const items = (background.starting_equipment ?? []).map((equipment) => {
      const baseName = equipment.equipment.name;
      return equipment.quantity > 1 ? `${equipment.quantity}x ${baseName}` : baseName;
    });

    return items.length ? items.join(', ') : 'None';
  }

  getPersonalityTraitOptions(background: Background): string[] {
    const options = background.personality_traits?.from?.options ?? [];
    return options.map((opt) => opt.string).filter((s): s is string => !!s);
  }

  getIdealOptions(background: Background): Array<{ text: string; alignments: string[] }> {
    const options = background.ideals?.from?.options ?? [];
    return options
      .map((opt) => ({
        text: opt.desc ?? opt.string ?? '',
        alignments:
          opt.alignments?.map((a) => a.name) ?? [],
      }))
      .filter((opt) => opt.text);
  }

  getBondOptions(background: Background): string[] {
    const options = background.bonds?.from?.options ?? [];
    return options.map((opt) => opt.string).filter((s): s is string => !!s);
  }

  getFlawOptions(background: Background): string[] {
    const options = background.flaws?.from?.options ?? [];
    return options.map((opt) => opt.string).filter((s): s is string => !!s);
  }

  private isSkillProficiency(name: string): boolean {
    const value = name.toLowerCase();
    return value.includes('skill') || value.includes('insight') || value.includes('religion');
  }

  private isToolProficiency(name: string): boolean {
    const value = name.toLowerCase();
    return value.includes('tool') || value.includes('kit') || value.includes('instrument') || value.includes('set');
  }

  private cleanProficiencyName(name: string): string {
    return name
      .replace(/^skill:\s*/i, '')
      .replace(/^tool:\s*/i, '')
      .trim();
  }

  private getStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length ? value.trim() : null;
  }
}