import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Monster, SpellcastingInfo, SpellInfo } from '../../interfaces/monster';
import { MonstersService } from '../../services/monsters-service';

interface SpellDisplay extends SpellInfo {
  castingTime?: string;
  range?: string;
  components?: string;
  duration?: string;
}

@Component({
  selector: 'app-monster-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './monster-detail.html',
  styleUrl: './monster-detail.css',
})
export class MonsterDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly monstersService = inject(MonstersService);

  monster = signal<Monster | null>(null);
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
        throw new Error('No monster id provided');
      }

      const monster = await this.monstersService.getMonster(id);
      this.monster.set(monster);
    } catch (error) {
      console.error('Error loading monster detail:', error);
      this.error.set('Failed to load monster details.');
    } finally {
      this.loading.set(false);
    }
  }

  getArmorClass(): string {
    const monster = this.monster();
    if (!monster?.['armor_class']?.length) {
      return '-';
    }
    return monster['armor_class'].map((ac) => `${ac.value} (${ac.type})`).join(', ');
  }

  getSpeed(): string {
    const monster = this.monster();
    if (!monster?.['speed']) {
      return '-';
    }
    return Object.entries(monster['speed'])
      .map(([type, value]) => `${type}: ${value} ft.`)
      .join(', ');
  }

  getSenses(): string {
    const monster = this.monster();
    if (!monster?.['senses']) {
      return '-';
    }
    const senses = monster['senses'];
    const parts: string[] = [];
    if (senses.passive_perception !== undefined) {
      parts.push(`passive Perception ${senses.passive_perception}`);
    }
    if (senses.darkvision) {
      parts.push(`darkvision ${senses.darkvision}`);
    }
    if (senses.blindsight) {
      parts.push(`blindsight ${senses.blindsight}`);
    }
    if (senses.truesight) {
      parts.push(`truesight ${senses.truesight}`);
    }
    if (senses.telepathy) {
      parts.push(`telepathy ${senses.telepathy}`);
    }
    return parts.join(', ') || '-';
  }

  getSkills(): string {
    const monster = this.monster();
    if (!monster?.['proficiencies']?.length) {
      return '-';
    }
    return monster['proficiencies']
      .filter((p) => p.proficiency?.name && p.proficiency.name.startsWith('Skill:'))
      .map((p) => `${p.proficiency.name.replace('Skill: ', '')} +${p.value}`)
      .join(', ');
  }

  getDamageResistances(): string {
    const monster = this.monster();
    const parts: string[] = [];
    if (monster?.['damage_resistances']?.length) {
      parts.push(...monster['damage_resistances']);
    }
    if (monster?.['damage_immunities']?.length) {
      parts.push(...monster['damage_immunities'].map((d: string) => d + ' (immune)'));
    }
    return parts.join(', ') || '-';
  }

  getSpellcastingInfo(): any {
    const monster = this.monster();
    if (!monster) return null;

    // Look for spellcasting in special_abilities
    const spellAbility = monster.special_abilities?.find((a: any) => a.spellcasting);
    return spellAbility?.spellcasting || null;
  }

  formatSpellList(spells: any[]): string {
    return spells?.map((s: any) => s.name).join(', ') || 'None';
  }

  getSpellIndex(spellName: string): string {
    return spellName.toLowerCase().replace(/ /g, '-');
  }

  // Group spells by level for display
  getSpellByLevel(): Record<number, SpellInfo[]> {
    const spellData = this.getSpellcastingInfo();
    const spells = spellData?.spells as SpellInfo[] | undefined;
    if (!spells?.length) return {};

    const grouped: Record<number, SpellInfo[]> = {};
    spells.forEach(spell => {
      const level = spell.level ?? 0;
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(spell);
    });

    return grouped;
  }

  // Get level label
  getSpellLevelLabel(level: number): string {
    if (level === 0) return 'Cantrips';
    return `Level ${level}`;
  }

  // Check if spells exist at level
  hasSpellsAtLevel(level: number): boolean {
    const byLevel = this.getSpellByLevel();
    return !!byLevel[level]?.length;
  }

  // Get spells sorted levels that have spells
  getSpellLevels(): number[] {
    const byLevel = this.getSpellByLevel();
    return Object.keys(byLevel)
      .map(Number)
      .sort((a, b) => a - b);
  }
}